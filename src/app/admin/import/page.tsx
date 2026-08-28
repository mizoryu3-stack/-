import ImportCsvForm from "@/components/admin/ImportCsvForm";

export default function ImportCsvPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CSVインポート</h1>
        <p className="mt-1 text-sm text-slate-500">
          物件データをCSVファイルから一括登録・更新します。既に登録済みの物件（source +
          externalId、または同一の元サイトURLで一致するもの）は新規登録ではなく更新されます。
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700">CSVの列について</h2>
        <p className="mt-1 text-xs text-slate-500">
          列名は英語・日本語のどちらでも認識されます（例:
          「rent」でも「家賃」でもOK）。列の順番は自由です。
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-4">項目</th>
                <th className="py-1 pr-4">列名の例（英語）</th>
                <th className="py-1 pr-4">列名の例（日本語）</th>
                <th className="py-1 pr-4">必須</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {[
                ["物件名", "propertyName / name", "物件名", "○"],
                ["住所", "address", "住所", "○"],
                ["市区町村", "city", "市区町村", "△（住所から自動推定を試みます）"],
                ["緯度・経度", "latitude / longitude", "緯度・経度", "-"],
                ["家賃", "rent", "家賃", "○"],
                ["管理費・敷金・礼金", "managementFee / deposit / keyMoney", "管理費・敷金・礼金", "-"],
                ["間取り", "layout", "間取り", "○"],
                ["専有面積", "area / areaSqm", "専有面積・面積", "○"],
                ["築年数 or 築年", "buildingAge or builtYear", "築年数 or 築年", "○（どちらか）"],
                ["物件種別", "propertyType", "物件種別・種別（戸建て/マンション）", "○"],
                ["駅徒歩(分)", "stationWalkMinutes", "駅徒歩", "○"],
                ["駐車場", "parking", "駐車場（あり/なし）", "-"],
                ["写真URL", "imageUrl", "写真URL", "-"],
                ["元サイトURL", "sourceUrl", "元サイトURL", "-"],
                ["取得元", "source", "取得元（未指定時は\"csv\"）", "-"],
                ["外部ID", "externalId", "外部ID", "-"],
                ["掲載状態", "listingStatus", "掲載状態（ACTIVE/ENDED/UNKNOWN、掲載中/掲載終了 等）", "-"],
              ].map(([label, en, ja, req]) => (
                <tr key={label} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4 font-medium text-slate-700">{label}</td>
                  <td className="py-1.5 pr-4">{en}</td>
                  <td className="py-1.5 pr-4">{ja}</td>
                  <td className="py-1.5 pr-4">{req}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ImportCsvForm />
      </div>
    </div>
  );
}
