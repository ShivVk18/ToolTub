"use client";

import React, { useEffect, useRef, useState } from "react";
import { tween, ease, goto, addLoop } from "@/lib/motion/animation";

interface PricingSectionProps {
  onOpenPro: () => void;
}

export function PricingSection({ onOpenPro }: PricingSectionProps) {
  const [billing, setBilling] = useState<"m" | "y">("m");
  const [priceNum, setPriceNum] = useState(299);

  const tabsRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLDivElement>(null);
  const proCardRef = useRef<HTMLDivElement>(null);

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
  }, [billing]);

  // Conic border animation loop
  useEffect(() => {
    const cleanup = addLoop(
      (t) => {
        if (proCardRef.current) {
          proCardRef.current.style.setProperty("--pr", `${(t * 40) % 360}`);
        }
      },
      { target: proCardRef.current, motion: true },
    );
    return cleanup;
  }, []);

  const handleBillingToggle = (b: "m" | "y") => {
    if (b === billing) return;
    setBilling(b);
    const from = priceNum;
    const to = b === "y" ? 2499 : 299;
    tween(
      700,
      (p) => {
        setPriceNum(Math.round(from + (to - from) * p));
      },
      ease.io,
    );
  };

  return (
    <section id="pricing" className="sec relative z-[2] px-[clamp(20px,6vw,140px)] py-[clamp(80px,12vh,140px)]">
      <span className="eyb">
        <i>03</i>Pricing
      </span>

      <h2 className="sh font-serif font-medium text-[clamp(40px,4.4vw,84px)] tracking-[-0.025em] leading-[1.04] text-center text-ink">
        Free forever. <em className="text-muted italic">Pro when you need more.</em>
      </h2>

      {/* Monthly / Yearly Toggle */}
      <div className="bill flex justify-center mt-[30px]">
        <div
          ref={tabsRef}
          id="billTabs"
          // The global .tabs rule adds margin: 40px auto 0; the reference cancels it here (style="margin:0").
          style={{ margin: 0 }}
          className="tabs relative flex gap-[4px] p-[5px] rounded-full bg-panel border border-line w-max backdrop-blur-[10px]"
        >
          <div
            ref={indRef}
            id="billInd"
            className="absolute top-[5px] h-[44px] rounded-full bg-ink transition-[left,width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
          />
          <button
            type="button"
            data-b="m"
            onClick={() => handleBillingToggle("m")}
            className={`tab relative z-[1] h-[44px] px-[22px] rounded-full text-[15px] font-medium transition-colors cursor-pointer select-none ${
              billing === "m" ? "on text-bg" : "text-ink2 hover:text-ink"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            data-b="y"
            onClick={() => handleBillingToggle("y")}
            className={`tab relative z-[1] h-[44px] px-[22px] rounded-full text-[15px] font-medium transition-colors cursor-pointer select-none ${
              billing === "y" ? "on text-bg" : "text-ink2 hover:text-ink"
            }`}
          >
            Yearly <b className="font-semibold text-[#4F39E3] dark:text-[#9C8FFF] ml-[4px]">save 30%</b>
          </button>
        </div>
      </div>

      {/* Plans Container */}
      <div className="plans grid grid-cols-2 max-[1100px]:grid-cols-1 gap-[28px] max-w-[1040px] mx-auto mt-[40px]">
        {/* Free Plan */}
        <div className="plan relative rounded-[32px] p-[36px] bg-solid border border-line shadow-[var(--shadow)]">
          <div className="pn text-[20px] font-semibold text-ink">Free</div>
          <div className="pr font-serif text-[76px] tracking-[-0.03em] mt-[14px] leading-none text-ink tabular-nums">
            ₹0
          </div>
          <div className="pe text-[15px] text-muted mt-[8px]">forever · no sign-up</div>

          <ul className="list-none my-[26px] mb-[30px]">
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-okSoft text-ok flex-none">
                ✓
              </b>
              All 76 tools
            </li>
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-okSoft text-ok flex-none">
                ✓
              </b>
              Runs on your device
            </li>
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-okSoft text-ok flex-none">
                ✓
              </b>
              No watermarks, no clutter
            </li>
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-okSoft text-ok flex-none">
                ✓
              </b>
              Smart suggestions & Tool Chains
            </li>
          </ul>

          <button
            id="freeBtn"
            type="button"
            onClick={() => goto(0)}
            className="pb w-full h-[56px] rounded-full font-semibold text-[17px] border border-line2 text-ink hover:bg-soft transition-[transform,background] active:scale-[0.98]"
          >
            Start free
          </button>
        </div>

        {/* Pro Card */}
        <div
          ref={proCardRef}
          className="plan dark relative rounded-[32px] p-[36px] bg-[#17161B] text-[#F3F1EC] border border-[#17161B] shadow-[var(--shadow)]"
        >
          <div className="pn text-[20px] font-semibold flex items-center justify-between">
            Pro{" "}
            <span className="pro inline-flex items-center px-[8px] py-[3px] rounded-full text-white text-[11px] font-bold tracking-[0.8px] bg-gradient-to-br from-[#8C7DFF] to-[#FF9C82]">
              MOST LOVED
            </span>
          </div>
          <div
            id="proPrice"
            className="pr font-serif text-[76px] tracking-[-0.03em] mt-[14px] leading-none tabular-nums"
          >
            ₹{priceNum.toLocaleString("en-IN")}
          </div>
          <div id="proPer" className="pe text-[15px] text-[#A8A3B3] mt-[8px]">
            {billing === "y" ? "per year · ₹208 / month" : "per month"}
          </div>

          <ul className="list-none my-[26px] mb-[30px]">
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-[rgba(169,155,255,0.22)] text-[#C9C0FF] flex-none">
                🎙
              </b>
              Voice commands
            </li>
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-[rgba(169,155,255,0.22)] text-[#C9C0FF] flex-none">
                ✓
              </b>
              Batch processing
            </li>
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-[rgba(169,155,255,0.22)] text-[#C9C0FF] flex-none">
                ✓
              </b>
              Bigger files, up to 2 GB
            </li>
            <li className="flex gap-[12px] items-center text-[17px] py-[9px]">
              <b className="w-[24px] h-[24px] rounded-full grid place-items-center text-[13px] bg-[rgba(169,155,255,0.22)] text-[#C9C0FF] flex-none">
                ✓
              </b>
              Saved chains & history
            </li>
          </ul>

          <button
            id="proBtn"
            type="button"
            data-mag
            onClick={onOpenPro}
            className="pb w-full h-[56px] rounded-full font-semibold text-[17px] bg-gradient-to-r from-[#7C6BFF] via-[#FF9C82] to-[#FFD27A] text-[#17161B] shadow-[0_12px_28px_-10px_rgba(109,93,245,0.6)] transition-transform hover:-translate-y-[2px] active:scale-[0.98]"
          >
            Go Pro
          </button>
        </div>
      </div>
    </section>
  );
}
