import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

// Symmetric outer tracks keep the controls centered while the tree and impacts hug the edges.
test('fits production impacts inside faction boundaries', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  // rem floor: px floors clip rem-sized rows under Firefox text-only zoom.
  expect(css).toContain('grid-template-columns: repeat(3, minmax(42rem, 1fr));');
  expect(css).toContain('column-gap: .75rem;');
  expect(css).toContain('grid-template-columns: minmax(0, 1fr) 3.6rem 3.4rem minmax(0, 1.4fr);');
  expect(css).toContain('.production-faction__nodes { overflow: hidden; }');
  expect(css).toMatch(/\.production-node output \{[^}]*text-align: center;/);
  expect(css).toContain('.production-node input { padding: .34rem .25rem; font-size: .75rem; text-align: center; }');
  expect(css).toMatch(/\.production-node__impact small \{[^}]*flex-wrap: wrap;/);
  expect(css).toMatch(/\.operating-impact-values \{[^}]*flex-wrap: wrap;/);
  expect(css).toMatch(/\.operating-impact-values__metric \{[^}]*white-space: nowrap;/);
});
