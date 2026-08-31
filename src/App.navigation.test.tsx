import { fireEvent } from '@testing-library/react';
import { beforeEach, expect, test } from 'vitest';

import { renderApp } from './test/app-test-utils';

beforeEach(() => localStorage.clear());

test('switches between Islands, Production, and Growth with accessible tabs', () => {
  renderApp();
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];

  expect(tabs.map((tab) => tab.textContent)).toEqual(['Islands', 'Production', 'Growth']);
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

  tabs[0].focus();
  fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });

  expect(tabs[1]).toHaveFocus();
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(document.querySelector('[role="tabpanel"]:not([hidden])')).toHaveAttribute('id', 'workspace-production');
});

test('keeps the residences overview outside the selected workspace', () => {
  renderApp();
  const overview = document.querySelector('.population-section');
  const production = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    .find((tab) => tab.textContent === 'Production')!;

  fireEvent.click(production);

  expect(document.querySelector('.population-section')).toBe(overview);
});
