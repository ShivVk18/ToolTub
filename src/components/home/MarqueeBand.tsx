"use client";

import React, { useEffect, useRef } from "react";
import { addLoop } from "@/lib/motion/animation";

const R1 = [
  "Compress a PDF",
  "Decode a JWT",
  "Remove a background",
  "Format JSON",
  "Transcribe a call",
  "Make a GIF",
  "Split pages",
  "HEIC to JPG",
  "Test a regex",
];

const R2 = ["No sign-up", "No uploads", "No pop-ups", "No waiting", "Just say it", "Done in seconds", "Free forever"];

export function MarqueeBand() {
  const bandRef = useRef<HTMLElement>(null);
  const br1Ref = useRef<HTMLDivElement>(null);
  const br2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let w1 = 0;
    let w2 = 0;

    const cleanup = addLoop((t) => {
      if (!bandRef.current || !br1Ref.current || !br2Ref.current) return;
      const r = bandRef.current.getBoundingClientRect();
      const innerHeight = typeof window !== "undefined" ? window.innerHeight : 800;
      if (r.bottom < 0 || r.top > innerHeight) return;

      if (!w1 || !w2) {
        w1 = br1Ref.current.scrollWidth / 3;
        w2 = br2Ref.current.scrollWidth / 3;
      }
      if (!w1 || !w2) return;

      const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
      const k = t * 42 + scrollY * 0.35;

      br1Ref.current.style.transform = `translateX(${-(k % w1)}px)`;
      br2Ref.current.style.transform = `translateX(${((k * 0.8) % w2) - w2}px)`;
    });

    return cleanup;
  }, []);

  const renderRow = (items: string[]) => (
    <>
      {Array.from({ length: 3 }).flatMap((_, loopIdx) =>
        items.map((item, i) => (
          <React.Fragment key={`${loopIdx}-${i}`}>
            <span>{item}</span>
            <b>✦</b>
          </React.Fragment>
        )),
      )}
    </>
  );

  return (
    <section ref={bandRef} className="band" aria-hidden="true">
      <div ref={br1Ref} id="br1" className="brow">
        {renderRow(R1)}
      </div>
      <div ref={br2Ref} id="br2" className="brow out">
        {renderRow(R2)}
      </div>
    </section>
  );
}
