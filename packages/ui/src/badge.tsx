import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type BadgeVariant = "default" | "outline" | "accent" | "success";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-slate-800/70 text-slate-100",
  outline: "border border-slate-700 text-slate-200",
  accent: "bg-sky-900/60 text-sky-100 border border-sky-700/60",
  success: "bg-emerald-900/60 text-emerald-100 border border-emerald-700/70"
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-tight",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
