import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white border-2 border-primary hover:bg-[#244573] active:bg-[#142a49]",
  secondary: "bg-surface text-primary border-2 border-primary hover:bg-primary/5",
  ghost: "bg-transparent text-primary border-2 border-transparent hover:bg-primary/8",
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-chip px-5 font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...rest}
    >
      {loading ? <Icon name="spinner" size={18} /> : icon}
      {children}
    </button>
  );
}
