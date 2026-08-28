import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SavedSearchForm from "@/components/SavedSearchForm";
import { updateSavedSearch } from "@/app/saved-searches/actions";

export default async function EditSavedSearchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) notFound();

  const savedSearch = await prisma.savedSearch.findUnique({ where: { id } });
  if (!savedSearch) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">検索条件を編集</h1>
      </div>
      <SavedSearchForm
        action={updateSavedSearch.bind(null, id)}
        submitLabel="更新する"
        defaultValues={{
          name: savedSearch.name,
          city: savedSearch.city ?? undefined,
          rentMax: savedSearch.rentMax ?? undefined,
          buildingType: savedSearch.buildingType ?? undefined,
          areaSqmMin: savedSearch.areaSqmMin ?? undefined,
          maxAge: savedSearch.maxAge ?? undefined,
          stationWalkMax: savedSearch.stationWalkMax ?? undefined,
          hasParking: savedSearch.hasParking ?? undefined,
        }}
      />
    </div>
  );
}
