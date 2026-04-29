"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "night" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("night");

  useEffect(() => {
    const saved = window.localStorage.getItem("vidchain-theme") as ThemeMode | null;
    const initial = saved === "light" ? "light" : "night";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function updateTheme(nextTheme: ThemeMode) {
    if (nextTheme === theme) return;

    const applyTheme = () => {
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem("vidchain-theme", nextTheme);
    };

    if (document.startViewTransition) {
      document.startViewTransition(applyTheme);
      return;
    }

    applyTheme();
  }

  return (
    <button
      aria-label={theme === "night" ? "Switch to light mode" : "Switch to night mode"}
      className="group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[var(--app-line)] bg-[var(--app-panel)] text-[var(--app-fg)] shadow-lg shadow-black/10 transition duration-300 hover:scale-105 hover:bg-[var(--app-panel-strong)]"
      type="button"
      onClick={() => updateTheme(theme === "night" ? "light" : "night")}
    >
      <span className="absolute inset-0 scale-0 rounded-full bg-[var(--app-fg)] opacity-10 transition-transform duration-300 group-hover:scale-100" />
      <span className="relative transition duration-300 group-active:rotate-45">
        {theme === "night" ? <Moon size={17} /> : <Sun size={17} />}
      </span>
    </button>
  );
}
