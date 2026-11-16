/**
 * Exports the dashboard mockup as a static page for GitHub Pages.
 *
 *   npm run demo:export   -> demo-site/index.html + demo-site/styles.css
 *
 * Demo data only: the page renders the same DashboardView as the app, from
 * mock-data.ts. No login, no Airtable, no secrets, no links into the real app.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardView } from "../src/app/(app)/dashboard/dashboard-view";

export function renderDemoHtml(): string {
  const body = renderToStaticMarkup(
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">Nadlan · Milwaukee</span>
          <span className="text-sm text-muted">עמוד דמה סטטי</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <DashboardView />
      </main>
    </>,
  );

  return `<!doctype html>
<html lang="he" dir="rtl" class="h-full antialiased">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Nadlan · Milwaukee – דשבורד דמה</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600&display=swap">
<style>:root { --font-rubik: "Rubik"; }</style>
<link rel="stylesheet" href="styles.css">
</head>
<body class="min-h-full flex flex-col">
${body}
</body>
</html>
`;
}

// Run only when executed directly (not when imported by tests).
if (process.argv[1]?.endsWith("export-demo.tsx")) {
  const out = join(process.cwd(), "demo-site");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), renderDemoHtml());
  writeFileSync(join(out, ".nojekyll"), "");
  console.log("Wrote demo-site/index.html (styles are built separately by Tailwind CLI).");
}
