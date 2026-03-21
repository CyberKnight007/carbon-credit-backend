"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KG_PER_CREDIT = exports.KG_CO2_PER_TREE_PER_YEAR = exports.SPECIES_MULTIPLIERS = void 0;
exports.calculateMonthlyCredits = calculateMonthlyCredits;
exports.calculateCO2Kg = calculateCO2Kg;
exports.calculateFarmerPayout = calculateFarmerPayout;
exports.SPECIES_MULTIPLIERS = {
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
exports.KG_CO2_PER_TREE_PER_YEAR = 22;
exports.KG_PER_CREDIT = 1000;
function calculateMonthlyCredits(treeCount, species = "default", approvedDaysRatio = 1) {
    const multiplier = exports.SPECIES_MULTIPLIERS[species.toLowerCase()] || exports.SPECIES_MULTIPLIERS.default;
    const creditsPerTreePerMonth = (exports.KG_CO2_PER_TREE_PER_YEAR * multiplier) / exports.KG_PER_CREDIT / 12;
    return treeCount * creditsPerTreePerMonth * approvedDaysRatio;
}
function calculateCO2Kg(credits) {
    return credits * exports.KG_PER_CREDIT;
}
function calculateFarmerPayout(treesCount, pricePerTreePerMonth, approvedDaysInMonth, totalDaysInMonth) {
    const ratio = approvedDaysInMonth / totalDaysInMonth;
    return treesCount * pricePerTreePerMonth * ratio;
}
//# sourceMappingURL=carbon.js.map