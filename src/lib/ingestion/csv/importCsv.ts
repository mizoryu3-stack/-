import { prisma } from "@/lib/prisma";
import { ingestProperty } from "@/lib/ingestion/ingestProperty";
import { parseCsv } from "@/lib/ingestion/csv/parseCsv";
import { mapHeaders, type CanonicalField } from "@/lib/ingestion/csv/columnAliases";
import { convertCsvRow } from "@/lib/ingestion/csv/csvRowMapper";

export interface RowError {
  row: number; // ファイル内の行番号（ヘッダー行を1行目として数える）
  message: string;
}

export interface ImportCsvSummary {
  batchId: number;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  duplicateCandidateCount: number;
  errors: RowError[];
}

/**
 * CSVテキストを解析し、1行ずつ ingestProperty() を通してDBに反映する。
 * 結果は ImportBatch として永続化し、後から /admin/import/[batchId] で確認できるようにする。
 */
export async function importCsv(csvText: string, fileName: string | null): Promise<ImportCsvSummary> {
  const rows = parseCsv(csvText);

  if (rows.length === 0) {
    return persistAndReturn({ fileName, totalRows: 0, createdCount: 0, updatedCount: 0, errors: [], duplicateCandidateCount: 0 });
  }

  const [headerRow, ...dataRows] = rows;
  const headerMap = mapHeaders(headerRow);

  let createdCount = 0;
  let updatedCount = 0;
  let duplicateCandidateCount = 0;
  const errors: RowError[] = [];

  for (const [rowIndex, rowValues] of dataRows.entries()) {
    const fileRowNumber = rowIndex + 2; // ヘッダー行(1行目)の次から数える

    const cells: Partial<Record<CanonicalField, string>> = {};
    for (const [field, columnIndex] of Object.entries(headerMap) as [CanonicalField, number][]) {
      cells[field] = rowValues[columnIndex];
    }

    const converted = convertCsvRow(cells);
    if (!converted.ok || !converted.data) {
      for (const message of converted.errors) {
        errors.push({ row: fileRowNumber, message });
      }
      continue;
    }

    try {
      const result = await ingestProperty(converted.data);
      if (result.created) createdCount++;
      else updatedCount++;
      duplicateCandidateCount += result.duplicateCandidateCount;
    } catch (e) {
      errors.push({
        row: fileRowNumber,
        message: e instanceof Error ? `取込に失敗しました（${e.message}）` : "取込に失敗しました",
      });
    }
  }

  return persistAndReturn({
    fileName,
    totalRows: dataRows.length,
    createdCount,
    updatedCount,
    errors,
    duplicateCandidateCount,
  });
}

async function persistAndReturn(input: {
  fileName: string | null;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  errors: RowError[];
  duplicateCandidateCount: number;
}): Promise<ImportCsvSummary> {
  const batch = await prisma.importBatch.create({
    data: {
      source: "csv",
      fileName: input.fileName,
      totalRows: input.totalRows,
      createdCount: input.createdCount,
      updatedCount: input.updatedCount,
      errorCount: input.errors.length,
      duplicateCandidateCount: input.duplicateCandidateCount,
      errorsJson: input.errors.length > 0 ? JSON.stringify(input.errors) : null,
    },
  });

  return {
    batchId: batch.id,
    totalRows: input.totalRows,
    createdCount: input.createdCount,
    updatedCount: input.updatedCount,
    errorCount: input.errors.length,
    duplicateCandidateCount: input.duplicateCandidateCount,
    errors: input.errors,
  };
}
