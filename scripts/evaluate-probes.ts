/** Offline by default; live requests require opt-in, an explicit model and a hard request cap. */
import { mkdir, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { AnthropicAnalysisProvider } from '../src/server/ai/anthropic-provider';
import { MockAnalysisProvider } from '../src/server/ai/mock-provider';
import { validateAnalysisStructure, validateProbePair } from '../src/schemas/analysis';
import { reviewApproved } from '../src/schemas/review';
import type { MimeType } from '../src/types/domain';
import { ANALYSIS_PROMPT_VERSION, PROBE_PROMPT_VERSION } from '../src/server/ai/prompts';
import { ANALYSIS_SYSTEM_PROMPT, PROBE_PAIR_SYSTEM_PROMPT } from '../tests/fixtures/probe-evaluation/baseline-prompts';

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string, fallback: string) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const live = args.includes('--live');
  const cap = Number(value('--max-calls', '0'));
  const limit = Number(value('--limit', '24'));
  const runs = Number(value('--runs', '2'));
  const variant = value('--variant', 'candidate');
  if (!Number.isInteger(limit) || limit < 1 || limit > 24 || !Number.isInteger(runs) || runs < 1 || runs > 2) throw new Error('Use --limit 1..24 and --runs 1..2');
  if (!['baseline', 'candidate', 'both'].includes(variant)) throw new Error('Use --variant baseline, candidate or both');
  if (live && (process.env.RUN_PROBE_EVAL !== '1' || !process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL || !Number.isInteger(cap) || cap < 1 || cap > 400)) throw new Error('Live evaluation requires RUN_PROBE_EVAL=1, a key, explicit ANTHROPIC_MODEL, and --max-calls 1..400');
  const fixtureRoot = path.resolve('tests/fixtures/probe-evaluation');
  const cases = JSON.parse(await readFile(path.join(fixtureRoot, 'cases.json'), 'utf8')) as Array<{ id: string; topic: string; modality: string; split: string; questionText: string; files: Array<{ path: string; mimeType: MimeType }> }>;
  const output = path.resolve(value('--out', `artifacts/pilot/probes-${Date.now()}.jsonl`));
  await mkdir(path.dirname(output), { recursive: true });
  // Exclusive creation prevents accidentally mixing experiments or overwriting observations.
  await appendFile(output, '', { flag: 'wx' });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  let calls = 0;
  for (const item of cases.slice(0, limit)) for (let run = 1; run <= runs; run++) {
    const variants = variant === 'both' ? (run % 2 ? ['baseline', 'candidate'] : ['candidate', 'baseline']) : [variant];
    for (const currentVariant of variants) {
      const usage: unknown[] = [];
      const provider = live ? new AnthropicAnalysisProvider({
        maxRetries: 0,
        beforeRequest: () => { if (calls >= cap) throw new Error('Evaluation request cap reached'); calls++; },
        onUsage: record => usage.push(record),
        ...(currentVariant === 'baseline' ? { analysisPrompt: ANALYSIS_SYSTEM_PROMPT, pairPrompt: PROBE_PAIR_SYSTEM_PROMPT } : {}),
      }) : new MockAnalysisProvider();
      const files = await Promise.all(item.files.map(async file => ({ fileName: path.basename(file.path), mimeType: file.mimeType, bytes: await readFile(path.join(fixtureRoot, file.path)) })));
      if (live && item.modality !== 'typed' && !files.length) throw new Error(`Missing source fixture for ${item.id}`);
      const input = { grade: 9, questionText: files.length ? '' : item.questionText, files };
      const inputHash = createHash('sha256').update(JSON.stringify([input.questionText, ...files.map(f => createHash('sha256').update(f.bytes).digest('hex'))])).digest('hex');
      const started = performance.now();
      const pairs: unknown[] = [];
      let analysis: unknown = null; let analysisVerdict: unknown = null; let failure: string | null = null;
      try {
        const candidate = await provider.analyzeQuestion(input); analysis = candidate;
        const errors = validateAnalysisStructure(candidate);
        if (errors.length) throw new Error(errors.join('; '));
        const verdict = await provider.reviewAnalysis(input, candidate); analysisVerdict = verdict;
        if (!reviewApproved(verdict)) throw new Error('Initial quality gate rejected content');
        pairs.push({ stepIndex: 0, pair: candidate.firstPair, verdict, humanRating: null });
        for (let stepIndex = 1; stepIndex < candidate.probePlan.length; stepIndex++) {
          const pairInput = { grade: 9, parsedQuestionMarkdown: candidate.parsedQuestionMarkdown, plan: candidate.probePlan, stepIndex };
          const pair = await provider.generateProbePair(pairInput);
          const issues = validateProbePair(pair);
          if (issues.length) throw new Error(issues.join('; '));
          const pairVerdict = await provider.reviewProbePair(pairInput, pair);
          pairs.push({ stepIndex, pair, verdict: pairVerdict, humanRating: null });
          if (!reviewApproved(pairVerdict)) throw new Error('Deferred quality gate rejected content');
        }
      } catch (error) { failure = error instanceof Error ? error.message : 'Unknown evaluation failure'; }
      await appendFile(output, JSON.stringify({ commit, maxCalls: cap, maxRetries: 0, caseId: item.id, split: item.split, modality: item.modality, run, variant: currentVariant,
        mode: live ? 'live' : 'mock-plumbing-only', model: live ? process.env.ANTHROPIC_MODEL : 'mock-provider',
        promptVersion: currentVariant === 'baseline' ? ['analysis-v2', 'probe-pair-v2'] : [ANALYSIS_PROMPT_VERSION, PROBE_PROMPT_VERSION],
        inputHash, elapsedMs: performance.now() - started, callsSoFar: calls, usage, failure, analysis, analysisVerdict, pairs,
        humanReview: 'pending', qualityClaim: null }) + '\n');
      if (live && calls >= cap) { console.log(`Stopped at request cap (${calls}). Results: ${output}`); return; }
    }
  }
  console.log(`Evaluation recorded (${live ? 'live, human ratings pending' : 'mock plumbing only'}): ${output}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Evaluation failed'); process.exitCode = 1; });
