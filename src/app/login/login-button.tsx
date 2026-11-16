"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const ERRORS: Record<string, string> = {
  AccessDenied: "חשבון ה-GitHub הזה לא מורשה להיכנס למערכת.",
  Configuration: "הגדרות ההתחברות חסרות. בדוק את קובץ ההגדרות.",
};

export function LoginButton() {
  const params = useSearchParams();
  const error = params.get("error");
  const raw = params.get("callbackUrl") ?? "/";
  // Only same-site paths, never an external URL.
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  return (
    <div className="mt-8 flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {ERRORS[error] ?? "ההתחברות נכשלה. נסה שוב."}
        </p>
      )}
      <button
        type="button"
        onClick={() => signIn("github", { callbackUrl })}
        className="rounded-md bg-foreground px-4 py-2 text-background hover:opacity-90"
      >
        התחבר עם GitHub
      </button>
    </div>
  );
}
