import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { RowError } from "@/lib/ingestion/csv/importCsv";

export default async function ImportBatchResultPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const id = Number(batchId);
  if (!Number.isInteger(id)) notFound();

  const batch = await prisma.importBatch.findUnique({ where: { id } });
  if (!batch) notFound();

  const errors: RowError[] = batch.errorsJson ? JSON.parse(batch.errorsJson) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/import" className="text-sm text-slate-500 hover:text-slate-800">
          ← CSVインポートに戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">取込結果</h1>
        <p className="mt-1 text-sm text-slate-500">
          {batch.fileName ?? `バッチ#${batch.id}`} を取り込みました。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <ResultCard label="対象行数" value={batch.totalRows} />
        <ResultCard label="新規登録" value={batch.createdCount} tone="emerald" />
        <ResultCard label="更新" value={batch.updatedCount} tone="sky" />
        <ResultCard label="エラー" value={batch.errorCount} tone="rose" />
        <ResultCard label="重複候補" value={batch.duplicateCandidateCount} tone="amber" />
      </div>

      {errors.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-rose-700">データエラー（{errors.length}件）</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="font-semibold">{e.row}行目：</span>
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {batch.duplicateCandidateCount > 0 && (
        <p className="text-sm text-slate-500">
          重複候補が検出されました。
          <Link href="/admin/duplicates" className="ml-1 text-slate-700 underline">
            重複候補一覧
          </Link>
          で確認してください。
        </p>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "sky" | "rose" | "amber";
}) {
  const toneClass = {
    slate: "text-slate-800",
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    rose: "text-rose-600",
    amber: "text-amber-600",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value.toLocaleString("ja-JP")}</p>
    </div>
  );
}
