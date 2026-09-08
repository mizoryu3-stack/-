#!/usr/bin/env node
// `npm run build` (Vite) の出力 (dist/index.html + assets/*.js + assets/*.css) を、
// claude.ai の Artifact として公開できる単一HTMLファイルに束ねる。
//
// 通常の静的ホスティング (GitHub Pagesなど) にはdist/をそのままデプロイすればよいが、
// Artifactは1枚のHTMLファイルとして公開する必要があるため、このスクリプトで
// JS/CSSをインラインにまとめている。
//
// 併せて、Artifact本体に記録データを永続化する仕組み (src/lib/remotePersistence.ts) が
// 読み書きする `<script id="app-state">` のプレースホルダーをここで埋め込む。
//
// 使い方: npm run build && node scripts/build-artifact.mjs [出力先パス]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = "dist";
const OUT_PATH = process.argv[2] ?? "artifact.html";
const APP_TITLE = "筋トレ記録";

const html = readFileSync(join(DIST_DIR, "index.html"), "utf8");

const jsMatch = html.match(/src="\/assets\/(index-[^"]+\.js)"/);
const cssMatch = html.match(/href="\/assets\/(index-[^"]+\.css)"/);
if (!jsMatch || !cssMatch) {
  throw new Error(
    "dist/index.html からJS/CSSのファイル名を検出できませんでした。先に `npm run build` を実行してください。",
  );
}

const js = readFileSync(join(DIST_DIR, "assets", jsMatch[1]), "utf8");
const css = readFileSync(join(DIST_DIR, "assets", cssMatch[1]), "utf8");

// src/lib/remotePersistence.ts の APP_STATE_ELEMENT_ID / buildPublishHtml と対応させること。
const out = `<meta charset="UTF-8" />
<title>${APP_TITLE}</title>
<style>
${css}
</style>
<script type="application/json" id="app-state">[]</script>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

writeFileSync(OUT_PATH, out, "utf8");
console.log(`wrote ${out.length} bytes to ${OUT_PATH}`);
