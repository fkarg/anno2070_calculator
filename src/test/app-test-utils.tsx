import { fireEvent, render } from '@testing-library/react';

import { App } from '../App';

export function renderApp() {
  return render(<App />);
}

export async function replaceInput(input: HTMLElement, value: string): Promise<void> {
  fireEvent.change(input, { target: { value } });
}
