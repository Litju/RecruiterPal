import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RecruiterPal",
    template: "%s · RecruiterPal",
  },
  description:
    "The agent-driven workspace for evidence-based recruiting. Automate the administrative work. Structure the judgment. Preserve the evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
