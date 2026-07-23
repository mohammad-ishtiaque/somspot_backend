export interface ApiResponse<T = unknown> {
  statusCode: number;
  success: boolean;
  message?: string | null;
  data?: T | null;
  activationToken?: string | null;
}
