import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  requiredMark?: boolean;
  error?: string;
  hint?: string;
  id?: string;
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { label, requiredMark = false, error, hint, id, compact = false, className = "", ...props },
    ref,
  ) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = [error ? errorId : "", hint && !error ? hintId : ""]
      .filter(Boolean)
      .join(" ");

    const sizeClasses = compact
      ? "h-9 min-h-9 px-2.5 text-xs"
      : "h-11 min-h-11 px-4 text-base";
    const labelClasses = compact
      ? "text-xs font-semibold text-on-surface"
      : "text-sm font-bold text-on-surface";
    const gapClass = compact ? "gap-1" : "gap-1.5";

    return (
      <div className={`flex flex-col ${gapClass}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={labelClasses}
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
          className={`${sizeClasses} rounded-sm border bg-surface-container-low text-on-surface transition-colors duration-fast ease-out placeholder:text-on-surface-variant focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:opacity-70 ${error ? "border-error" : "border-outline-variant"} ${className}`}
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
