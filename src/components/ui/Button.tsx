import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "orange" | "butter" | "periwinkle" | "white" | "ink";
type Size = "sm" | "md" | "lg";

type StyleProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

const variantClass: Record<Variant, string> = {
  orange: "bg-orange text-ink",
  butter: "bg-butter text-ink",
  periwinkle: "bg-periwinkle text-ink",
  white: "bg-white text-ink",
  ink: "bg-ink text-butter",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

export function buttonStyles({ variant = "orange", size = "md", block = false }: StyleProps = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "border-2 border-ink font-pixel",
    "press cursor-pointer select-none",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variantClass[variant],
    sizeClass[size],
    block && "w-full",
  );
}

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles({ variant, size, block }), className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return (
    <Link className={cn(buttonStyles({ variant, size, block }), className)} {...props} />
  );
}
