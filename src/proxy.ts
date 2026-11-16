import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { decide } from "@/lib/auth-rules";

/**
 * Route protection (Next.js 16 "proxy", formerly middleware).
 * Optimistic check on the session cookie; Route Handlers re-check with getSession().
 * Fails closed: if the auth settings are missing, nothing private is served.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET;
  const allowedId = process.env.ALLOWED_GITHUB_USER_ID ?? "";

  let githubId: string | undefined;
  if (secret && allowedId) {
    const token = await getToken({ req: request, secret });
    githubId = typeof token?.githubId === "string" ? token.githubId : undefined;
  }

  const decision = decide(pathname, search, githubId, allowedId);
  if (decision.type === "next") return NextResponse.next();
  if (decision.type === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL(decision.location, request.url));
}

export const config = {
  // Everything except Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
