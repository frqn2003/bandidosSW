import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  requiredMark?: boolean;
  error?: string;
  hint?: string;
  id?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, requiredMark = false, error, hint, id, className = "", ...props },
    ref,
  ) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = [error ? errorId : "", hint && !error ? hintId : ""]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-bold text-on-surface"
          >
            {label}
            {requiredMark && <span className="text-error"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`h-11 min-h-11 rounded-sm border bg-surface-container-low px-4 text-base text-on-surface transition-colors duration-fast ease-out placeholder:text-on-surface-variant focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:opacity-70 ${error ? "border-error" : "border-outline-variant"} ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs font-medium text-on-surface-variant">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
