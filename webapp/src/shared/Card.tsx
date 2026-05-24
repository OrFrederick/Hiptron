import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onTap?: () => void;
  ariaLabel?: string;
}

export function Card({ children, className = "", onTap, ariaLabel }: Props) {
  const base = "rounded-3xl bg-warm-100 p-5 shadow-sm border border-warm-200 transition";
  const tappable = onTap ? "active:scale-[0.99] cursor-pointer" : "";
  if (onTap) {
    return (
      <button
        className={`${base} ${tappable} ${className}`}
        onClick={onTap}
        aria-label={ariaLabel}
        style={{ minHeight: 44 }}
      >
        {children}
      </button>
    );
  }
  return (
    <div
      className={`${base} ${className}`}
      aria-label={ariaLabel}
      style={{ minHeight: 44 }}
    >
      {children}
    </div>
  );
}
