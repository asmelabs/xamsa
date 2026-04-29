import * as z from 'zod';
import { FollowStatusSchema } from '../enums/FollowStatus.schema';

export const UserFollowSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  status: FollowStatusSchema.default("accepted"),
  followerId: z.string(),
  followingId: z.string(),
});

export type UserFollowType = z.infer<typeof UserFollowSchema>;
