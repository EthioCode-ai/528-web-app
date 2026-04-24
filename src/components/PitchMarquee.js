"use client";

import { useEffect, useRef } from "react";

// Self-contained scrolling pitch for the auth pages.
// - 10 items cascade upward (two visible at a time)
// - Punchline shown alone (bigger, bolder, longer hold)
// - Seamlessly cycles

const ITEMS = [
  "AI that adapts to YOU — every question targets your weakest spots",
  "Unlimited fresh questions — never see the same problem twice",
  "Wrong answer? AI explains why — Socratic tutoring in real-time",
  "Know exactly where you're weak — instant gap analysis across all 4 sections",
  "Missed questions come back — spaced repetition until it sticks",
  "Your study plan, built by AI — personalized to your score goal and schedule",
  "Snap. Scan. Learn. — turn any textbook page into an MCAT breakdown",
  "Watch your score climb — live projected score on the 472-528 scale",
  "Periodic table on demand — MCAT-relevant notes for every element",
  "Study smarter together — AI-powered group sessions that push everyone",
];

const PUNCHLINE_HTML =
  '<span class="pm-punch-body">"Other apps quiz you. <span class="pm-accent">528 AI studies YOU</span> — reading your performance, mapping your strengths and gaps, and delivering exactly what moves your score closer to 528."</span>';

const HALF = 4000;
const ITEM_FULL = 8000;
const PUNCH_HOLD = 9500;
const PUNCH_FULL = 11500;
const TRANS = 900;

export default function PitchMarquee() {
  const marqueeRef = useRef(null);

  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    const timers = [];
    const add = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

    let idx = 0;

    function spawnItem(content, isPunchline) {
      const el = document.createElement("div");
      el.className = "pm-item" + (isPunchline ? " pm-punchline" : "");
      if (isPunchline) el.innerHTML = content;
      else el.textContent = content;
      marquee.appendChild(el);

      void el.offsetWidth; // force reflow so the enter transition animates
      requestAnimationFrame(() => el.classList.add("pm-enter"));

      const holdTime = isPunchline ? PUNCH_HOLD : HALF;
      const fullTime = isPunchline ? PUNCH_FULL : ITEM_FULL;

      add(() => {
        el.classList.remove("pm-enter");
        el.classList.add("pm-exit");
      }, holdTime);

      add(() => {
        el.classList.remove("pm-enter", "pm-exit");
        el.classList.add("pm-gone");
      }, fullTime - TRANS);

      add(() => el.remove(), fullTime + 100);
    }

    function tick() {
      if (idx < ITEMS.length) {
        spawnItem(ITEMS[idx], false);
        idx += 1;
        const wait = idx === ITEMS.length ? ITEM_FULL : HALF;
        add(tick, wait);
      } else if (idx === ITEMS.length) {
        spawnItem(PUNCHLINE_HTML, true);
        idx += 1;
        add(tick, PUNCH_FULL);
      } else {
        idx = 0;
        tick();
      }
    }

    tick();

    return () => {
      timers.forEach(clearTimeout);
      while (marquee.firstChild) marquee.removeChild(marquee.firstChild);
    };
  }, []);

  return (
    <>
      <style>{`
        .pm-eyebrow {
          font-size: 15px; font-weight: 800;
          letter-spacing: 0.22em; text-transform: uppercase;
          opacity: 0.92; color: #fff;
          margin-bottom: 22px;
          text-shadow: 0 1px 3px rgba(0,0,0,0.45);
        }
        .pm-marquee {
          position: relative;
          height: 440px;
          overflow: hidden;
        }
        .pm-item {
          position: absolute;
          left: 0; right: 0; top: 0;
          transform: translateY(320px);
          opacity: 0;
          transition: transform 900ms cubic-bezier(0.32, 0.72, 0.3, 1),
                      opacity 800ms ease-out;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.38;
          letter-spacing: -0.015em;
          color: #fff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.4);
          will-change: transform, opacity;
          white-space: normal;
          word-wrap: break-word;
        }
        .pm-item.pm-enter { transform: translateY(200px); opacity: 1; }
        .pm-item.pm-exit  { transform: translateY(70px);  opacity: 1; }
        .pm-item.pm-gone  { transform: translateY(-60px); opacity: 0; }

        .pm-item:not(.pm-punchline)::before {
          content: "•";
          display: inline-block;
          margin-right: 12px;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.55);
        }

        .pm-item.pm-punchline {
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          font-size: 23px;
          font-weight: 800;
          line-height: 1.45;
          color: #e8efff;
        }
        .pm-item.pm-punchline > .pm-punch-body {
          display: block;
          width: 100%;
        }
        .pm-item.pm-punchline .pm-accent {
          color: #fff;
          font-weight: 900;
        }
        .pm-item.pm-punchline.pm-enter,
        .pm-item.pm-punchline.pm-exit {
          transform: translateY(0);
          opacity: 1;
        }
        .pm-item.pm-punchline.pm-gone {
          transform: translateY(-260px);
          opacity: 0;
        }
      `}</style>
      <div>
        <div className="pm-eyebrow">Why 528 AI</div>
        <div ref={marqueeRef} className="pm-marquee" />
      </div>
    </>
  );
}
