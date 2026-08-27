"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// プロトタイプにつきユーザー識別なし（単一ユーザー想定）のシンプルなお気に入り機能。
export async function toggleFavorite(propertyId: number) {
  const existing = await prisma.favorite.findUnique({ where: { propertyId } });

  if (existing) {
    await prisma.favorite.delete({ where: { propertyId } });
  } else {
    await prisma.favorite.create({ data: { propertyId } });
  }

  revalidatePath("/");
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/favorites");
}
