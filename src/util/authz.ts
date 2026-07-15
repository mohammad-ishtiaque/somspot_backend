import { EnumUserRole } from "./enum";

// Central role helper — replaces the per-service duplicated isPrivileged().
export const isPrivileged = (role?: string): boolean =>
  role === EnumUserRole.ADMIN || role === EnumUserRole.SUPER_ADMIN;
