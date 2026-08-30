import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { NumericInput } from './NumericInput';

test('associates its visible label and reports edits', () => {
  let raw = '10';
  render(
    <NumericInput
      id="example"
      label="Example"
      raw={raw}
      valid
      onChange={(value) => { raw = value; }}
    />,
  );

  fireEvent.change(screen.getByLabelText('Example'), { target: { value: '12.5' } });

  expect(raw).toBe('12.5');
});
