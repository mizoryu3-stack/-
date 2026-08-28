/**
 * テスト専用DBの接続先。開発用の dev.db とは完全に分離し、
 * テスト実行のたびにスキーマを作り直す（tests/setup/globalSetup.ts参照）。
 * vitest.config.ts と globalSetup.ts の両方から参照するため、値を1箇所にまとめている。
 */
export const TEST_DATABASE_URL = "file:./prisma/test.db";
