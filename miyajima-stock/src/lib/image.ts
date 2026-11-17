"use client";

/** 画像を読み込む（HEIC は Safari のみ表示可能） */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした。JPEG または PNG の画像をお試しください。"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("画像の変換に失敗しました"))), type, quality);
  });
}

/**
 * 長辺を maxSide 以下に縮小して JPEG 化。
 * 縦長のスクリーンショットは AI 解析用に長辺 2000px 程度で十分です。
 */
export async function resizeImage(file: Blob, maxSide = 2000, quality = 0.85): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { blob: await canvasToBlob(canvas, "image/jpeg", quality), width: w, height: h };
}

/** 0〜1000 正規化座標 [左, 上, 右, 下] で切り抜き。不正な座標なら null */
export async function cropImage(file: Blob, box: number[] | null | undefined, maxSide = 1000): Promise<Blob | null> {
  if (!box || box.length !== 4) return null;
  const [l, t, r, b] = box.map((v) => Math.min(1000, Math.max(0, v)));
  if (r - l < 30 || b - t < 30) return null;
  const img = await loadImage(file);
  const sx = (l / 1000) * img.naturalWidth;
  const sy = (t / 1000) * img.naturalHeight;
  const sw = ((r - l) / 1000) * img.naturalWidth;
  const sh = ((b - t) / 1000) * img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, "image/jpeg", 0.88);
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** 重複検出用 SHA-256 */
export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** アップロード用に縮小。ブラウザで読めない形式（HEIC等）は元ファイルのまま */
export async function toUploadable(file: Blob, maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (file.type === "application/pdf") return file;
  try {
    return (await resizeImage(file, maxSide, quality)).blob;
  } catch {
    return file;
  }
}
