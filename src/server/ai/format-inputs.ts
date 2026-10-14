import type Anthropic from '@anthropic-ai/sdk';
import type { MimeType } from '@/types/domain';

export interface StoredFileInput {
  fileName: string;
  mimeType: MimeType;
  bytes: Buffer;
}

type ContentBlock = Anthropic.Messages.ContentBlockParam;

/**
 * Maps stored files to Claude image/document content blocks, in upload order
 * (IMPLEMENTATION_PLAN.md Section 6.1). Images become `image` blocks, PDFs become
 * `document` blocks; bytes are sent as base64, never filenames/paths.
 */
export function filesToContentBlocks(files: StoredFileInput[]): ContentBlock[] {
  return files.map((file): ContentBlock => {
    if (file.mimeType === 'application/pdf') {
      return {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: file.bytes.toString('base64'),
        },
      };
    }
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: file.mimeType,
        data: file.bytes.toString('base64'),
      },
    };
  });
}
