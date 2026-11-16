import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { authEnv } from "./env";
import { logger } from "./logger";
import { isAllowedUser } from "./auth-rules";

/**
 * Single-user login with GitHub (next-auth v4).
 * Only the GitHub account whose numeric id equals ALLOWED_GITHUB_USER_ID may sign in.
 * Built lazily so a build without secrets does not fail.
 */
export function getAuthOptions(): NextAuthOptions {
  const env = authEnv();
  return {
    secret: env.NEXTAUTH_SECRET,
    session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
    providers: [
      GitHubProvider({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
      }),
    ],
    pages: { signIn: "/login", error: "/login" },
    callbacks: {
      async signIn({ account, profile }) {
        const githubId = account?.provider === "github" ? account.providerAccountId : undefined;
        const allowed = isAllowedUser(githubId, env.ALLOWED_GITHUB_USER_ID);
        if (!allowed) {
          logger.warn({ provider: account?.provider, login: (profile as { login?: string })?.login }, "sign-in rejected");
        }
        return allowed;
      },
      async jwt({ token, account }) {
        if (account?.provider === "github") {
          token.githubId = account.providerAccountId;
        }
        return token;
      },
      async session({ session, token }) {
        return { ...session, githubId: token.githubId as string | undefined };
      },
    },
  };
}

/** For Route Handlers and Server Components: the current session, or null. */
export async function getSession() {
  const session = await getServerSession(getAuthOptions());
  const githubId = (session as { githubId?: string } | null)?.githubId;
  if (!session || !isAllowedUser(githubId, authEnv().ALLOWED_GITHUB_USER_ID)) {
    return null;
  }
  return session;
}
