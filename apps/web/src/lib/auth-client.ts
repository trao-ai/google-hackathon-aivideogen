import { createAuthClient } from "better-auth/react";

// NEXT_PUBLIC_API_URL includes /api (e.g. http://video.trao.ai/api)
// Better Auth client needs just the origin since it appends /api/auth/* itself
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const baseURL = apiUrl.replace(/\/api\/?$/, "") || apiUrl;

export const authClient: ReturnType<typeof createAuthClient> =
  createAuthClient({
    baseURL,
  });
