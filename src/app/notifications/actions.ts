"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** 通知をクリックしたときに既読化してから物件詳細へ移動する */
export async function markNotificationReadAndGo(matchId: number, propertyId: number) {
  await prisma.propertyMatch.update({
    where: { id: matchId },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  redirect(`/properties/${propertyId}`);
}

export async function markAllNotificationsRead() {
  await prisma.propertyMatch.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
