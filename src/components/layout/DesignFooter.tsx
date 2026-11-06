import React from "react";
import Link from "next/link";

export function DesignFooter() {
  return (
    <footer className="relative z-[2] px-[clamp(20px,6vw,140px)] py-[40px] pb-[60px] flex items-center gap-[18px] text-ink2 text-[14px] border-t border-line flex-wrap">
      <Link
        href="/"
        className="brand flex items-center gap-[12px] font-semibold text-[17px] text-ink no-underline select-none mr-[6px]"
      >
        <div className="mark w-[30px] h-[30px] rounded-[9px] bg-ink text-bg grid place-items-center font-serif italic font-semibold text-[18px] relative">
          k
          <span
            className="absolute w-[6px] h-[6px] rounded-full right-[4px] top-[4px]"
            style={{
              background: "linear-gradient(135deg, #A99BFF, #FF9C82)",
            }}
          />
        </div>
        KlipKit
      </Link>

      <span>Drop anything. Done in seconds.</span>

      <div className="ml-auto flex items-center gap-[16px] flex-wrap max-sm:ml-0 max-sm:w-full max-sm:mt-[12px]">
        <span>© 2026 KlipKit</span>
        <Link href="/privacy" className="hover:text-ink transition-colors">
          Privacy
        </Link>
        <Link href="/about" className="hover:text-ink transition-colors">
          About
        </Link>
        <Link href="/licences" className="hover:text-ink transition-colors">
          Licences
        </Link>
        <a href="/llms.txt" className="hover:text-ink transition-colors">
          llms.txt
        </a>
      </div>
    </footer>
  );
}
