/**
 * Carbon credit calculation utilities
 *
 * Formula basis:
 *  - Average mature tree absorbs ~22 kg CO2/year
 *  - 1 carbon credit = 1 tonne CO2 = 1000 kg
 *  - Monthly CO2 = annual / 12
 *  - Credits per tree per month = 22 / 1000 / 12 = 0.001833
 *
 * Species multipliers adjust for faster/slower growing trees
 */

export const SPECIES_MULTIPLIERS: Record<string, number> = {
  oak: 1.0,
  pine: 1.1,
  eucalyptus: 1.5,
  mangrove: 2.0,
  teak: 0.9,
  bamboo: 1.8,
  neem: 1.0,
  mango: 0.8,
  default: 1.0,
};

export const KG_CO2_PER_TREE_PER_YEAR = 22;
export const KG_PER_CREDIT = 1000;

export function calculateMonthlyCredits(
  treeCount: number,
  species: string = "default",
  approvedDaysRatio: number = 1
): number {
  const multiplier = SPECIES_MULTIPLIERS[species.toLowerCase()] || SPECIES_MULTIPLIERS.default;
  const creditsPerTreePerMonth = (KG_CO2_PER_TREE_PER_YEAR * multiplier) / KG_PER_CREDIT / 12;
  return treeCount * creditsPerTreePerMonth * approvedDaysRatio;
}

export function calculateCO2Kg(credits: number): number {
  return credits * KG_PER_CREDIT;
}

export function calculateFarmerPayout(
  treesCount: number,
  pricePerTreePerMonth: number,
  approvedDaysInMonth: number,
  totalDaysInMonth: number
): number {
  const ratio = approvedDaysInMonth / totalDaysInMonth;
  return treesCount * pricePerTreePerMonth * ratio;
}
