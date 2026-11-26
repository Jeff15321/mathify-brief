export function analysisModel(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
}

export function summaryModel(): string {
  return process.env.ANTHROPIC_SUMMARY_MODEL || 'claude-haiku-5-5';
}

export function modelLabel(model: string): string {
  return process.env.AI_MOCK_MODE === 'false' ? model : 'mock-provider';
}
