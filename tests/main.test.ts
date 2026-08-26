import { expect, test } from 'vitest';

import { main } from '../src/main.js';

test('main reports the placeholder status', () => {
  expect(main()).toBe('mcfly-loop: nothing to orchestrate yet');
});
