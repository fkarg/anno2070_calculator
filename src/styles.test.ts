import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

// Firefox gives the unbroken per-building summary a wider min-content size than Chromium;
// without wrapping and containment it paints across the next faction's gutter.
test('contains production impacts at faction boundaries', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  expect(css).toContain('grid-template-columns: repeat(3, minmax(720px, 1fr));');
  expect(css).toContain('column-gap: .75rem;');
  expect(css).toContain('grid-template-columns: minmax(15rem, 1fr) 4.3rem 4rem 16rem;');
  expect(css).toContain('.production-faction__nodes { overflow: hidden; }');
  expect(css).toMatch(/\.production-node__impact small \{[^}]*flex-wrap: wrap;/);
});
