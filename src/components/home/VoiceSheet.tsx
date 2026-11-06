"use client";

import React, { useEffect } from "react";

interface VoiceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onTryVoiceDemo: () => void;
  onSeePlans: () => void;
}

export function VoiceSheet({ isOpen, onClose, onTryVoiceDemo, onSeePlans }: VoiceSheetProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      id="sheet"
      className={`fixed inset-0 z-70 grid place-items-center transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="bd absolute inset-0 bg-[rgba(14,12,20,0.35)] backdrop-blur-[8px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`sbox relative w-[min(520px,92vw)] rounded-[30px] bg-solid border border-line2 p-[36px] shadow-[0_50px_120px_-30px_rgba(0,0,0,0.5)] text-center transition-transform duration-450 ease-[cubic-bezier(.2,.9,.3,1.25)] ${
          isOpen ? "translate-y-0 scale-100" : "translate-y-[20px] scale-[0.96]"
        }`}
      >
        <div
          className="sorb av w-[84px] h-[84px] mx-auto rounded-full relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]"
          style={{
            background: "conic-gradient(from 200deg, #7C6BFF, #B38BFF, #FF9C82, #FFD27A, #8FE0BE, #6FB7FF, #7C6BFF)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), transparent 45%)",
            }}
          />
        </div>

        <h3 className="font-serif font-medium text-[40px] tracking-[-0.02em] mt-[18px] text-ink">
          Speak, and it's done.
        </h3>

        <p className="text-muted text-[17px] mt-[8px]">
          Voice commands are part of <b className="text-ink font-semibold">KlipKit Pro</b>. Your voice is turned into
          text on your device.
        </p>

        <ul className="list-none text-left my-[22px] mb-[26px] mx-auto w-max text-ink">
          <li className="py-[6px] text-[16px] flex items-center gap-[8px]">
            <span role="img" aria-label="microphone">
              🎙
            </span>{" "}
            “Compress this and send it as Word”
          </li>
          <li className="py-[6px] text-[16px] flex items-center gap-[8px]">
            <span role="img" aria-label="lightning">
              ⚡
            </span>{" "}
            Batch processing & bigger files
          </li>
          <li className="py-[6px] text-[16px] flex items-center gap-[8px]">
            <span role="img" aria-label="floppy disk">
              💾
            </span>{" "}
            Saved chains & history
          </li>
        </ul>

        <div className="sbtns flex gap-[10px] justify-center">
          <button
            id="tryVoice"
            type="button"
            onClick={onTryVoiceDemo}
            className="pill ink inline-flex items-center gap-[8px] h-[44px] px-[20px] rounded-full text-[15px] font-medium bg-ink text-bg border border-ink transition-transform active:scale-[0.96]"
          >
            Try a voice demo
          </button>
          <button
            id="seePlans"
            type="button"
            onClick={onSeePlans}
            className="pill inline-flex items-center gap-[8px] h-[44px] px-[20px] rounded-full text-[15px] font-medium border border-line2 bg-panel text-ink transition-transform active:scale-[0.96]"
          >
            ₹299 / month
          </button>
        </div>
      </div>
    </div>
  );
}
