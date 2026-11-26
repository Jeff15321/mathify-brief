import { ESLint } from 'eslint';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { PublicProbe } from '@/contracts/probes';
import type { PublicWorkspace, QuestionAnalysisPublic } from '@/contracts/workspace';
import type { CurrentWorkspace, PrivateProbe, QuestionAnalysisStored } from '@/server/workspace/schema';

const eslint = new ESLint();
const restrictedPath = 'import/no-restricted-paths';
const restrictedSyntax = 'no-restricted-syntax';

async function lintImports(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter(message => message.severity === 2);
}

describe('module boundaries', () => {
  it.each([
    ['src/components/brief/Example.tsx', "export { getStores } from '@/server/storage';", restrictedPath],
    ['src/client/example.ts', "void import('../server/ai');", restrictedPath],
    ['src/contracts/example.ts', "export type { CurrentWorkspace } from '../server/workspace/schema';", restrictedPath],
    ['src/app/workspace/page.tsx', "'use client'; import '@/server/storage';", restrictedPath],
    ['src/components/shared/example.ts', "import 'node:fs/promises';", 'import/no-nodejs-modules'],
    ['src/client/example.ts', "void import('@anthropic-ai/sdk');", restrictedPath],
    ['src/server/profile/example.ts', "import '@anthropic-ai/sdk';", restrictedPath],
    ['src/server/sessions/example.ts', "import { readFile } from 'node:fs/promises'; void readFile;", restrictedSyntax],
    ['src/components/brief/Example.tsx', "export type State = import('@/server/workspace/schema').CurrentWorkspace;", restrictedSyntax],
    ['src/components/workspace/Example.tsx', "void import(`../../server/storage`);", restrictedSyntax],
    ['src/server/profile/example.ts', "import '../../client/profile';", restrictedPath],
    ['src/app/api/profile/route.ts', "import '@/server/storage';", restrictedPath],
    ['src/app/api/analyze/route.ts', "import '@/server/ai';", restrictedPath],
    ['src/server/workspace/example.ts', "import '../storage/local-workspace-store';", restrictedPath],
    ['src/components/shared/example.ts', "import '../workspace/flow';", restrictedPath],
    ['src/server/workspace/example.ts', "import '../brief/service';", restrictedPath],
    ['src/server/workspace/example.ts', "import '@/server/sessions/service';", restrictedPath],
    ['src/server/storage/example.ts', "import '@/server/workspace/service';", restrictedPath],
    ['src/server/ai/example.ts', "import '../workspace/probe-flow';", restrictedPath],
    ['src/server/ai/example.ts', "import '@/server/profile/service';", restrictedPath],
    ['src/app/api/probes/answer/route.ts', "import '@/server/workspace/schema';", restrictedPath],
  ])('%s rejects %s with %s', async (path, source, ruleId) => {
    const errors = await lintImports(path, source);
    expect(errors.map(error => error.ruleId)).toContain(ruleId);
  });

  it.each([
    ['src/app/workspace/page.tsx', "export { default } from '@/components/workspace/WorkspaceScreen';"],
    ['src/components/profile/Example.tsx', "import '@/client/profile';"],
    ['src/client/example.ts', "export type { PublicWorkspace } from '@/contracts/workspace';"],
    ['src/app/api/profile/route.ts', "import '@/server/profile/service';"],
    ['src/server/workspace/example.ts', "import '@/server/storage';"],
    ['src/app/api/probes/answer/route.ts', "import '@/schemas/probes';"],
    ['src/server/brief/example.ts', "import '@/server/workspace/probe-flow';"],
    ['src/server/workspace/example.ts', "import '@/server/profile/learner-context';"],
    ['src/server/ai/example.ts', "import type { QuestionAnalysisStored } from '@/server/workspace/schema';"],
    ['src/server/storage/example.ts', "import { currentWorkspaceSchema } from '@/server/workspace/schema'; void currentWorkspaceSchema;"],
    ['src/server/storage/index.ts', "import './local-workspace-store';"],
  ])('%s allows %s', async (path, source) => {
    expect(await lintImports(path, source)).toEqual([]);
  });
});

it('stored values returned whole have exactly the same fields as their public contracts', () => {
  expectTypeOf<CurrentWorkspace['demoProfile']>().toEqualTypeOf<PublicWorkspace['profile']>();
  expectTypeOf<CurrentWorkspace['attachments']>().toEqualTypeOf<PublicWorkspace['attachments']>();
  expectTypeOf<CurrentWorkspace['whiteboardAsset']>().toEqualTypeOf<PublicWorkspace['whiteboardAsset']>();
  expectTypeOf<CurrentWorkspace['brief']>().toEqualTypeOf<PublicWorkspace['brief']>();
  expectTypeOf<PrivateProbe['options']>().toEqualTypeOf<PublicProbe['options']>();
  expectTypeOf<QuestionAnalysisStored['breakdown']>().toEqualTypeOf<QuestionAnalysisPublic['breakdown']>();
});
