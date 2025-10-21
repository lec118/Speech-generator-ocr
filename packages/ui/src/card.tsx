import type { HTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "./utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/40 backdrop-blur",
        className
      )}
      {...props}
    />
  );
});

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("flex flex-col gap-1.5 border-b border-slate-800 px-6 py-4", className)} {...props} />
  );
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { className, ...props },
  ref
) {
  return <h2 ref={ref} className={cn("text-lg font-semibold text-slate-50", className)} {...props} />;
});

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(function CardDescription(
  { className, ...props },
  ref
) {
  return <p ref={ref} className={cn("text-sm text-slate-400", className)} {...props} />;
});

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("px-6 py-4", className)} {...props} />;
});

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("flex items-center gap-2 border-t border-slate-800 px-6 py-4", className)} {...props} />;
});
