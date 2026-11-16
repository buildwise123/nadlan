// Public liveness check: reveals nothing beyond "the app is up".
export function GET() {
  return Response.json({ ok: true });
}
