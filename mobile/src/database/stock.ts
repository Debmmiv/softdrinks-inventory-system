// Stock is stored in bottles: total = cases x unitsPerCase + loose bottles.
export function toTotalBottles(cases: number, bottles: number, unitsPerCase: number) {
  return cases * unitsPerCase + bottles;
}

export function toCasesAndBottles(totalBottles: number, unitsPerCase: number) {
  return {
    cases: Math.floor(totalBottles / unitsPerCase),
    bottles: totalBottles % unitsPerCase,
  };
}
