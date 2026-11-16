import { getStatus } from "@/lib/status";

export const metadata = { title: "מצב מערכת · Nadlan" };

// Always check live, never at build time.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const { checks, checkedAt } = await getStatus();
  return (
    <section>
      <h1 className="text-2xl font-semibold">מצב מערכת</h1>
      <p className="mt-2 text-sm text-muted">נבדק ב-{new Date(checkedAt).toLocaleString("he-IL")}</p>
      <table className="mt-6 w-full max-w-xl text-sm">
        <tbody>
          {checks.map((check) => (
            <tr key={check.name} className="border-b border-border">
              <td className="py-2 font-medium">{check.name}</td>
              <td className="py-2" data-ok={check.ok}>
                <span className={check.ok ? "text-green-700" : "text-red-700"}>{check.ok ? "תקין" : "לא תקין"}</span>
              </td>
              <td className="py-2 text-muted">{check.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
