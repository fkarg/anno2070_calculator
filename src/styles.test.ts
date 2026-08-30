import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

test('reserves enough width for production impacts at faction boundaries', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  expect(css).toContain('grid-template-columns: repeat(3, minmax(720px, 1fr));');
});
