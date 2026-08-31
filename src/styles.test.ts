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

test('visually distinguishes the active workspace tab', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  expect(css).toMatch(/\.workspace-tabs \{[^}]*display: flex;/);
  expect(css).toMatch(/\.workspace-tabs button\[aria-selected="true"\] \{[^}]*border-color:/);
  expect(css).toMatch(/\.workspace-tabs button:focus-visible \{[^}]*outline:/);
});

test('defines and consumes semantic color tokens', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  for (const token of [
    '--surface-page', '--surface-panel', '--surface-raised', '--surface-section-heading',
    '--surface-card', '--surface-control', '--surface-selected', '--line-strong',
    '--line-soft', '--text-primary', '--text-muted', '--select', '--info', '--success',
    '--deficit', '--focus', '--manual', '--manual-ink', '--manual-wash', '--invalid',
    '--value-gold', '--value-gold-bright', '--eco', '--tycoon', '--tech',
  ]) {
    expect(css).toContain(`${token}:`);
  }

  expect(css).toMatch(/button:focus-visible, input:focus-visible \{[^}]*var\(--focus\)/);
  expect(css).toMatch(/\.workspace-tabs button\[aria-selected="true"\] \{[^}]*var\(--select\)/);
  expect(css).toMatch(/\.population-value--manual \{[^}]*var\(--manual\)/);
  expect(css).toMatch(/\.balance--shortfall \{[^}]*var\(--deficit\)/);
  expect(css).toMatch(/\.balance--surplus \{[^}]*var\(--success\)/);
});

test('keeps island cards two-up on desktop', () => {
  const css = readFileSync('src/styles.css', 'utf8');

  expect(css).toMatch(/\.islands-section__cards \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  expect(css).toMatch(/@media \(max-width: 1050px\)[\s\S]*\.islands-section__cards \{ grid-template-columns: 1fr; \}/);
  expect(css.indexOf('.islands-section__cards {\n  display: grid;'))
    .toBeLessThan(css.indexOf('@media (max-width: 1050px)'));
});

test('lays out the overview and Growth planner as distinct responsive surfaces', () => {
  const css = readFileSync('src/styles.css', 'utf8');
  const growthCss = readFileSync('src/components/growth-milestones.css', 'utf8');

  expect(css).toMatch(/\.pop-rows--overview \.pop-row \{[^}]*grid-template-columns: 32px minmax\(0, 1fr\) minmax\(4rem, \.65fr\) minmax\(8rem, 1fr\) minmax\(7rem, 1fr\);/);
  expect(css).toMatch(/\.growth-targets \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  expect(css).toMatch(/\.growth-milestone--current \{[^}]*border-color:/);
  expect(css).toMatch(/\.growth-milestone--future \{[^}]*opacity:/);
  expect(css).toMatch(/@media \(max-width: 1050px\)[\s\S]*\.growth-targets \{ grid-template-columns: 1fr; \}/);
  expect(growthCss).toMatch(/\.growth-milestones__branches \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  expect(growthCss).toMatch(/@media \(max-width: 1050px\)[\s\S]*\.growth-milestones__branches \{ grid-template-columns: 1fr; \}/);
});
