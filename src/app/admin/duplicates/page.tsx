import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DuplicateCandidatesPage() {
  const candidates = await prisma.duplicateCandidate.findMany({
    where: { status: "PENDING" },
    include: { property: true, candidateProperty: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">重複候補</h1>
        <p className="mt-1 text-sm text-slate-500">
          externalId・元サイトURLで確実に判定できず、住所や物件名の類似度から「重複の可能性がある」と
          検出されたペアです。自動では統合していません。実際に重複かどうかは物件詳細を見比べてご確認ください。
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          未確認の重複候補はありません。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {candidates.map((c) => (
            <div key={c.id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {c.reason} ・ 類似度目安 {Math.round(c.similarity * 100)}% ・ {formatRelativeTime(c.createdAt)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PropertyMini label="新しく取り込まれた物件" id={c.property.id} name={c.property.name} address={c.property.address} />
                <PropertyMini
                  label="既存の類似物件"
                  id={c.candidateProperty.id}
                  name={c.candidateProperty.name}
                  address={c.candidateProperty.address}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyMini({
  label,
  id,
  name,
  address,
}: {
  label: string;
  id: number;
  name: string;
  address: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <Link href={`/properties/${id}`} className="text-sm font-semibold text-slate-800 hover:underline">
        {name}
      </Link>
      <p className="text-xs text-slate-500">{address}</p>
    </div>
  );
}
