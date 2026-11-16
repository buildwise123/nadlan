/**
 * Dashboard mockup view. Pure presentation over demo data, so it can be shown
 * both inside the app (behind login) and, later, on a public demo page.
 */
import {
  byId,
  DATA_AS_OF,
  newThisWeek,
  PRICE_CHANGES,
  PROPERTIES,
  SOURCE_RUNS,
  stageCounts,
  topByCoc,
  active,
} from "./mock-data";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const signedUsd = (n: number) => `${n < 0 ? "−" : ""}${usd(Math.abs(n))}`;

const TYPE_LABEL: Record<string, string> = {
  "Single Family": "צמוד קרקע",
  Duplex: "דופלקס",
  Triplex: "3 יחידות",
  Fourplex: "4 יחידות",
};

const STATUS_STYLE = {
  Success: { label: "הצליח", className: "text-green-700 dark:text-green-400" },
  Partial: { label: "חלקי", className: "text-amber-700 dark:text-amber-400" },
  Failed: { label: "נכשל", className: "text-red-700 dark:text-red-400" },
};

function Num({ children, negative = false }: { children: React.ReactNode; negative?: boolean }) {
  return (
    <span dir="ltr" className={`tabular-nums ${negative ? "text-red-700 dark:text-red-400" : ""}`}>
      {children}
    </span>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border p-4 ${className}`}>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function DashboardView() {
  const stages = stageCounts();
  const maxStage = Math.max(...stages.map((s) => s.count));
  const fresh = newThisWeek();
  const top = topByCoc(10);
  const drops = PRICE_CHANGES.filter((c) => c.newPrice < c.oldPrice);
  const kpis = [
    { label: "נכסים במעקב", value: active().length },
    { label: "חדשים השבוע", value: fresh.length },
    { label: "ירידות מחיר השבוע", value: drops.length },
    { label: "בשלב הצעה", value: PROPERTIES.filter((p) => p.stage === "Offer").length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          תמונת מצב · נתונים נכון ל-<Num>{DATA_AS_OF}</Num>
        </p>
      </div>

      <p
        role="note"
        className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
      >
        תצוגת דמה: כל הכתובות, המחירים, שכר הדירה והחישובים בעמוד הזה מומצאים, להתרשמות מהמסך בלבד.
      </p>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="מדדים עיקריים">
        {kpis.map((kpi) => (
          <li key={kpi.label} className="rounded-lg border border-border p-4">
            <div className="text-sm text-muted">{kpi.label}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{kpi.value}</div>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="נכסים לפי שלב">
          <ul className="flex flex-col gap-2 text-sm">
            {stages.map((s) => (
              <li key={s.stage} className="flex items-center gap-2">
                <span className="w-14 shrink-0">{s.label}</span>
                <span className="h-3 rounded-sm bg-accent/70" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                <span className="tabular-nums text-muted">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="שינויי מחיר אחרונים">
          <ul className="flex flex-col gap-2 text-sm">
            {PRICE_CHANGES.map((c) => {
              const p = byId(c.propertyId);
              const down = c.newPrice < c.oldPrice;
              return (
                <li key={c.propertyId + c.date} className="flex flex-col">
                  <span className="font-medium" dir="ltr">
                    {p.address}
                  </span>
                  <span className="text-muted">
                    <Num>{usd(c.oldPrice)}</Num> ← <Num>{usd(c.newPrice)}</Num>{" "}
                    <span className={down ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                      ({down ? "ירידה" : "עלייה"})
                    </span>{" "}
                    · <Num>{c.date}</Num>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="נכסים חדשים (7 ימים)">
          <ul className="flex flex-col gap-2 text-sm">
            {fresh.map((p) => (
              <li key={p.id} className="flex flex-col">
                <span className="font-medium" dir="ltr">
                  {p.address}
                </span>
                <span className="text-muted">
                  {p.neighborhood} · {TYPE_LABEL[p.type]} · <Num>{usd(p.price)}</Num> · לפני {p.daysListed} ימים
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="10 הנכסים המובילים לפי Cash-on-Cash (תרחיש בסיס)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted">
              <tr className="border-b border-border text-start">
                <th className="py-2 text-start font-normal">כתובת</th>
                <th className="py-2 text-start font-normal">שכונה</th>
                <th className="py-2 text-start font-normal">סוג</th>
                <th className="py-2 text-start font-normal">מחיר</th>
                <th className="py-2 text-start font-normal">Cap Rate</th>
                <th className="py-2 text-start font-normal">CoC</th>
                <th className="py-2 text-start font-normal">תזרים חודשי</th>
                <th className="py-2 text-start font-normal">סיכון</th>
              </tr>
            </thead>
            <tbody>
              {top.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium" dir="ltr">
                    {p.address}
                  </td>
                  <td className="py-2">{p.neighborhood}</td>
                  <td className="py-2">{TYPE_LABEL[p.type]}</td>
                  <td className="py-2">
                    <Num>{usd(p.price)}</Num>
                  </td>
                  <td className="py-2">
                    <Num>{pct(p.capRate)}</Num>
                  </td>
                  <td className="py-2">
                    <Num negative={p.coc < 0}>{pct(p.coc)}</Num>
                  </td>
                  <td className="py-2">
                    <Num negative={p.cashFlowMonthly < 0}>{signedUsd(p.cashFlowMonthly)}</Num>
                  </td>
                  <td className="py-2 tabular-nums">{p.risk}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="מצב מקורות הנתונים">
        <table className="w-full text-sm">
          <tbody>
            {SOURCE_RUNS.map((run) => (
              <tr key={run.source} className="border-b border-border last:border-0">
                <td className="py-2 font-medium">{run.source}</td>
                <td className={`py-2 ${STATUS_STYLE[run.status].className}`}>{STATUS_STYLE[run.status].label}</td>
                <td className="py-2 text-muted">
                  <Num>{run.finishedAt}</Num>
                </td>
                <td className="py-2 text-muted">{run.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
