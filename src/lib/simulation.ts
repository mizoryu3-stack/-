/**
 * 収益シミュレーションの計算ロジック。
 * ユーザーが物件詳細画面で自由に数値を変更できるようにするため、
 * 保存された値ではなくその場（クライアント）で再計算できる純粋関数として提供する。
 */

export const DAYS_PER_MONTH = 30;

export interface SimulationInput {
  rent: number; // 家賃（円/月）
  managementFee: number; // 管理費（円/月）
  nightlyPrice: number; // 想定宿泊単価（円/泊）
  occupancyRate: number; // 想定稼働率（0.0〜1.0）
  utilityCost: number; // 水道光熱費（円/月）
  cleaningCost: number; // 清掃費（円/月）
  suppliesCost: number; // 消耗品費（円/月）
  otherCost: number; // その他経費（円/月）
}

export interface SimulationResult {
  monthlyNights: number; // 月間宿泊日数
  monthlySales: number; // 月間売上（円）
  totalCost: number; // 月間経費合計（家賃込み、円）
  profit: number; // 想定利益（円/月）
}

export function calculateSimulation(input: SimulationInput): SimulationResult {
  const occupancyRate = Math.min(1, Math.max(0, input.occupancyRate));
  const monthlyNights = Math.round(DAYS_PER_MONTH * occupancyRate);
  const monthlySales = input.nightlyPrice * monthlyNights;

  const totalCost =
    input.rent +
    input.managementFee +
    input.utilityCost +
    input.cleaningCost +
    input.suppliesCost +
    input.otherCost;

  const profit = monthlySales - totalCost;

  return { monthlyNights, monthlySales, totalCost, profit };
}
