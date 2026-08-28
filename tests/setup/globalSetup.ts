import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { TEST_DATABASE_URL } from "./testEnv";

/**
 * vitestのグローバルセットアップ（全テストファイルの実行前に1回だけ走る）。
 *
 * 既存のテストDBファイルを削除した上で `prisma migrate deploy` を実行し、
 * prisma/migrations/ に記録されている全マイグレーションを適用したクリーンな
 * テスト専用DBを作る。dev.db・本番DBには一切影響しない。
 */
export default async function globalSetup() {
  const dbPath = "prisma/test.db";
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${dbPath}${suffix}`;
    if (existsSync(file)) rmSync(file);
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
