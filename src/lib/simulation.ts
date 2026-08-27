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
  otaFeeRate: number; // OTA手数料率（0.0〜1.0、売上に対する割合）
  otherCost: number; // その他経費（円/月）
  /** 初期費用（円）。想定利回り・投資回収期間の算出に使用。未設定の場合はnull */
  initialCost?: number | null;
}

export interface SimulationResult {
  monthlyNights: number; // 月間宿泊日数
  monthlySales: number; // 月間売上（円）
  otaFee: number; // OTA手数料（円/月）
  totalCost: number; // 月間経費合計（家賃・OTA手数料込み、円）
  monthlyProfit: number; // 想定利益（円/月）
  annualProfit: number; // 想定年間利益（円/年）
  /** 想定利回り（年間利益 / 初期費用 × 100）。初期費用未設定の場合は null */
  yieldRate: number | null;
  /** 投資回収期間（月数）。月間利益が0以下、または初期費用未設定の場合は null */
  paybackMonths: number | null;
}

export function calculateSimulation(input: SimulationInput): SimulationResult {
  const occupancyRate = Math.min(1, Math.max(0, input.occupancyRate));
  const monthlyNights = Math.round(DAYS_PER_MONTH * occupancyRate);
  const monthlySales = input.nightlyPrice * monthlyNights;
  const otaFee = Math.round(monthlySales * Math.min(1, Math.max(0, input.otaFeeRate)));

  const totalCost =
    input.rent +
    input.managementFee +
    input.utilityCost +
    input.cleaningCost +
    input.suppliesCost +
    input.otherCost +
    otaFee;

  const monthlyProfit = monthlySales - totalCost;
  const annualProfit = monthlyProfit * 12;

  const initialCost = input.initialCost ?? null;
  const yieldRate = initialCost && initialCost > 0 ? (annualProfit / initialCost) * 100 : null;
  const paybackMonths =
    initialCost && initialCost > 0 && monthlyProfit > 0 ? initialCost / monthlyProfit : null;

  return { monthlyNights, monthlySales, otaFee, totalCost, monthlyProfit, annualProfit, yieldRate, paybackMonths };
}
