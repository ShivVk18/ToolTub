'use client';

import React, { useEffect, useState } from 'react';
import { ripple } from '@/lib/animation';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') || localStorage.getItem('kk.theme');
      const dark =
        stored === 'dark' ||
        stored === '"dark"' ||
        (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(dark);
    } catch {}
  }, []);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !isDark;
    setIsDark(next);
    const themeStr = next ? 'dark' : 'light';

    const r = e.currentTarget.getBoundingClientRect();
    const stage = document.getElementById('stage') || document.body;
    const sr = stage.getBoundingClientRect();
    ripple(r.left + 22 - sr.left, r.top + 22 - sr.top, 80);

    document.documentElement.classList.add('theming');
    document.documentElement.dataset.theme = themeStr;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try {
      localStorage.setItem('theme', themeStr);
      localStorage.setItem('kk.theme', JSON.stringify(themeStr));
    } catch {}

    setTimeout(() => {
      document.documentElement.classList.remove('theming');
    }, 800);
  };

  return (
    <button
      id="theme"
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="icon-btn w-[44px] h-[44px] rounded-full grid place-items-center bg-panel border border-line text-ink backdrop-blur-[12px] transition-transform active:scale-[0.96] cursor-pointer"
    >
      <svg
        id="ticon"
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}

/**
 * Inline, render-blocking theme script (prevents a light flash).
 * Sets data-theme="dark" and class "dark" before first paint.
 */
export const themeScript = `try{var t=localStorage.getItem("theme")||localStorage.getItem("kk.theme");if(t==="dark"||t==='"dark"'||(!t&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark")}else{document.documentElement.dataset.theme="light";document.documentElement.classList.remove("dark")}}catch(e){}`;
