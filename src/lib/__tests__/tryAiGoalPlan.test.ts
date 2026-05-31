import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tryAiGoalPlan } from '../financial-insights';

const baseContext = {
  id: 1,
  nombreObjetivo: 'Test',
  montoMeta: 2000,
  fechaLimite: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  currentAmount: 1000,
  remainingAmount: 1000,
  monthsLeft: 5,
  accountName: null,
  accountBalance: 0,
  monthlyIncome: 1000,
  monthlyExpenses: 600,
  monthlyDebtCommitment: 50,
  monthlyDisposableIncome: 350,
  debtPressure: 0.1,
};

const emptySnapshot = { cuentas: [], deudas: [], transacciones: [] } as any;

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
});

describe('tryAiGoalPlan', () => {
  it('returns parsed plans when AI returns valid JSON within limits', async () => {
    const aiPlans = {
      plans: [
        { key: 'high', title: 'H', description: '', monthlyContribution: 200, estimatedMonths: Math.ceil(1000 / 200), viability: 'alta', actions: [], tradeoffs: [], notes: [] },
        { key: 'medium', title: 'M', description: '', monthlyContribution: 150, estimatedMonths: Math.ceil(1000 / 150), viability: 'media', actions: [], tradeoffs: [], notes: [] },
        { key: 'low', title: 'L', description: '', monthlyContribution: 50, estimatedMonths: Math.ceil(1000 / 50), viability: 'baja', actions: [], tradeoffs: [], notes: [] },
      ],
      summary: 'OK',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(aiPlans) } }] }),
    }));

    const result = await tryAiGoalPlan({ context: baseContext as any, questions: [], answers: [], plans: [], snapshot: emptySnapshot });

    expect(result).not.toBeNull();
    expect(result!.plans.length).toBe(3);
    expect(result!.adjusted).toBe(false);
  });

  it('clamps oversized monthlyContribution and returns adjusted true', async () => {
    const aiPlans = {
      plans: [
        { key: 'high', title: 'H', description: '', monthlyContribution: 5000, estimatedMonths: 1, viability: 'alta', actions: [], tradeoffs: [], notes: [] },
        { key: 'medium', title: 'M', description: '', monthlyContribution: 4000, estimatedMonths: 1, viability: 'media', actions: [], tradeoffs: [], notes: [] },
        { key: 'low', title: 'L', description: '', monthlyContribution: 3000, estimatedMonths: 1, viability: 'baja', actions: [], tradeoffs: [], notes: [] },
      ],
      summary: 'Overshoot',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(aiPlans) } }] }),
    }));

    const result = await tryAiGoalPlan({ context: baseContext as any, questions: [], answers: [], plans: [], snapshot: emptySnapshot });

    expect(result).not.toBeNull();
    expect(result!.adjusted).toBe(true);
    // clamped to remainingAmount (1000)
    expect(result!.plans.map((p) => p.monthlyContribution)).toEqual([1000, 1000, 1000]);
  });

  it('returns null when no API key', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await tryAiGoalPlan({ context: baseContext as any, questions: [], answers: [], plans: [], snapshot: emptySnapshot });
    expect(result).toBeNull();
  });

  it('returns null when response not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const result = await tryAiGoalPlan({ context: baseContext as any, questions: [], answers: [], plans: [], snapshot: emptySnapshot });
    expect(result).toBeNull();
  });
});
