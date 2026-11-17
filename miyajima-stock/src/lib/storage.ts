"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "./supabase/client";
import { STORAGE_BUCKET } from "./supabase/env";

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  if (type === "application/pdf") return "pdf";
  return "jpg";
}

/** 非公開バケットへアップロード。パスは「ユーザーID/種類/ランダム.拡張子」 */
export async function uploadFile(blob: Blob, kind: "images" | "screenshots" | "receipts"): Promise<string> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("ログインが切れました。再度ログインしてください。");
  const type = blob.type || "image/jpeg";
  const path = `${uid}/${kind}/${crypto.randomUUID()}.${extFor(type)}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`ファイルの保存に失敗しました: ${error.message}`);
  return path;
}

export async function removeFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (!list.length) return;
  await getSupabase().storage.from(STORAGE_BUCKET).remove(list);
}

const SIGNED_TTL = 60 * 60; // 1時間

/** 非公開画像の署名付きURL（認証済みユーザーのみ取得可能） */
export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: Boolean(path),
    staleTime: (SIGNED_TTL - 300) * 1000,
    gcTime: (SIGNED_TTL - 120) * 1000,
    queryFn: async () => {
      const { data, error } = await getSupabase().storage.from(STORAGE_BUCKET).createSignedUrl(path!, SIGNED_TTL);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase().storage.from(STORAGE_BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error) throw error;
  return data.signedUrl;
}
