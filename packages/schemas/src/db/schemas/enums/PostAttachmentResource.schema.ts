import * as z from 'zod';

export const PostAttachmentResourceSchema = z.enum(['game', 'pack', 'topic'])

export type PostAttachmentResource = z.infer<typeof PostAttachmentResourceSchema>;