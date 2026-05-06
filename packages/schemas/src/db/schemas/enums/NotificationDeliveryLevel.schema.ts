import * as z from 'zod';

export const NotificationDeliveryLevelSchema = z.enum(['all', 'followers', 'none'])

export type NotificationDeliveryLevel = z.infer<typeof NotificationDeliveryLevelSchema>;