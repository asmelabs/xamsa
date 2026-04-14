import * as z from "zod";

export const RoleSchema = z.enum(["user", "moderator", "admin"]);

export type Role = z.infer<typeof RoleSchema>;
