"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/accounts/session-context";

type Tab = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
};

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

function TrainingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
    </svg>
  );
}

function LogIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CoachIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function YouIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  );
}

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/training", label: "Training", icon: TrainingIcon },
  { href: "/log", label: "Log", icon: LogIcon },
  { href: "/coach", label: "Coach", icon: CoachIcon },
  { href: "/you", label: "You", icon: YouIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, session } = useSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            trollrunner<span className="font-bold text-brand"> fitness</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {TABS.filter((t) => t.href !== "/log" && t.href !== "/you").map(
              (tab) => {
                const active = isActive(pathname, tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-raised font-semibold text-foreground"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              }
            )}
            <Link
              href="/learn"
              aria-current={isActive(pathname, "/learn") ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                isActive(pathname, "/learn")
                  ? "bg-raised font-semibold text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Learn
            </Link>
            <Link
              href="/you"
              aria-current={isActive(pathname, "/you") ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                isActive(pathname, "/you")
                  ? "bg-raised font-semibold text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {/* Signed in this rendered an empty string, leaving an invisible
                  link — the You tab existed but could not be seen or found. */}
              {status === "authed" && session ? session.username || "You" : "Sign in"}
            </Link>
            <Link
              href="/log"
              className="ml-2 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
            >
              Log activity
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:pb-12">
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-background/90 backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            if (tab.href === "/log") {
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label="Log activity"
                  className="flex items-center justify-center py-2"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand-soft">
                    <Icon className="h-5 w-5" />
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                  active ? "font-semibold text-brand" : "text-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
