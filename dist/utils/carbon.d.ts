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
export declare const SPECIES_MULTIPLIERS: Record<string, number>;
export declare const KG_CO2_PER_TREE_PER_YEAR = 22;
export declare const KG_PER_CREDIT = 1000;
export declare function calculateMonthlyCredits(treeCount: number, species?: string, approvedDaysRatio?: number): number;
export declare function calculateCO2Kg(credits: number): number;
export declare function calculateFarmerPayout(treesCount: number, pricePerTreePerMonth: number, approvedDaysInMonth: number, totalDaysInMonth: number): number;
//# sourceMappingURL=carbon.d.ts.map