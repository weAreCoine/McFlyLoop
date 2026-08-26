import { expect, test } from 'vitest';

import { FLY_PHRASES, runFly } from '../../src/controller/fly.js';

test('FLY_PHRASES lists the five flight phrases in order', () => {
  expect(FLY_PHRASES).toEqual([
    'Warming up the time circuits...',
    "Roads? Where we're going, we don't need roads.",
    'Great Scott!',
    'The flux capacitor is fluxing.',
    'Setting destination time...',
  ]);
});

test.each<[number, string]>([
  [0, 'Warming up the time circuits...'],
  [0.1, 'Warming up the time circuits...'],
  [0.3, "Roads? Where we're going, we don't need roads."],
  [0.5, 'Great Scott!'],
  [0.7, 'The flux capacitor is fluxing.'],
  [0.9, 'Setting destination time...'],
  [0.9999999, 'Setting destination time...'],
])(
  'runFly returns the phrase selected by the injected random value (value=%s)',
  (value, expected) => {
    expect(runFly(() => value)).toBe(expected);
  },
);

test('runFly consults the random source exactly once', () => {
  let calls = 0;
  const stub = (): number => {
    calls += 1;
    return 0.5;
  };

  expect(runFly(stub)).toBe('Great Scott!');
  expect(calls).toBe(1);
});

test.each<[number, string]>([
  [1, 'RandomSource returned 1, expected [0, 1)'],
  [-0.1, 'RandomSource returned -0.1, expected [0, 1)'],
  [NaN, 'RandomSource returned NaN, expected [0, 1)'],
])(
  'runFly throws RangeError when the random source leaves [0, 1) (value=%s)',
  (value, message) => {
    const stub = (): number => value;
    let thrown: unknown;

    try {
      runFly(stub);
    } catch (error) {
      thrown = error;
    }

    if (thrown instanceof RangeError) {
      expect(thrown.message).toBe(message);
    } else {
      expect.fail(`expected a RangeError, got ${String(thrown)}`);
    }
  },
);
