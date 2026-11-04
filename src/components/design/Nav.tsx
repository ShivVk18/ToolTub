'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { goto, ripple, addLoop, clamp } from '@/lib/animation';

interface NavProps {
  onOpenSearch?: () => void;
  onOpenPro?: () => void;
  isHome?: boolean;
}

export function Nav({ onOpenSearch, onOpenPro, isHome = true }: NavProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('theme') || localStorage.getItem('kk.theme');
      const isDarkTheme =
        storedTheme === 'dark' ||
        storedTheme === '"dark"' ||
        (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkTheme);
    } catch {}
  }, []);

  // Track scroll progress and capsule morph
  useEffect(() => {
    const progEl = document.getElementById('prog');
    const cleanup = addLoop(() => {
      const scrollY = window.scrollY;
      const sc = scrollY > 60;
      if (sc !== document.body.classList.contains('scrolled')) {
        document.body.classList.toggle('scrolled', sc);
      }
      if (progEl) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        progEl.style.transform = `scaleX(${h > 0 ? clamp(scrollY / h, 0, 1) : 0})`;
      }
    });
    return cleanup;
  }, []);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    ripple(rect.left + 22, rect.top + 22, 80);

    const next = !isDark;
    setIsDark(next);
    const themeStr = next ? 'dark' : 'light';

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

  const handleNavClick = (sectionId: string) => {
    if (isHome) {
      goto(sectionId);
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <>
      <div id="prog" aria-hidden="true" />
      <header id="nav" className="fixed top-0 left-0 right-0 z-40 flex justify-center px-[clamp(16px,3vw,48px)] pointer-events-none">
        <div className="navin pointer-events-auto flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="brand flex items-center gap-[12px] h-[44px] min-h-[44px] flex-none font-semibold text-[22px] tracking-[-0.3px] text-ink no-underline select-none pl-2"
          >
            <div className="mark relative w-[38px] h-[38px] rounded-[12px] bg-ink text-bg grid place-items-center font-serif italic font-semibold text-[23px]">
              k
              <span
                className="absolute w-[8px] h-[8px] rounded-full right-[6px] top-[6px]"
                style={{
                  background: 'linear-gradient(135deg, #A99BFF, #FF9C82)',
                }}
              />
            </div>
            KlipKit
          </Link>

          {/* Links */}
          <nav
            aria-label="Main"
            className="links hidden min-[1100px]:flex gap-[32px] text-[16px] text-muted ml-[28px]"
          >
            <button
              type="button"
              onClick={() => handleNavClick('explore')}
              className="text-inherit hover:text-ink cursor-pointer transition-colors"
            >
              Tools
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('feel')}
              className="text-inherit hover:text-ink cursor-pointer transition-colors"
            >
              Why KlipKit
            </button>
            <button
              type="button"
              onClick={() => (onOpenPro ? onOpenPro() : handleNavClick('pricing'))}
              className="text-inherit hover:text-ink cursor-pointer transition-colors"
            >
              Pro
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('pricing')}
              className="text-inherit hover:text-ink cursor-pointer transition-colors"
            >
              Pricing
            </button>
          </nav>

          {/* Actions */}
          <div className="navr flex items-center gap-[10px] flex-none">
            <button
              id="kbtn"
              type="button"
              data-mag
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                window.dispatchEvent(new Event('klipkit:search'));
              }}
              aria-label="Search tools — What do you need to do? Try “shrink pdf”"
              className="kbtn flex items-center gap-[12px] h-[44px] min-h-[44px] flex-none px-[16px] max-[1100px]:px-[12px] rounded-full bg-panel border border-line text-muted text-[15px] backdrop-blur-[12px] min-w-[250px] max-[1100px]:min-w-0 transition-transform active:scale-[0.98] cursor-pointer"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span className="max-[1100px]:hidden">Search 76 tools…</span>
              <kbd className="ml-auto font-sans font-medium text-[12px] px-[8px] py-[4px] rounded-[8px] border border-line2 text-ink2 bg-soft">
                ⌘K
              </kbd>
            </button>

            <button
              id="theme"
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="icon-btn w-[44px] h-[44px] min-w-[44px] min-h-[44px] flex-none rounded-full grid place-items-center bg-panel border border-line text-ink backdrop-blur-[12px] transition-transform active:scale-[0.96]"
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

            <button
              type="button"
              className="pill hidden min-[640px]:inline-flex items-center gap-[8px] h-[44px] px-[20px] rounded-full text-[15px] font-medium border border-line2 bg-panel text-ink transition-transform active:scale-[0.96]"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const toastEl = document.getElementById('toast');
                  if (toastEl) {
                    toastEl.textContent = 'No account needed — KlipKit is free forever!';
                    toastEl.classList.add('show');
                    setTimeout(() => toastEl.classList.remove('show'), 2600);
                  }
                }
              }}
            >
              Log in
            </button>

            <button
              type="button"
              data-mag
              className="pill ink inline-flex items-center gap-[8px] h-[44px] px-[20px] rounded-full text-[15px] font-medium bg-ink text-bg border border-ink transition-transform active:scale-[0.96]"
              onClick={() => (onOpenPro ? onOpenPro() : handleNavClick('pricing'))}
            >
              Go Pro
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
