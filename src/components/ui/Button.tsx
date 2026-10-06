"use client";

import * as React from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "outline-danger"
  | "ghost"
  | "destructive"
  | "default"
  | "link";

export type Size = "sm" | "md" | "lg" | "icon" | "default";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-secondary active:scale-[0.97] disabled:hover:bg-primary",
  default:
    "bg-slate-950 text-white shadow hover:bg-slate-800 active:scale-[0.97]",
  secondary:
    "bg-secondary text-on-secondary hover:bg-primary active:scale-[0.97] disabled:hover:bg-secondary",
  outline:
    "border border-secondary bg-transparent text-secondary hover:bg-secondary/5 active:scale-[0.97]",
  "outline-danger":
    "border border-status-danger bg-transparent text-status-danger hover:bg-status-danger/10 active:scale-[0.97]",
  ghost:
    "bg-transparent text-secondary hover:bg-secondary/10 active:scale-[0.97]",
  destructive:
    "bg-error text-on-error hover:bg-status-danger-strong active:scale-[0.97] disabled:hover:bg-error",
  link:
    "text-blue-600 underline-offset-4 hover:underline",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 min-h-8 px-3 text-xs gap-1.5",
  default: "h-9 min-h-9 px-4 py-2 text-sm gap-2",
  md: "h-11 min-h-11 px-5 text-sm gap-2",
  lg: "h-12 min-h-12 px-6 text-base gap-2",
  icon: "h-9 w-9 min-h-9 min-w-9 p-0 flex items-center justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-all duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-45",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);