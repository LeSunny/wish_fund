import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputStyles = cn(
  "h-12 w-full border-2 border-ink bg-white px-3 text-base",
  "placeholder:text-ink/35 focus-visible:bg-butter/40",
  "aria-invalid:border-red aria-invalid:bg-red/5",
);

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  errorId?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, errorId, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-pixel text-sm">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red">
          ✕ {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink/60">{hint}</p>
      )}
    </div>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  label: ReactNode;
  description?: ReactNode;
};

export function Checkbox({ label, description, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center border-2 border-ink bg-white",
          "peer-checked:bg-orange peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-focus-visible:outline-dashed",
          "*:invisible peer-checked:*:visible",
        )}
      >
        <svg viewBox="0 0 16 16" className="size-4" shapeRendering="crispEdges">
          <path d="M2 8h2v2h2v2h2v-2h2V8h2V6h2V4h-2v2h-2v2H8v2H6V8H4V6H2z" fill="currentColor" />
        </svg>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-pixel text-sm">{label}</span>
        {description && <span className="text-xs text-ink/60">{description}</span>}
      </span>
    </label>
  );
}
