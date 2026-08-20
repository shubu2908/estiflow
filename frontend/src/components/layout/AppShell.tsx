import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Calculator } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Calculator className="h-5 w-5" />
            Automation Estimation Tool
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-6">{children}</main>
    </div>
  );
}
