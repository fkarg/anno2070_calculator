import { fireEvent, render } from '@testing-library/react';

import { App } from '../App';

export function renderApp() {
  return render(<App />);
}

function requiredElement<T extends Element>(
  element: T | null | undefined,
  description: string,
): T {
  if (!element) throw new Error(`Missing ${description}`);
  return element;
}

export function input(id: string): HTMLInputElement {
  return requiredElement(document.getElementById(id) as HTMLInputElement | null, `input #${id}`);
}

export function productionRow(id: string): HTMLElement {
  return requiredElement(
    document.querySelector(`[data-testid="production-node-${id}"]`),
    `production row ${id}`,
  );
}

export function requiredBuildings(id: string): HTMLOutputElement {
  return requiredElement(productionRow(id).querySelector('output'), `required output for ${id}`);
}

export function byTestId(id: string): HTMLElement {
  return requiredElement(document.querySelector(`[data-testid="${id}"]`), `test id ${id}`);
}

export function buttonWithLabel(label: string, root: ParentNode = document): HTMLButtonElement {
  return requiredElement(
    [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.getAttribute('aria-label') === label),
    `button labelled ${label}`,
  );
}

export function productionCheckbox(index: 0 | 1): HTMLInputElement {
  return requiredElement(
    document.querySelectorAll<HTMLInputElement>('.production-options input[type="checkbox"]')[index],
    `production option ${index}`,
  );
}

export function resetButton(): HTMLButtonElement {
  return requiredElement(document.querySelector('main > header button'), 'reset button');
}

export async function replaceInput(input: HTMLElement, value: string): Promise<void> {
  fireEvent.change(input, { target: { value } });
}
