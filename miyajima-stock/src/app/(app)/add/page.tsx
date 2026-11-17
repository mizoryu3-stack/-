"use client";

import {
  AlertTriangle, ArrowLeft, Camera, CheckCircle2, Images, Keyboard, Loader2, RefreshCw, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { emptyValues, ItemForm, valuesToInput, type ItemFormValues } from "@/components/item-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Extraction, ExtractedProduct } from "@/lib/ai-schema";
import { findDuplicates, type DuplicateHit } from "@/lib/duplicates";
import { formatYen } from "@/lib/format";
import { blobToBase64, cropImage, resizeImage, sha256, toUploadable } from "@/lib/image";
import { createItem, qk, useCategories, useItems } from "@/lib/queries";
import { uploadFile } from "@/lib/storage";
import type { Category } from "@/lib/types";
import { cn, errorMessage, isSafeHttpUrl } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const USD_JPY = 155; // 料金目安の換算用
const DRAFT_KEY = "ms-manual-draft";

type Stage = "choose" | "confirm" | "review";

interface SourceImage {
  id: string;
  file: File;
  previewUrl: string;
  status: "idle" | "analyzing" | "done" | "error";
  error?: string;
  hash?: string;
  /** 保存済みスクリーンショットのパス（同じ画像の複数商品で共有） */
  uploadedPath?: string;
  notes?: string | null;
  costUsd?: number | null;
}

interface Candidate {
  key: string;
  sourceId: string | null;
  values: ItemFormValues;
  productImage: Blob | null;
  extracted: ExtractedProduct | null;
  include: boolean;
  saving?: boolean;
  error?: string;
}

function toValues(p: ExtractedProduct, categories: Category[]): ItemFormValues {
  const v = emptyValues();
  const s = (x: string | null | undefined) => (x ?? "").trim();
  v.name = s(p.short_name) || s(p.original_name).slice(0, 60);
  v.original_name = s(p.original_name);
  v.item_type = s(p.item_type);
  v.brand = s(p.brand);
  v.model_number = s(p.model_number);
  v.color = s(p.color);
  v.size = s(p.size);
  v.description = s(p.description);
  v.store = s(p.store);
  v.url = isSafeHttpUrl(p.url) ? p.url!.trim() : "";
  v.planned_unit_price = p.price !== null && p.price >= 0 ? String(p.price) : "";
  v.shipping_fee = p.shipping_fee !== null && p.shipping_fee > 0 ? String(p.shipping_fee) : "";
  v.quantity = p.quantity && p.quantity > 0 ? String(p.quantity) : "1";
  const names = new Set(p.suggested_categories.map((n) => n.trim()));
  v.categoryIds = categories.filter((c) => names.has(c.name)).map((c) => c.id);
  const notes: string[] = [];
  if (p.list_price && p.price && p.list_price > p.price) notes.push(`参考価格 ${formatYen(p.list_price)}`);
  v.notes = notes.join("\n");
  return v;
}

export default function AddPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const categories = useCategories();
  const items = useItems();
  const [stage, setStage] = useState<Stage>("choose");
  const [sources, setSources] = useState<SourceImage[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dupConfirm, setDupConfirm] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const singleRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const multiRef = useRef<HTMLInputElement>(null);
  const sourcesRef = useRef(sources);
  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => () => sourcesRef.current.forEach((s) => URL.revokeObjectURL(s.previewUrl)), []);

  // 手入力の下書きを保存（通信エラー等で入力が失われないように）
  useEffect(() => {
    if (!manual || stage !== "review" || candidates.length !== 1) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(candidates[0].values));
    } catch {
      /* 保存できない環境では何もしない */
    }
  }, [manual, stage, candidates]);

  const cats = categories.data ?? [];

  const pickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)).slice(0, 20);
    if (!list.length) return toast.error("画像ファイルを選択してください");
    if (files.length > 20) toast.message("一度に解析できるのは20枚までです");
    setSources(list.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), status: "idle" })));
    setManual(false);
    setStage("confirm");
  };

  const startManual = () => {
    let values = emptyValues();
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        values = { ...values, ...JSON.parse(draft) };
        toast.message("前回の入力内容を復元しました");
      }
    } catch {
      /* 下書きなし */
    }
    setManual(true);
    setCandidates([{ key: crypto.randomUUID(), sourceId: null, values, productImage: null, extracted: null, include: true }]);
    setStage("review");
  };

  /** 画像を手入力用の候補にする（AI解析なし／失敗時） */
  const manualFromSource = (src: SourceImage) => {
    setCandidates((prev) => [...prev.filter((c) => c.sourceId !== src.id), { key: crypto.randomUUID(), sourceId: src.id, values: emptyValues(), productImage: null, extracted: null, include: true }]);
  };

  const updateSource = (id: string, patch: Partial<SourceImage>) => setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  /** 1枚を解析（ユーザー操作でのみ実行。自動再試行はしない） */
  const analyzeOne = async (src: SourceImage) => {
    updateSource(src.id, { status: "analyzing", error: undefined });
    try {
      const [resized, hash] = await Promise.all([resizeImage(src.file, 2000, 0.85), sha256(src.file)]);
      updateSource(src.id, { hash });
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: { media_type: "image/jpeg", data: await blobToBase64(resized.blob) }, categories: cats.map((c) => c.name) }),
      });
      const json = (await res.json().catch(() => null)) as { result?: Extraction; error?: string; usage?: { cost_usd: number | null } } | null;
      if (!res.ok || !json?.result) throw new Error(json?.error ?? `解析に失敗しました（${res.status}）`);
      const { result } = json;
      const newCandidates: Candidate[] = await Promise.all(
        result.products.map(async (p) => ({
          key: crypto.randomUUID(),
          sourceId: src.id,
          values: toValues(p, cats),
          productImage: await cropImage(src.file, p.image_box).catch(() => null),
          extracted: p,
          include: true,
        })),
      );
      if (!newCandidates.length) {
        newCandidates.push({ key: crypto.randomUUID(), sourceId: src.id, values: emptyValues(), productImage: null, extracted: null, include: true });
      }
      setCandidates((prev) => [...prev.filter((c) => c.sourceId !== src.id), ...newCandidates]);
      updateSource(src.id, {
        status: "done",
        notes: !result.is_product_page || !result.products.length ? "商品が見つかりませんでした。手入力してください。" : result.notes,
        costUsd: json.usage?.cost_usd ?? null,
      });
    } catch (e) {
      updateSource(src.id, { status: "error", error: errorMessage(e) });
      // 画像は保持したまま手入力できるようにする
      manualFromSource(src);
    }
  };

  const analyzeAll = async () => {
    setStage("review");
    const queue = sourcesRef.current.filter((s) => s.status === "idle");
    // 2枚ずつ並列で解析
    const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
      while (queue.length) {
        const src = queue.shift()!;
        await analyzeOne(src);
      }
    });
    await Promise.all(workers);
  };

  const skipAi = async () => {
    for (const s of sources) manualFromSource(s);
    setStage("review");
    const hashes = await Promise.all(sources.map((s) => sha256(s.file).catch(() => undefined)));
    setSources((prev) => prev.map((s, i) => ({ ...s, hash: hashes[i] })));
  };

  const setCandidate = (key: string, patch: Partial<Candidate>) => setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const duplicates = useMemo(() => {
    const map = new Map<string, DuplicateHit[]>();
    for (const c of candidates) {
      const src = sources.find((s) => s.id === c.sourceId);
      map.set(c.key, findDuplicates({ ...c.values, screenshot_hash: src?.hash ?? null }, items.data ?? []));
    }
    return map;
  }, [candidates, sources, items.data]);

  const included = candidates.filter((c) => c.include);
  const analyzing = sources.some((s) => s.status === "analyzing");
  const dupCount = included.filter((c) => (duplicates.get(c.key) ?? []).length > 0).length;
  const totalCost = sources.reduce((s, x) => s + (x.costUsd ?? 0), 0);

  const saveAll = async () => {
    for (const c of included) {
      const { error } = valuesToInput(c.values);
      if (error) {
        toast.error(`${c.values.name || "（商品名なし）"}: ${error}`);
        return;
      }
    }
    setSaving(true);
    let okCount = 0;
    let lastId: string | null = null;
    const uploaded = new Map(sources.filter((s) => s.uploadedPath).map((s) => [s.id, s.uploadedPath!]));
    for (const c of included) {
      setCandidate(c.key, { saving: true, error: undefined });
      try {
        const src = sources.find((s) => s.id === c.sourceId);
        let screenshotPath: string | null = null;
        if (src) {
          screenshotPath = uploaded.get(src.id) ?? null;
          if (!screenshotPath) {
            screenshotPath = await uploadFile(await toUploadable(src.file, 2400, 0.85), "screenshots");
            uploaded.set(src.id, screenshotPath);
            updateSource(src.id, { uploadedPath: screenshotPath });
          }
        }
        const imagePath = c.productImage ? await uploadFile(await toUploadable(c.productImage, 1200, 0.88), "images") : screenshotPath;
        const { input } = valuesToInput(c.values);
        const item = await createItem(
          { ...input, image_path: imagePath, screenshot_path: screenshotPath, screenshot_hash: src?.hash ?? null, ai_extracted: c.extracted ?? null },
          c.values.categoryIds,
        );
        lastId = item.id;
        okCount += 1;
        setCandidates((prev) => prev.filter((x) => x.key !== c.key));
      } catch (e) {
        setCandidate(c.key, { saving: false, error: errorMessage(e) });
      }
    }
    setSaving(false);
    await qc.invalidateQueries({ queryKey: qk.items });
    const failed = included.length - okCount;
    if (okCount) {
      try {
        if (manual) localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* noop */
      }
      toast.success(`${okCount}件の商品を登録しました`);
    }
    if (failed) {
      toast.error(`${failed}件の保存に失敗しました。内容はそのまま残っています。「登録する」で再試行できます。`);
      return;
    }
    router.push(okCount === 1 && lastId ? `/items/${lastId}` : "/items");
  };

  const onSave = () => {
    if (!included.length) return toast.error("登録する商品を選択してください");
    if (dupCount) setDupConfirm(true);
    else saveAll();
  };

  const reset = () => {
    sources.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    setSources([]);
    setCandidates([]);
    setManual(false);
    setStage("choose");
  };

  /* ------------------------------ 画面 ------------------------------ */

  const fileInputs = (
    <>
      <input ref={singleRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickFiles(e.target.files); e.target.value = ""; }} />
      <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickFiles(e.target.files); e.target.value = ""; }} />
      <input ref={multiRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { pickFiles(e.target.files); e.target.value = ""; }} />
    </>
  );

  function choose(kind: "single" | "library" | "multi" | "manual") {
    if (kind === "single") singleRef.current?.click();
    else if (kind === "library") libraryRef.current?.click();
    else if (kind === "multi") multiRef.current?.click();
    else startManual();
  }

  if (stage === "choose") {
    const options = [
      { icon: Upload, title: "スクリーンショットをアップロード", desc: "通販サイトの商品ページを撮影した画像から、AIが自動入力", kind: "single" as const, primary: true },
      { icon: Camera, title: "iPhoneの写真ライブラリから選択", desc: "写真アプリに保存したスクリーンショットを選ぶ", kind: "library" as const },
      { icon: Images, title: "複数画像をまとめてアップロード", desc: "最大20枚。登録前に一覧で確認・修正できます", kind: "multi" as const },
      { icon: Keyboard, title: "商品情報を手入力", desc: "画像なしで登録。あとから画像も追加できます", kind: "manual" as const },
    ];
    return (
      <div>
        <PageHeader title="商品を追加" description="登録方法を選んでください" />
        {fileInputs}
        <div className="grid gap-3 md:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.title}
              type="button"
              onClick={() => choose(o.kind)}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-5 text-left transition-shadow hover:shadow-md active:scale-[0.99]",
                o.primary ? "border-transparent bg-primary text-primary-foreground md:col-span-2 md:py-8" : "bg-card",
              )}
            >
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", o.primary ? "bg-primary-foreground/15" : "bg-primary-soft text-primary")}>
                <o.icon className="size-6" />
              </span>
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className={cn("mt-0.5 block text-[13px]", o.primary ? "text-primary-foreground/80" : "text-muted-foreground")}>{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-6 flex items-start gap-2 text-[12px] text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent" />
          AIが読み取った内容はすぐには保存されません。必ず確認画面で内容を確認・修正してから登録します。
        </p>
      </div>
    );
  }

  if (stage === "confirm") {
    const yenLow = Math.round(0.02 * USD_JPY * sources.length);
    const yenHigh = Math.round(0.06 * USD_JPY * sources.length);
    return (
      <div>
        <PageHeader title="AI解析の確認" description={`${sources.length}枚の画像を選択しました`} />
        <div className="mb-5 flex gap-3 overflow-x-auto pb-2">
          {sources.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.id} src={s.previewUrl} alt="選択した画像" className="h-44 w-auto shrink-0 rounded-xl border object-contain" />
          ))}
        </div>
        <Card className="mb-5 border-accent/40 bg-accent-soft">
          <CardContent className="flex gap-3 p-5">
            <AlertTriangle className="size-5 shrink-0 text-accent" />
            <div className="text-sm leading-relaxed">
              <p className="font-semibold">AI解析には利用料金が発生します</p>
              <p className="mt-1 text-muted-foreground">
                Claude API の利用料として、1枚あたり約3〜9円、今回の{sources.length}枚で約{yenLow}〜{yenHigh}円（目安）がかかります。
                解析は「AIで解析する」を押したときに1回だけ行い、自動で再試行はしません。
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="flex-1" onClick={analyzeAll}><Sparkles /> AIで解析する</Button>
          <Button size="lg" variant="outline" className="flex-1" onClick={skipAi}><Keyboard /> 解析せずに手入力する</Button>
        </div>
        <Button variant="ghost" className="mt-3 w-full" onClick={reset}><ArrowLeft /> 選び直す</Button>
      </div>
    );
  }

  // review
  return (
    <div className="pb-24 md:pb-0">
      <PageHeader
        title={manual ? "商品を手入力" : "内容の確認・修正"}
        description={manual ? "必要な項目を入力して登録してください" : "AIの読み取り結果を確認し、必要に応じて修正してください"}
        actions={<Button variant="ghost" size="sm" onClick={reset}><X /> やめる</Button>}
      />

      {sources.length ? (
        <div className="mb-5 space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border bg-card p-2.5 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.previewUrl} alt="" className="size-12 rounded-lg border object-cover" />
              <div className="min-w-0 flex-1">
                {s.status === "analyzing" ? (
                  <p className="flex items-center gap-2 text-primary"><Loader2 className="size-4 animate-spin" /> AIが解析しています…</p>
                ) : s.status === "error" ? (
                  <p className="text-destructive">{s.error}<span className="block text-xs text-muted-foreground">画像は保持されています。手入力で登録できます。</span></p>
                ) : s.status === "done" ? (
                  <p className="flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="size-4" /> 解析完了（{candidates.filter((c) => c.sourceId === s.id).length}件）
                    {s.notes ? <span className="block truncate text-xs text-muted-foreground">{s.notes}</span> : null}
                  </p>
                ) : (
                  <p className="text-muted-foreground">手入力</p>
                )}
              </div>
              {s.status === "error" ? (
                <Button variant="outline" size="sm" onClick={() => analyzeOne(s)}><RefreshCw /> 再解析</Button>
              ) : null}
            </div>
          ))}
          {totalCost > 0 ? <p className="text-right text-[11px] text-muted-foreground">今回のAI利用料（概算）: 約{Math.max(1, Math.round(totalCost * USD_JPY))}円</p> : null}
        </div>
      ) : null}

      {candidates.length > 1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm">
          <span className="text-muted-foreground">{included.length}/{candidates.length}件を登録</span>
          <select className="ml-auto h-9 rounded-full border bg-card px-3 text-[13px]" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} aria-label="一括で追加するカテゴリー">
            <option value="">カテゴリーを一括追加…</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={!bulkCategory}
            onClick={() => {
              setCandidates((prev) => prev.map((c) => (c.include && !c.values.categoryIds.includes(bulkCategory) ? { ...c, values: { ...c.values, categoryIds: [...c.values.categoryIds, bulkCategory] } } : c)));
              setBulkCategory("");
            }}
          >
            適用
          </Button>
        </div>
      ) : null}

      <div className="space-y-4">
        {candidates.map((c, idx) => {
          const src = sources.find((s) => s.id === c.sourceId);
          const dups = duplicates.get(c.key) ?? [];
          return (
            <Card key={c.key} className={cn(!c.include && "opacity-60", c.error && "border-destructive")}>
              <CardContent className="p-4 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    {candidates.length > 1 ? (
                      <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={c.include} onChange={(e) => setCandidate(c.key, { include: e.target.checked })} />
                    ) : null}
                    商品 {idx + 1}
                    {c.extracted?.confidence === "low" ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">読み取り精度：低</span> : null}
                  </label>
                  {candidates.length > 1 ? (
                    <Button variant="ghost" size="sm" onClick={() => setCandidates((prev) => prev.filter((x) => x.key !== c.key))} aria-label="この候補を削除"><Trash2 /></Button>
                  ) : null}
                </div>
                {dups.length ? (
                  <div className="mb-4 rounded-xl border border-accent/50 bg-accent-soft p-3 text-[13px]">
                    <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="size-4 text-accent" /> 重複の可能性があります</p>
                    <ul className="mt-1 space-y-0.5">
                      {dups.slice(0, 3).map((d) => (
                        <li key={d.item.id}><Link href={`/items/${d.item.id}`} target="_blank" className="text-primary underline">{d.item.name}</Link>（{d.reason}）</li>
                      ))}
                    </ul>
                    <p className="mt-1 text-muted-foreground">意図的に別の商品として登録する場合はそのまま登録できます。</p>
                  </div>
                ) : null}
                {c.error ? <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">保存に失敗しました: {c.error}</p> : null}
                <div className={cn(src && "md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-6")}>
                  {src ? (
                    <div className="mb-4 hidden md:block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src.previewUrl} alt="元のスクリーンショット" className="max-h-96 w-full rounded-xl border object-contain" />
                      <p className="mt-1 text-center text-[11px] text-muted-foreground">元のスクリーンショット</p>
                    </div>
                  ) : null}
                  <ItemForm
                    idPrefix={c.key.slice(0, 8)}
                    values={c.values}
                    onChange={(values) => setCandidate(c.key, { values })}
                    categories={cats}
                    compact
                    image={{ blob: c.productImage ?? (src ? src.file : null) }}
                    onImageChange={(blob) => setCandidate(c.key, { productImage: blob })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!candidates.length && !analyzing ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            登録する商品はありません。<Button variant="link" onClick={reset}>最初からやり直す</Button>
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 p-3 backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <Button size="lg" className="w-full md:w-auto md:min-w-64" onClick={onSave} disabled={saving || analyzing || !included.length}>
          {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          {analyzing ? "解析中…" : included.length > 1 ? `${included.length}件を登録する` : "登録する"}
        </Button>
      </div>

      <ConfirmDialog
        open={dupConfirm}
        onOpenChange={setDupConfirm}
        title="重複の可能性があります"
        description={`${dupCount}件の商品が、すでに登録済みの商品と重複している可能性があります。このまま登録しますか？`}
        confirmLabel="このまま登録する"
        destructive={false}
        onConfirm={() => {
          setDupConfirm(false);
          saveAll();
        }}
      />
    </div>
  );
}
