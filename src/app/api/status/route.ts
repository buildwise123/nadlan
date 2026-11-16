import { getSession } from "@/lib/auth";
import { getStatus } from "@/lib/status";

// Protected twice: by the proxy, and here (defense in depth).
export async function GET() {
  const session = await getSession().catch(() => null);
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await getStatus());
}
