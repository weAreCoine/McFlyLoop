export type RandomSource = () => number;

export const FLY_PHRASES: readonly string[] = [
  'Warming up the time circuits...',
  "Roads? Where we're going, we don't need roads.",
  'Great Scott!',
  'The flux capacitor is fluxing.',
  'Setting destination time...',
];

export function runFly(random: RandomSource): string {
  const value = random();
  const phrase = FLY_PHRASES[Math.floor(value * FLY_PHRASES.length)];

  if (phrase === undefined) {
    throw new RangeError(`RandomSource returned ${String(value)}, expected [0, 1)`);
  }

  return phrase;
}
