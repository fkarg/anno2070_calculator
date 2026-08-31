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

export function selectWorkspace(name: 'Islands' | 'Production' | 'Growth'): void {
  const tab = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    .find((candidate) => candidate.textContent === name);
  fireEvent.click(requiredElement(tab, `${name} workspace tab`));
}

export function addIsland(): void {
  selectWorkspace('Islands');
  const button = [...document.querySelectorAll<HTMLButtonElement>('.islands-section button')]
    .find((candidate) => candidate.textContent === 'Add island');
  fireEvent.click(requiredElement(button, 'Add island button'));
}

export async function setGrowthResidenceTarget(faction: string, value: string): Promise<void> {
  selectWorkspace('Growth');
  fireEvent.click(buttonWithLabel(`Target ${faction[0].toUpperCase() + faction.slice(1)} by residences`));
  await replaceInput(input(`growth-${faction}-houses`), value);
}

export async function replaceInput(input: HTMLElement, value: string): Promise<void> {
  fireEvent.change(input, { target: { value } });
}

// Fresh islands hide zero-resident faction rows; initial population entry
// happens in the Configure panel. Card rows appear once houses exist.
export async function setIslandHouses(islandIndex: number, faction: string, value: string): Promise<void> {
  const card = byTestId(`island-${islandIndex}`);
  const configInput = () => document.getElementById(`island-${islandIndex}-config-${faction}-houses`);
  const toggle = () => requiredElement(
    card.querySelector<HTMLButtonElement>('.island-card__plaque button'),
    `configure toggle for island ${islandIndex}`,
  );
  const wasOpen = configInput() !== null;
  if (!wasOpen) fireEvent.click(toggle());
  await replaceInput(requiredElement(configInput(), `config houses for ${faction}`), value);
  if (!wasOpen) fireEvent.click(toggle());
}
