import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

// Rubik covers Hebrew and Latin, so mixed text (Hebrew + NOI, Cap Rate) renders evenly.
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "Nadlan · Milwaukee",
  description: "ניתוח עסקאות נדל\"ן למגורים במילווקי",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
