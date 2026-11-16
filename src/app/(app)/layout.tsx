import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "./sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deals", label: "מאגר נכסים" },
  { href: "/analysis", label: "ניתוח נכס" },
  { href: "/compare", label: "השוואה" },
  { href: "/status", label: "מצב מערכת" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <nav aria-label="ניווט ראשי" className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3">
          <span className="font-semibold">Nadlan · Milwaukee</span>
          <ul className="flex flex-1 flex-wrap gap-4 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <SignOutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
