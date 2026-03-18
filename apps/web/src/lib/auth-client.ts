import { createAuthClient } from "better-auth/react";

// Strip trailing /api from NEXT_PUBLIC_API_URL since Better Auth
// uses basePath "/api/auth" and appends it to baseURL automatically
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const baseURL = apiUrl.replace(/\/api\/?$/, "") || apiUrl;

export const authClient: ReturnType<typeof createAuthClient> =
  createAuthClient({
    baseURL,
  });
