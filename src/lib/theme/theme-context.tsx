"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "trollfit:theme";

/**
 * Runs before first paint (injected into <head>) so the page never flashes the
 * wrong theme. Kept in sync with `applyTheme` below — this is the same logic,
 * inlined because the React tree hasn't mounted yet.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  // "system" removes the attribute entirely so the prefers-color-scheme
  // media queries in globals.css take over.
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

type ThemeContextValue = {
  theme: Theme;
  /** The theme actually on screen — "system" resolved against the OS. */
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "dark",
  setTheme: () => {},
});

function systemPrefersLight() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  );
}

/**
 * The theme already on the document. THEME_INIT_SCRIPT stamped it before
 * paint, so on the client this is the stored choice without touching
 * localStorage again; on the server there is no document, so it's "system".
 */
function initialTheme(): Theme {
  if (typeof document === "undefined") return "system";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers, not an effect: the DOM already holds the answer, so
  // reading it during the first render avoids a second render pass. <html>
  // carries suppressHydrationWarning for exactly this attribute mismatch.
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [systemLight, setSystemLight] = useState(systemPrefersLight);

  // Track OS changes so `resolved` stays accurate while in system mode.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session.
    }
  }, []);

  const resolved: "light" | "dark" =
    theme === "system" ? (systemLight ? "light" : "dark") : theme;

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
