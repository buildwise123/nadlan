/**
 * Pure access rules, shared by the login callbacks and the proxy.
 * No Next.js or network imports here, so they are easy to unit test.
 */

export function isAllowedUser(githubId: string | undefined | null, allowedId: string): boolean {
  return typeof githubId === "string" && githubId.length > 0 && githubId === allowedId;
}

/** Paths reachable without a session. Everything else requires login. */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"];

export function isPublicPath(pathname: string): boolean {
  // Exact segment match only: "/login" and "/login/..." are public, "/loginx" is not.
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export type ProxyDecision =
  | { type: "next" }
  | { type: "redirect"; location: string }
  | { type: "unauthorized" };

/**
 * What the proxy does with a request.
 * - Public paths pass through.
 * - API paths without a valid session get 401 (no redirect, so scripts see a clear error).
 * - Pages without a valid session redirect to /login and come back afterwards.
 */
export function decide(
  pathname: string,
  search: string,
  tokenGithubId: string | undefined | null,
  allowedId: string,
): ProxyDecision {
  if (isPublicPath(pathname)) return { type: "next" };
  if (isAllowedUser(tokenGithubId, allowedId)) return { type: "next" };
  if (pathname.startsWith("/api/")) return { type: "unauthorized" };
  const callbackUrl = encodeURIComponent(pathname + search);
  return { type: "redirect", location: `/login?callbackUrl=${callbackUrl}` };
}
