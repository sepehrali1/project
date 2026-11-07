export type UserRole = "user" | "moderator" | "owner";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  verified: boolean;
  banned: boolean;
  created_at: string;
}

/** Response of the `login` Edge Function. */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: AuthUser;
}

/** Response of the `me` Edge Function. */
export interface MeResponse {
  user: AuthUser;
}

/** Response of the `register` Edge Function. */
export interface RegisterResponse {
  user: Pick<AuthUser, "id" | "email" | "username" | "role">;
  email_confirmation_required?: boolean;
}
