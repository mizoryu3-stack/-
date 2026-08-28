import NewPropertyForm from "@/components/admin/NewPropertyForm";

export default function NewPropertyPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">物件を登録</h1>
        <p className="mt-1 text-sm text-slate-500">
          物件情報を1件ずつ手動で登録します。登録すると民泊適性スコア・公的データの取得も自動的に行われます。
        </p>
      </div>
      <NewPropertyForm />
    </div>
  );
}
