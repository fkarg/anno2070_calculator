import { beforeEach, expect, test } from 'vitest';

import { input, renderApp, selectWorkspace } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

test('keeps the established residences view above every workspace', () => {
  renderApp();
  const residences = document.querySelector('.population-section')!;

  expect(residences).toHaveTextContent('Residences & inhabitants');
  expect(input('eco-houses')).toBeVisible();

  selectWorkspace('Growth');
  expect(document.querySelector('.population-section')).toBe(residences);
  expect(input('eco-houses')).toBeVisible();
  expect(document.querySelector('#workspace-growth .population-section')).toBeNull();
});
