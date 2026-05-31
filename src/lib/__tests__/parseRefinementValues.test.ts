import { describe, it, expect } from 'vitest';
import { parseRefinementValues } from '../refinement-utils';

describe('parseRefinementValues', () => {
  it('parses money and months from combined question+answer', () => {
    const answers = [
      { id: '1', question: '¿Cuánto puedes destinar?', answer: 'Quiero ahorrar 100000 en 1 mes' },
    ];

    const result = parseRefinementValues(answers as any);

    expect(result.preferredMonthly).toBe(100000);
    expect(result.desiredMonths).toBe(1);
  });

  it('parses money with dots and COP', () => {
    const answers = [
      { id: '1', question: 'monto', answer: '100.000 COP al mes' },
    ];

    const result = parseRefinementValues(answers as any);

    expect(result.preferredMonthly).toBe(100000);
  });

  it('parses months only', () => {
    const answers = [
      { id: '1', question: 'plazo', answer: '3 meses' },
    ];

    const result = parseRefinementValues(answers as any);

    expect(result.desiredMonths).toBe(3);
  });

  it('parses shorthand numbers', () => {
    const answers = [
      { id: '1', question: 'ahorrar', answer: '1,000,000 en 6 meses' },
    ];

    const result = parseRefinementValues(answers as any);

    expect(result.preferredMonthly).toBe(1000000);
    expect(result.desiredMonths).toBe(6);
  });
});
