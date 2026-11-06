"use client";

import React, { useEffect, useRef, useState } from "react";
import { TOOLS, CATS, tint, TOOL_ICON_PATHS, type ToolItem } from "@/lib/designTools";
import { addLoop, tween, ease } from "@/lib/motion/animation";

interface ExploreSectionProps {
  onSelectTool: (tool: ToolItem) => void;
}

export function ExploreSection({ onSelectTool }: ExploreSectionProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "p" | "d" | "c">("all");
  const [showAll, setShowAll] = useState(false);
  const [count, setCount] = useState(0);

  const tabsRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const countedRef = useRef(false);

  const categoriesList: Array<["all" | "p" | "d" | "c", string, number]> = [
    ["all", "All", TOOLS.length],
    ...Object.entries(CATS).map(
      ([k, v]) =>
        [k as "p" | "d" | "c", v.n, TOOLS.filter((t) => t.c === k).length] as ["all" | "p" | "d" | "c", string, number],
    ),
  ];

  const filteredTools = activeCategory === "all" ? TOOLS : TOOLS.filter((t) => t.c === activeCategory);
  const visibleTools = showAll ? filteredTools : filteredTools.slice(0, 12);

  const updateIndicator = () => {
    if (!tabsRef.current || !indRef.current) return;
    const activeTab = tabsRef.current.querySelector(".tab.on") as HTMLElement | null;
    if (activeTab) {
      indRef.current.style.left = `${activeTab.offsetLeft}px`;
      indRef.current.style.width = `${activeTab.offsetWidth}px`;
    }
  };

  useEffect(() => {
    updateIndicator();
    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeCategory]);

  // Scroll count-up animation
  useEffect(() => {
    const cleanup = addLoop(() => {
      if (countedRef.current || !countRef.current) return;
      const r = countRef.current.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.85) {
        countedRef.current = true;
        tween(
          1400,
          (p) => {
            setCount(Math.round(p * 76));
          },
          ease.out,
        );
      }
    });
    return cleanup;
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
    e.currentTarget.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(
      2,
    )}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-4px)`;
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "";
  };

  return (
    <section id="explore" className="sec relative z-[2] px-[clamp(20px,6vw,140px)] py-[clamp(80px,12vh,140px)]">
      <span className="eyb">
        <i>02</i>Tools
      </span>

      <h2 className="sh font-serif font-medium text-[clamp(40px,4.4vw,84px)] tracking-[-0.025em] leading-[1.04] text-center text-ink">
        <span ref={countRef} id="cnt" className="tabular-nums">
          {count || 76}
        </span>{" "}
        tools. <em className="text-muted not-italic italic">One place.</em>
      </h2>
      <p className="sp text-center text-ink2 text-[19px] mt-[14px]">
        For everyday work, developers and creators. Fast, private and free.
      </p>

      {/* Tabs */}
      <div
        ref={tabsRef}
        id="tabs"
        className="tabs relative flex gap-[4px] p-[5px] rounded-full bg-panel border border-line w-max max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-none mx-auto mt-[40px] backdrop-blur-[10px]"
      >
        <div
          ref={indRef}
          id="tabInd"
          className="absolute top-[5px] h-[44px] rounded-full bg-ink transition-[left,width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
        />
        {categoriesList.map(([key, label, num]) => {
          const isOn = activeCategory === key;
          return (
            <button
              key={key}
              type="button"
              data-k={key}
              onClick={() => {
                setActiveCategory(key);
              }}
              className={`tab relative z-[1] h-[44px] px-[20px] max-[640px]:px-[12px] max-[640px]:text-[13px] rounded-full text-[15px] font-medium transition-colors cursor-pointer select-none whitespace-nowrap ${
                isOn ? "on text-bg" : "text-ink2 hover:text-ink"
              }`}
            >
              {label}
              <b className={`font-medium ml-[6px] text-[13px] ${isOn ? "opacity-85" : "text-ink2"}`}>{num}</b>
            </button>
          );
        })}
      </div>

      {/* Grid of Tools with 3D Tilt + Cursor Spotlight */}
      <div
        id="grid"
        className="grid grid-cols-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1 gap-[18px] max-w-[1500px] mx-auto mt-[34px]"
      >
        {visibleTools.map((t, idx) => {
          const cat = CATS[t.c];
          const isLive = t.live;
          return (
            <button
              key={t.n}
              type="button"
              data-c={t.c}
              data-i={idx}
              onClick={() => onSelectTool(t)}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="tcard relative text-left p-[22px] rounded-[24px] bg-solid border border-line overflow-hidden transition-[box-shadow] duration-250 ease-[cubic-bezier(.2,.8,.2,1)] min-h-[168px] hover:shadow-[var(--shadow)] group active:scale-[0.98]"
            >
              {/* Radial Spotlight pseudo-layer */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(380px circle at var(--mx, -100px) var(--my, -100px), var(--accentSoft), transparent 60%)",
                }}
              />

              <div className="relative">
                <div
                  className="ti w-[46px] h-[46px] rounded-[14px] grid place-items-center flex-none"
                  style={{ background: tint(cat.c) }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={cat.c}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={TOOL_ICON_PATHS[t.i] || TOOL_ICON_PATHS.code} />
                  </svg>
                </div>

                <span className="tg absolute right-0 top-0 text-[12px] text-ink2 font-medium">
                  {isLive ? (
                    <b style={{ color: "var(--ok)", fontWeight: 600 }}>● Live</b>
                  ) : t.s ? (
                    "Private server"
                  ) : (
                    "On device"
                  )}
                </span>

                <h3 className="text-[18px] font-semibold text-ink mt-[16px]">{t.n}</h3>
                <p className="text-[14px] text-ink2 mt-[4px] leading-[1.45]">{t.d}</p>
              </div>
            </button>
          );
        })}
      </div>

      <button
        id="more"
        type="button"
        onClick={() => setShowAll((prev) => !prev)}
        className="pill more block mx-auto mt-[34px] h-[44px] px-[20px] rounded-full text-[15px] font-medium border border-line2 bg-panel text-ink transition-transform active:scale-[0.96]"
      >
        {showAll
          ? "Show fewer"
          : `Show all ${
              activeCategory === "all" ? TOOLS.length : TOOLS.filter((t) => t.c === activeCategory).length
            } tools`}
      </button>
    </section>
  );
}
