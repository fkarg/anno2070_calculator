import { readFileSync } from 'node:fs';

import { expect, test } from 'vitest';

// Reserve one consistent impact track for every row and wrap between complete metrics.
test('fits production impacts inside faction boundaries', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  expect(css).toContain('grid-template-columns: repeat(3, minmax(720px, 1fr));');
  expect(css).toContain('column-gap: .75rem;');
  expect(css).toContain('grid-template-columns: minmax(0, 1fr) 4.3rem 4rem 18rem;');
  expect(css).toContain('.production-faction__nodes { overflow: hidden; }');
  expect(css).toMatch(/\.production-node output \{[^}]*text-align: center;/);
  expect(css).toContain('.production-node input { padding: .34rem .25rem; font-size: .75rem; text-align: center; }');
  expect(css).toMatch(/\.production-node__impact small \{[^}]*flex-wrap: wrap;/);
  expect(css).toMatch(/\.operating-impact-values \{[^}]*flex-wrap: wrap;/);
  expect(css).toMatch(/\.operating-impact-values__metric \{[^}]*white-space: nowrap;/);
});
