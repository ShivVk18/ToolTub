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

  const handleLogin = () => {
    const toastEl = document.getElementById('toast');
    if (toastEl) {
      toastEl.textContent = 'No account needed — KlipKit is free forever!';
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 2600);
    }
  };

  return (
    <>
      <div id="prog" aria-hidden="true" />
      <header id="nav">
        <div className="navin">
          {/* Brand */}
          <Link
            href="/"
            className="brand"
            onClick={(e) => {
              if (isHome) {
                e.preventDefault();
                goto(0);
              }
            }}
          >
            <div className="mark">k</div>
            KlipKit
          </Link>

          {/* Links */}
          <nav aria-label="Main" className="links">
            <button
              type="button"
              onClick={() => handleNavClick('explore')}
            >
              Tools
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('feel')}
            >
              Why KlipKit
            </button>
            <button
              type="button"
              onClick={() => (onOpenPro ? onOpenPro() : handleNavClick('pricing'))}
            >
              Pro
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('pricing')}
            >
              Pricing
            </button>
          </nav>

          {/* Right Action Group */}
          <div className="navr">
            <button
              id="kbtn"
              type="button"
              data-mag
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                window.dispatchEvent(new Event('klipkit:search'));
              }}
              aria-label="Search 76 tools… (⌘K)"
              className="kbtn"
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
              <span>Search 76 tools…</span>
              <kbd>⌘K</kbd>
            </button>

            <button
              id="theme"
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="icon-btn"
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
              id="login"
              type="button"
              className="pill"
              onClick={handleLogin}
            >
              Log in
            </button>

            <button
              id="gopro"
              type="button"
              data-mag
              className="pill ink"
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
