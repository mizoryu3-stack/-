import SavedSearchForm from "@/components/SavedSearchForm";
import { createSavedSearch } from "@/app/saved-searches/actions";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewSavedSearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const buildingTypeRaw = first(params.buildingType);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">検索条件を保存</h1>
        <p className="mt-1 text-sm text-slate-500">
          保存した条件に一致する新着物件が登録されると、通知一覧に表示されます。
        </p>
      </div>
      <SavedSearchForm
        action={createSavedSearch}
        submitLabel="この内容で保存する"
        defaultValues={{
          city: first(params.city),
          rentMax: first(params.rentMax) ? Number(first(params.rentMax)) : undefined,
          buildingType:
            buildingTypeRaw === "HOUSE" || buildingTypeRaw === "APARTMENT" ? buildingTypeRaw : undefined,
          areaSqmMin: first(params.areaSqmMin) ? Number(first(params.areaSqmMin)) : undefined,
          maxAge: first(params.maxAge) ? Number(first(params.maxAge)) : undefined,
          stationWalkMax: first(params.stationWalkMax) ? Number(first(params.stationWalkMax)) : undefined,
          hasParking: first(params.hasParking) === "true",
        }}
      />
    </div>
  );
}
