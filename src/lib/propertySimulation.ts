import { calculateSimulation, type SimulationResult } from "@/lib/simulation";
import type { PropertyWithRelations } from "@/lib/types";

/**
 * 物件に保存されている初期シミュレーション値（SimulationInput）を使って
 * 収益シミュレーションのベースライン結果を計算する。
 * 検索結果カード・並び替え・お気に入り一覧など、ユーザーが数値を編集する前の
 * 「デフォルトの想定利益」を表示したい箇所で共通利用する。
 */
export function computeDefaultSimulation(property: PropertyWithRelations): SimulationResult | null {
  const sim = property.simulationInput;
  if (!sim) return null;

  return calculateSimulation({
    rent: property.rent,
    managementFee: property.managementFee,
    nightlyPrice: sim.nightlyPrice,
    occupancyRate: sim.occupancyRate,
    utilityCost: sim.utilityCost,
    cleaningCost: sim.cleaningCost,
    suppliesCost: sim.suppliesCost,
    otaFeeRate: sim.otaFeeRate,
    otherCost: sim.otherCost,
    initialCost: property.initialCost,
  });
}
