export type AppRole =
  | "USER"
  | "DRIVER"
  | "MERCHANT"
  | "CREATOR"
  | "ADMIN"
  | "SUPER_ADMIN";

export interface AuthUserPayload {
  authId: string;
  userId: string;
  email: string;
  role: AppRole;
  iat?: number;
  exp?: number;
}
