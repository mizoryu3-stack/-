import { Suspense } from "react";
import { ItemsView } from "./items-view";

export const metadata = { title: "商品一覧" };

export default function ItemsPage() {
  return (
    <Suspense>
      <ItemsView />
    </Suspense>
  );
}
