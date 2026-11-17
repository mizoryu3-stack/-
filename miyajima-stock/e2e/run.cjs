/* eslint-disable */
/**
 * 画面の通し動作テスト（ローカル Supabase + 起動済みアプリが前提）
 *   npx supabase start
 *   npm run build && npm start
 *   npm run test:e2e
 *
 * AI解析 API は料金が発生しないようモック応答に差し替えてテストします。
 */
const { chromium, devices } = require("playwright");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.E2E_OUT || path.join(os.tmpdir(), "miyajima-e2e");
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(cond, msg) {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.log("  ✗", msg);
  }
}
const yen = (s) => Number(String(s).replace(/[^0-9-]/g, ""));

async function makeScreenshot(file) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1179" height="2000">
    <rect width="100%" height="100%" fill="#fff"/>
    <rect x="80" y="200" width="1019" height="800" fill="#c8a27a"/>
    <text x="80" y="1100" font-size="48" fill="#111">天然木製センターテーブル ナチュラル 幅90cm</text>
    <text x="80" y="1200" font-size="64" fill="#b12704">￥12,800</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

const MOCK = {
  result: {
    is_product_page: true,
    notes: null,
    products: [
      {
        short_name: "木製ローテーブル", original_name: "天然木製センターテーブル ナチュラル 幅90cm リビング用", item_type: "テーブル",
        price: 12800, list_price: 15800, shipping_fee: 0, brand: "テストブランド", store: "Amazon", model_number: "TBL-90",
        color: "ナチュラル", size: "幅90cm", description: "天然木のローテーブル", url: "https://www.amazon.co.jp/dp/B0TEST0001",
        quantity: null, suggested_categories: ["和室"], image_box: [68, 100, 932, 500], confidence: "high",
      },
      {
        short_name: "座布団", original_name: "日本製 座布団 5枚セット", item_type: "座布団", price: 6980, list_price: null,
        shipping_fee: 800, brand: null, store: "Amazon", model_number: null, color: "紺", size: "55×59cm", description: null,
        url: null, quantity: 2, suggested_categories: ["和室"], image_box: null, confidence: "medium",
      },
    ],
  },
  usage: { input_tokens: 2000, output_tokens: 800, cost_usd: 0.024 },
};

