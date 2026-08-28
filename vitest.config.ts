import { defineConfig } from "vitest/config";
import path from "node:path";
import { TEST_DATABASE_URL } from "./tests/setup/testEnv";

/**
 * 回帰テスト用の設定。
 *
 * - DBはSQLiteの専用テストファイル(TEST_DATABASE_URL)を使い、開発用のdev.dbとは分離する。
 * - globalSetupでテスト実行前に一度だけマイグレーションを適用する。
 * - SQLiteファイルへの同時書き込みによるロック競合を避けるため、テストファイルは
 *   直列実行する（プロトタイプ規模のテスト数であれば速度上の問題はない）。
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/setup/globalSetup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
