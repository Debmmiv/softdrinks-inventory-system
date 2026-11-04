// FR15 — The core formula from the README:
// total_bottles = (cases × units_per_case) + loose_bottles
export function toTotalBottles(
  cases: number,
  looseBottles: number,
  unitsPerCase: number
): number {
  return cases * unitsPerCase + looseBottles;
}

// FR15 — Display format: convert raw bottle count back to "X cases and Y bottles"
// e.g. 50 bottles with 24 per case → { cases: 2, remaining_bottles: 2 }
export function toCasesAndBottles(
  totalBottles: number,
  unitsPerCase: number
): { cases: number; remaining_bottles: number } {
  if (unitsPerCase <= 0) return { cases: 0, remaining_bottles: totalBottles };
  return {
    cases: Math.floor(totalBottles / unitsPerCase),
    remaining_bottles: totalBottles % unitsPerCase,
  };
}

// Format for screen display: "2 cases and 2 bottles"
export function formatStock(totalBottles: number, unitsPerCase: number): string {
  const { cases, remaining_bottles } = toCasesAndBottles(totalBottles, unitsPerCase);
  if (cases === 0) return `${remaining_bottles} bottle${remaining_bottles !== 1 ? 's' : ''}`;
  if (remaining_bottles === 0) return `${cases} case${cases !== 1 ? 's' : ''}`;
  return `${cases} case${cases !== 1 ? 's' : ''} and ${remaining_bottles} bottle${remaining_bottles !== 1 ? 's' : ''}`;
}

// Validate a delivery or release input (FR11, FR12)
// At least cases or loose_bottles must be greater than zero
export function isValidQuantity(cases: number, looseBottles: number): boolean {
  return Number.isInteger(cases) &&
    Number.isInteger(looseBottles) &&
    cases >= 0 &&
    looseBottles >= 0 &&
    cases + looseBottles > 0;
}
