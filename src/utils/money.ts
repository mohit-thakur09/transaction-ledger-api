const MINOR_UNITS = 100;

export function toMinorUnits(amount: number): number {
  return Math.round(amount * MINOR_UNITS);
}

export function fromMinorUnits(amount: number): number {
  return amount / MINOR_UNITS;
}

export function hasAtMostTwoDecimals(amount: number): boolean {
  return Math.abs(amount * MINOR_UNITS - Math.round(amount * MINOR_UNITS)) < 1e-6;
}
