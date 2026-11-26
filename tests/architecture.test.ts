import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function lintImports(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter(message => message.severity === 2);
}

describe('module boundaries', () => {
  it.each([
    ['src/components/brief/Example.tsx', "export { getStores } from '@/server/storage';"],
    ['src/client/example.ts', "void import('../server/ai');"],
    ['src/contracts/example.ts', "export type { CurrentWorkspace } from '../server/workspace/schema';"],
    ['src/app/workspace/page.tsx', "'use client'; import '@/server/storage';"],
    ['src/components/shared/example.ts', "import 'node:fs/promises';"],
    ['src/client/example.ts', "void import('@anthropic-ai/sdk');"],
    ['src/server/profile/example.ts', "import '@anthropic-ai/sdk';"],
    ['src/server/sessions/example.ts', "import { readFile } from 'node:fs/promises'; void readFile;"],
    ['src/components/brief/Example.tsx', "export type State = import('@/server/workspace/schema').CurrentWorkspace;"],
    ['src/components/workspace/Example.tsx', "void import(`../../server/storage`);"],
    ['src/server/profile/example.ts', "import '../../client/profile';"],
    ['src/app/api/profile/route.ts', "import '@/server/storage';"],
    ['src/app/api/analyze/route.ts', "import '@/server/ai';"],
    ['src/server/workspace/example.ts', "import '../storage/local-workspace-store';"],
    ['src/components/shared/example.ts', "import '../workspace/flow';"],
  ])('%s rejects %s', async (path, source) => {
    const errors = await lintImports(path, source);
    expect(errors.map(error => error.ruleId)).toContainEqual(expect.stringMatching(/^(import\/|no-restricted-(syntax|imports)$)/));
  });

  it.each([
    ['src/app/workspace/page.tsx', "export { default } from '@/components/workspace/WorkspaceScreen';"],
    ['src/components/profile/Example.tsx', "import '@/client/profile';"],
    ['src/client/example.ts', "export type { PublicWorkspace } from '@/contracts/workspace';"],
    ['src/app/api/profile/route.ts', "import '@/server/profile/service';"],
    ['src/server/workspace/example.ts', "import '@/server/storage';"],
    ['src/server/storage/index.ts', "import './local-workspace-store';"],
  ])('%s allows %s', async (path, source) => {
    expect(await lintImports(path, source)).toEqual([]);
  });
});
