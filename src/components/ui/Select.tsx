import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  requiredMark?: boolean;
  error?: string;
  hint?: string;
  id?: string;
  /**
   * Clases del contenedor (label + select + mensajes). `className` va al
   * <select>; para dimensionarlo dentro de un flex/grid (flex-1, min-w-0,
   * w-40…) hay que usar esta, porque el hijo del layout es el contenedor.
   */
  wrapperClassName?: string;
  children: React.ReactNode;
  compact?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, requiredMark = false, error, hint, id, compact = false, children, className = "", wrapperClassName = "", ...props },
    ref,
  ) {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;
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
      <div className={`flex flex-col ${gapClass} ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className={labelClasses}
          >
            {label}
            {requiredMark && <span className="text-error"> *</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`${sizeClasses} cursor-pointer rounded-sm border bg-surface-container-low text-on-surface transition-colors duration-fast ease-out focus:border-secondary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:opacity-70 ${error ? "border-error" : "border-outline-variant"} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={errorId} role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={hintId} className="text-xs font-medium text-on-surface-variant">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
