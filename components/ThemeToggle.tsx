"use client";

import { useEffect, useState } from "react";

// Toggles [data-theme="dark"] on <html> and persists to localStorage.
// Matches the utility-bar toggle in the design references.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const el = document.documentElement;
    if (next) {
      el.setAttribute("data-theme", "dark");
      localStorage.setItem("mb-theme", "dark");
    } else {
      el.removeAttribute("data-theme");
      localStorage.setItem("mb-theme", "light");
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: "none",
        background: "transparent",
        color: "var(--text-3)",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: dark ? "var(--accent)" : "var(--amber)",
          transition: "background .2s ease",
        }}
      />
      {dark ? "Dark" : "Light"}
    </button>
  );
}
