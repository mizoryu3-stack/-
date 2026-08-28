/**
 * 依存パッケージを追加せず、CSVの基本的な仕様（RFC4180）に沿った最小限のパーサー。
 * ダブルクォートで囲まれたフィールド内のカンマ・改行・エスケープされた引用符(""）に対応する。
 */
export function parseCsv(text: string): string[][] {
  // 先頭のBOM（Excelが付与することが多い）を除去
  const input = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // \r\n の \r をスキップしつつ、空行は無視する
      if (char === "\r" && input[i + 1] === "\n") continue;
      row.push(field);
      field = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  // 末尾に改行が無いファイルの最終行を回収
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell !== "")) rows.push(row);
  }

  return rows;
}
