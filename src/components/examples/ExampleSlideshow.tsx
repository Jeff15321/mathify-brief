"use client";

import { useState } from "react";
import { EXAMPLE_QUESTIONS, type ExampleQuestion } from "@/lib/example-data";
import { ExampleSlide } from "./ExampleSlide";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Slideshow navigator for example questions. Prev/next buttons,
 * dot indicators, and the current ExampleSlide.
 */
export function ExampleSlideshow() {
  const [index, setIndex] = useState(0);
  const total = EXAMPLE_QUESTIONS.length;
  const current = EXAMPLE_QUESTIONS[index];

  const go = (delta: number) => setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));

  return (
    <div className="flex flex-col gap-4">
      {/* Navigation bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => go(-1)}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Previous example"
        >
          <ChevronLeft size={16} />
          Prev
        </button>

        <div className="flex items-center gap-2">
          {EXAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-blue-600"
                  : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Go to example ${i + 1}: ${q.title}`}
            />
          ))}
          <span className="ml-2 text-xs text-slate-400">
            {index + 1} / {total}
          </span>
        </div>

        <button
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Next example"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-slate-800">{current.title}</h2>

      {/* Slide content */}
      <ExampleSlide example={current} />
    </div>
  );
}
