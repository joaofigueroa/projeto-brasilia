"use client";
import { MotionConfig } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0, duration: 0.32 }}>
      {children}
    </MotionConfig>
  );
}
