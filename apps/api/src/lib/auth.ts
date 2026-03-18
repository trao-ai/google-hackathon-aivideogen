import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@atlas/db";

export const auth = betterAuth({
  basePath: "/api/auth",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
  },
  trustedOrigins: [process.env.CORS_ORIGIN ?? "http://localhost:3000"],
});
