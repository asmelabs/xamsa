import * as z from 'zod';

export const LeaveReasonSchema = z.enum(['voluntary', 'kicked'])

export type LeaveReason = z.infer<typeof LeaveReasonSchema>;