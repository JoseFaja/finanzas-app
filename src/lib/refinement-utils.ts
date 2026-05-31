export interface RefinementAnswer {
  id: string;
  question: string;
  answer: string;
}

export function parseRefinementValues(answers: RefinementAnswer[]) {
  const result: { preferredMonthly?: number; desiredMonths?: number } = {};

  for (const a of answers) {
    const text = `${a.question} ${a.answer}`.toLowerCase();
    const numbers = Array.from(text.matchAll(/\d+(?:[.,]\d+)?/g), (match) => Number(match[0].replace(/\./g, "").replace(/,/g, ""))).filter((value) => Number.isFinite(value) && value > 0);

    if (numbers.length === 0) {
      continue;
    }

    const monthMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mes|meses|m\b)/i);
    const moneyHints = /ahorr|guardar|destin|apartar|cuota|monto|valor|saldo|cop|pesos?/i.test(text);

    if (monthMatch) {
      const monthValue = Number(monthMatch[1].replace(/\./g, "").replace(/,/g, ""));

      if (Number.isFinite(monthValue) && monthValue > 0) {
        result.desiredMonths = Math.max(1, Math.round(monthValue));
      }
    }

    if (moneyHints) {
      const moneyValue = numbers.reduce((max, value) => Math.max(max, value), 0);

      if (moneyValue > 0) {
        result.preferredMonthly = Math.round(moneyValue);
      }
    }

    if (result.desiredMonths === undefined && numbers.length > 0 && /mes(es)?/i.test(text)) {
      const monthValue = numbers.find((value) => value <= 36) ?? numbers[0];

      if (monthValue > 0) {
        result.desiredMonths = Math.max(1, Math.round(monthValue));
      }
    }

    if (result.preferredMonthly === undefined && numbers.length > 0) {
      const moneyValue = numbers.length === 1 ? numbers[0] : numbers.reduce((max, value) => Math.max(max, value), 0);

      if (moneyValue > 0) {
        result.preferredMonthly = Math.round(moneyValue);
      }
    }
  }

  return result;
}
