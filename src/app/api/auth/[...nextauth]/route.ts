import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { getAuthOptions } from "@/lib/auth";

// Options are built per request so a build without secrets does not fail.
async function handler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  return NextAuth(request, context, getAuthOptions());
}

export { handler as GET, handler as POST };
