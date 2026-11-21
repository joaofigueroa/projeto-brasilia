"use client";
import { MotionConfig } from "motion/react";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 370, damping: 35 }}>
      {children}
    </MotionConfig>
  );
}
