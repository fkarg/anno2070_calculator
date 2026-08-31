import { beforeEach, expect, test } from 'vitest';

import { renderApp, selectWorkspace } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

test('keeps a read-only Actual, Target, and Headroom overview above every workspace', () => {
  renderApp();
  const overview = document.querySelector('.population-overview')!;

  expect(overview).toHaveTextContent('Actual');
  expect(overview).toHaveTextContent('Target');
  expect(overview).toHaveTextContent('Headroom / limit');
  expect(overview.querySelector('input, button')).toBeNull();

  selectWorkspace('Growth');
  expect(document.querySelector('.population-overview')).toBe(overview);
  expect(document.querySelector('#workspace-growth input')).not.toBeNull();
});
