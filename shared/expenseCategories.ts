/**
 * 経費カテゴリの定義
 */

export const EXPENSE_CATEGORIES = [
  { key: "laborCosts", label: "人件費" },
  { key: "rent", label: "家賃" },
  { key: "utilities", label: "水道光熱費" },
  { key: "communicationCosts", label: "通信費" },
  { key: "consumablesCosts", label: "消耗品費" },
  { key: "trainingExpenses", label: "研修費" },
  { key: "travelExpenses", label: "交通費" },
  { key: "bankRepayment", label: "銀行返済" },
  { key: "insuranceCosts", label: "保険料" },
  { key: "leaseCosts", label: "リース料" },
  { key: "repairCosts", label: "修繕費" },
  { key: "welfareCosts", label: "福利厚生費" },
  { key: "depreciationCosts", label: "減価償却費" },
  { key: "accountingCosts", label: "税理士・会計士費用" },
  { key: "miscellaneousCosts", label: "雑費" },
  { key: "otherExpenses", label: "その他経費" },
] as const;

export type ExpenseCategoryKey = typeof EXPENSE_CATEGORIES[number]["key"];

export const DEFAULT_EXPENSE_VALUES: Record<ExpenseCategoryKey, number> = {
  laborCosts: 0,
  rent: 0,
  utilities: 0,
  communicationCosts: 0,
  consumablesCosts: 0,
  trainingExpenses: 0,
  travelExpenses: 0,
  bankRepayment: 0,
  insuranceCosts: 0,
  leaseCosts: 0,
  repairCosts: 0,
  welfareCosts: 0,
  depreciationCosts: 0,
  accountingCosts: 0,
  miscellaneousCosts: 0,
  otherExpenses: 0,
};
