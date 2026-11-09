import { z } from 'zod';
import { ApiError } from './errors';
import type { CurrentWorkspace } from '@/types/domain';
export function requestWorkspaceId(request: Request): string {
  const parsed = z.uuid().safeParse(request.headers.get('x-workspace-id'));
  if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'A workspace identity is required. Reload the page.');
  return parsed.data;
}
export function assertWorkspaceId(workspace: CurrentWorkspace | null, id?: string) {
  if (id !== undefined && workspace?.workspaceId !== id) {
    throw new ApiError(409, 'INVALID_STATE', 'The workspace changed in another tab. Reload to continue.');
  }
}
