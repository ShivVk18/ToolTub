import React from "react";
import Link from "next/link";

export function DesignFooter() {
  return (
    <footer className="relative z-[2] px-[clamp(20px,6vw,140px)] py-[40px] pb-[60px] flex items-center gap-[18px] text-ink2 text-[14px] border-t border-line">
      <Link
        href="/"
        className="brand flex items-center gap-[12px] font-semibold text-ink no-underline select-none mr-[6px]"
        // Inline sizes as in the reference: the global .brand/.mark rules (nav size) would otherwise win.
        // .brand keeps a 44 px tap target; the negative margin lets it take the reference's 30 px of layout.
        style={{ fontSize: 17, marginBlock: -7 }}
      >
        <div
          className="mark bg-ink text-bg grid place-items-center font-serif italic font-semibold relative"
          style={{ width: 30, height: 30, fontSize: 18, borderRadius: 9 }}
        >
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

      {/* One "·"-separated line on the right, like the reference ("© 2026 KlipKit · Privacy · Terms"). */}
      <span className="ml-auto text-right">
        © 2026 KlipKit ·{" "}
        <Link href="/privacy" className="hover:text-ink transition-colors">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/about" className="hover:text-ink transition-colors">
          About
        </Link>{" "}
        ·{" "}
        <Link href="/licences" className="hover:text-ink transition-colors">
          Licences
        </Link>{" "}
        ·{" "}
        <a href="/llms.txt" className="hover:text-ink transition-colors">
          llms.txt
        </a>
      </span>
    </footer>
  );
}
