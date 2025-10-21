import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-sky-600 text-white hover:bg-sky-500 disabled:bg-slate-700",
  secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:bg-slate-800/60",
  outline:
    "border border-slate-600 text-slate-100 hover:bg-slate-800 disabled:bg-transparent disabled:opacity-60",
  ghost: "text-slate-200 hover:bg-slate-800/70 disabled:text-slate-500"
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
