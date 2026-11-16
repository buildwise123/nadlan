import { Suspense } from "react";
import { LoginButton } from "./login-button";

export const metadata = { title: "התחברות · Nadlan" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Nadlan · Milwaukee</h1>
      <p className="mt-2 text-muted">המערכת פתוחה למשתמש אחד בלבד.</p>
      <Suspense>
        <LoginButton />
      </Suspense>
    </main>
  );
}
