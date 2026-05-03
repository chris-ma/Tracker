"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { DateRange } from "@/lib/types";

const OPTIONS: { label: string; value: DateRange }[] = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "Work Week", value: "workweek" },
  { label: "30 Days", value: "30d" },
  { label: "Custom", value: "custom" },
];

interface Props {
  value: DateRange;
  onChange: (range: DateRange, from?: string, to?: string) => void;
  customFrom?: string;
  customTo?: string;
}

export function DateRangeFilter({ value, onChange, customFrom, customTo }: Props) {
  const [showCustom, setShowCustom] = useState(value === "custom");
  const [from, setFrom] = useState(customFrom ?? "");
  const [to, setTo] = useState(customTo ?? "");

  function select(v: DateRange) {
    if (v === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(v);
    }
  }

  function applyCustom() {
    if (from && to) onChange("custom", from, to);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 p-1 rounded-xl glass w-fit">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => select(opt.value)}
            className="relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: value === opt.value ? "white" : "rgba(255,255,255,0.45)" }}
          >
            {value === opt.value && (
              <motion.div
                layoutId="date-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #06B6D4)" }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        ))}
      </div>

      {showCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2"
        >
          <input
            type="date"
            className="input-field w-auto"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-white/40 text-sm">to</span>
          <input
            type="date"
            className="input-field w-auto"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <button onClick={applyCustom} className="btn-primary py-2">Apply</button>
        </motion.div>
      )}
    </div>
  );
}