async function signUp(page, email) {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: "新規登録" }).first().click();
  await page.fill("#email", email);
  await page.fill("#password", "password1234");
  await page.getByRole("button", { name: "登録する" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
}

async function statValue(page, label) {
  const card = page.locator("a", { hasText: label }).first();
  const txt = await card.locator("div.text-\\[22px\\]").first().innerText();
  return yen(txt);
}

(async () => {
  const shot = path.join(OUT, "fake-screenshot.png");
  await makeScreenshot(shot);
  const browser = await chromium.launch();
  const stamp = Date.now();

  // ---------------- iPhone ----------------
  console.log("[iPhone] 新規登録とダッシュボード");
  const ctx = await browser.newContext({ ...devices["iPhone 14"], locale: "ja-JP", timezoneId: "Asia/Tokyo", acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/analyze", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK) }));

  await signUp(page, `owner+${stamp}@example.com`);
  await page.getByRole("heading", { name: "購入進捗" }).waitFor();
  check(true, "登録後にダッシュボードが表示される");
  await page.goto(`${BASE}/categories`);
  await page.getByText("消防設備").waitFor();
  check((await page.locator("ul > li").count()) >= 13, "初期カテゴリー13件が作成される");

  console.log("[iPhone] 手入力で登録");
  await page.goto(`${BASE}/add`);
  await page.getByRole("button", { name: /商品情報を手入力/ }).click();
  await page.fill("[id$='-name']", "掃除機");
  await page.locator("[id$='-price']").fill("30000");
  await page.getByRole("button", { name: /家電/ }).click();
  await page.getByRole("button", { name: /清掃用品/ }).click();
  await page.getByRole("button", { name: /^登録する$/ }).click();
  await page.waitForURL(/\/items\/[0-9a-f-]{36}$/);
  await page.getByRole("heading", { name: "掃除機" }).waitFor();
  check(true, "手入力した商品の詳細画面が表示される");

  console.log("[iPhone] スクリーンショット → AI解析（モック）→ 確認 → 登録");
  await page.goto(`${BASE}/add`);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /スクリーンショットをアップロード/ }).click();
  await (await chooser).setFiles(shot);
  await page.getByText("AI解析には利用料金が発生します").waitFor();
  check(true, "解析前に料金の注意が表示される");
  await page.screenshot({ path: path.join(OUT, "iphone-ai-confirm.png") });
  await page.getByRole("button", { name: "AIで解析する" }).click();
  await page.getByText("解析完了（2件）").waitFor({ timeout: 15000 });
  const names = await page.locator("[id$='-name']").evaluateAll((els) => els.map((e) => e.value));
  check(names.includes("木製ローテーブル") && names.includes("座布団"), "1枚の画像から2商品の候補が表示される");
  const prices = await page.locator("[id$='-price']").evaluateAll((els) => els.map((e) => e.value));
  check(prices.includes("12800"), "価格 12800 が入力される");
  check((await page.getByRole("button", { name: /和室/, pressed: true }).count()) === 2, "和室カテゴリーが自動選択される");
  await page.screenshot({ path: path.join(OUT, "iphone-ai-review.png"), fullPage: true });
  await page.getByRole("button", { name: "2件を登録する" }).click();
  await page.waitForURL(`${BASE}/items`, { timeout: 20000 });
  await page.getByText("木製ローテーブル").first().waitFor();
  check(true, "2件が登録され商品一覧に表示される");
  await page.screenshot({ path: path.join(OUT, "iphone-items.png"), fullPage: true });

  console.log("[iPhone] 集計");
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { name: "購入進捗" }).waitFor();
  await page.waitForTimeout(500);
  const pending1 = await statValue(page, "未購入（予定）");
  // 掃除機30000 + ローテーブル12800 + 座布団 6980×2+800
  check(pending1 === 30000 + 12800 + 13960 + 800, `未購入予定金額 = ${pending1}`);
  check((await statValue(page, "購入済み")) === 0, "購入済み金額 = 0");
  await page.screenshot({ path: path.join(OUT, "iphone-dashboard-before.png"), fullPage: true });

  console.log("[iPhone] 購入済みに変更");
  await page.goto(`${BASE}/items`);
  const card = page.locator("a", { hasText: "木製ローテーブル" }).first();
  await card.getByRole("button", { name: "購入済みに" }).click();
  await page.locator("#pd-price").fill("11800");
  await page.getByRole("button", { name: "購入済みとして保存" }).click();
  await page.getByText("購入済みにしました").waitFor();
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { name: "購入進捗" }).waitFor();
  await page.waitForTimeout(500);
  const purchased = await statValue(page, "購入済み");
  const pending2 = await statValue(page, "未購入（予定）");
  check(purchased === 11800, `購入済み金額が実際の金額 11800 で増加（${purchased}）`);
  check(pending2 === pending1 - 12800, `未購入予定金額が予定金額 12800 減少（${pending2}）`);
  await page.screenshot({ path: path.join(OUT, "iphone-dashboard-after.png"), fullPage: true });

  console.log("[iPhone] カテゴリー別ページ");
  await page.goto(`${BASE}/categories`);
  await page.getByRole("link", { name: /和室/ }).first().click();
  await page.getByRole("heading", { name: "和室" }).waitFor();
  check((await page.getByText("木製ローテーブル").count()) > 0 && (await page.getByText("座布団").count()) > 0, "和室ページに商品が表示される");

  console.log("[iPhone] 重複検出");
  await page.goto(`${BASE}/add`);
  await page.getByRole("button", { name: /商品情報を手入力/ }).click();
  await page.fill("[id$='-name']", "木製ローテーブル");
  await page.getByText("重複の可能性があります").waitFor();
  check(true, "同名商品で重複警告が表示される");
  await page.getByRole("button", { name: /^登録する$/ }).click();
  await page.getByRole("dialog").getByText("このまま登録しますか").waitFor();
  check(true, "保存時に重複確認ダイアログが表示される（意図的な登録も可能）");
  await page.getByRole("button", { name: "キャンセル" }).click();
  await page.getByRole("button", { name: "やめる" }).click();

  console.log("[iPhone] 詳細・領収書・履歴・削除");
  await page.goto(`${BASE}/items`);
  await page.locator("a", { hasText: "木製ローテーブル" }).first().click();
  await page.getByRole("link", { name: "商品ページを開く" }).waitFor();
  check(true, "商品URLのボタンが表示される");
  const rc = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /領収書を添付/ }).click();
  await (await rc).setFiles(shot);
  await page.getByText("領収書を1件保存しました").waitFor({ timeout: 15000 });
  check(true, "領収書をアップロードできる");
  check((await page.getByText(/購入状況: 未購入 → 購入済み/).count()) === 1, "購入履歴が記録される");
  check((await page.getByText(/購入単価: 未入力 → ￥11,800/).count()) === 1, "価格の記録が残る");
  await page.waitForTimeout(800);
  const imgs = await page.locator("img").evaluateAll((els) => els.filter((e) => e.complete && e.naturalWidth > 0).length);
  check(imgs >= 2, `非公開Storageの画像が署名付きURLで表示される（${imgs}枚）`);
  await page.screenshot({ path: path.join(OUT, "iphone-detail.png"), fullPage: true });

  await page.goto(`${BASE}/items`);
  await page.locator("a", { hasText: "掃除機" }).first().click();
  await page.getByRole("button", { name: "削除" }).click();
  await page.getByRole("button", { name: "削除する" }).click();
  await page.waitForURL(`${BASE}/items`);
  await page.waitForTimeout(500);
  check((await page.getByText("掃除機").count()) === 0, "確認後に商品を削除できる");

  console.log("[iPhone] その他費用・予算");
  await page.goto(`${BASE}/expenses`);
  await page.getByRole("button", { name: /追加/ }).first().click();
  await page.fill("#ex-name", "畳張替え");
  await page.fill("#ex-est", "200000");
  await page.getByRole("button", { name: "保存する" }).click();
  await page.getByText("畳張替え").waitFor();
  await page.goto(`${BASE}/analytics`);
  await page.getByText("予定を含めた予算残り").waitFor();
  const body = await page.locator("main").innerText();
  check(body.includes("￥3,800,000"), "初期予算 380万円");
  check(body.includes(`￥${(3800000 - 11800).toLocaleString()}`), "予算残り = 予算 − 購入済み");
  await page.screenshot({ path: path.join(OUT, "iphone-analytics.png"), fullPage: true });

  console.log("[iPhone] CSV 出力");
  await page.goto(`${BASE}/items`);
  await page.getByText("木製ローテーブル").first().waitFor();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV" }).click();
  const csvPath = path.join(OUT, "items.csv");
  await (await dl).saveAs(csvPath);
  const buf = fs.readFileSync(csvPath);
  check(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf, "CSV に UTF-8 BOM が付く（Excel で文字化けしない）");
  check(buf.toString("utf8").includes("木製ローテーブル"), "CSV に商品名が含まれる");

  check(errors.length === 0, `ブラウザのエラーなし ${errors.length ? errors.join(" / ") : ""}`);

  // ---------------- MacBook ----------------
  console.log("[MacBook] 別ユーザーからは見えない（RLS）＋ PC 表示");
  const mac = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "ja-JP", timezoneId: "Asia/Tokyo", colorScheme: "dark" });
  const mp = await mac.newPage();
  await signUp(mp, `other+${stamp}@example.com`);
  await mp.goto(`${BASE}/items`);
  await mp.getByText("まだ商品が登録されていません").waitFor();
  check(true, "別アカウントには他人の商品が表示されない");
  await mp.screenshot({ path: path.join(OUT, "mac-dark-empty.png") });
  await mac.close();

  const mac2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "ja-JP", timezoneId: "Asia/Tokyo" });
  const m2 = await mac2.newPage();
  await m2.goto(`${BASE}/login`);
  await m2.fill("#email", `owner+${stamp}@example.com`);
  await m2.fill("#password", "password1234");
  await m2.getByRole("button", { name: "ログイン" }).last().click();
  await m2.waitForURL(`${BASE}/`);
  await m2.getByText("カテゴリー別支出").waitFor();
  await m2.waitForTimeout(800);
  await m2.screenshot({ path: path.join(OUT, "mac-dashboard.png"), fullPage: true });
  await m2.goto(`${BASE}/items`);
  await m2.getByLabel("表形式").click();
  await m2.locator("table").waitFor();
  check(true, "PC で表形式に切り替えられる");
  await m2.screenshot({ path: path.join(OUT, "mac-items-table.png") });

  console.log("[同期] iPhone で変更 → Mac に自動反映");
  await m2.goto(`${BASE}/`);
  await m2.getByRole("heading", { name: "購入進捗" }).waitFor();
  await page.goto(`${BASE}/items`);
  await page.locator("a", { hasText: "座布団" }).first().getByRole("button", { name: "購入済みに" }).click();
  await page.getByRole("button", { name: "購入済みとして保存" }).click();
  await page.getByText("購入済みにしました").waitFor();
  await m2.waitForFunction(() => document.body.innerText.includes("26,560"), null, { timeout: 15000 }).then(
    () => check(true, "Mac の購入済み金額が自動更新される（Realtime）"),
    () => check(false, "Mac の購入済み金額が自動更新される（Realtime）"),
  );

  await browser.close();
  console.log(failures ? `\n${failures}件失敗` : "\nすべて成功");
  console.log("スクリーンショット:", OUT);
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
