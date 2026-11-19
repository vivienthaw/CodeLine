import type { SelectHTMLAttributes } from "react";
import { Icon } from "./icons";

/** Native select styled to match Input. `options` are [value, label] pairs. */
export function Select({
  label,
  options,
  className = "",
  id,
  ...rest
}: {
  label?: string;
  options: readonly (readonly [string, string])[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const selectId = id ?? (label ? `sel-${label.replace(/\W+/g, "-").toLowerCase()}` : undefined);
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-semibold text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className="min-h-11 w-full cursor-pointer appearance-none rounded-chip border-2 border-primary/20 bg-surface pl-3.5 pr-9 text-sm font-medium text-primary outline-none transition-colors focus:border-accent"
          {...rest}
        >
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/50" />
      </div>
    </div>
  );
}
