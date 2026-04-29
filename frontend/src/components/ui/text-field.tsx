import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
};

export function TextField({ className, label, helper, id, ...props }: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        id={inputId}
        className={cn(
          "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
          className
        )}
        {...props}
      />
      {helper ? <span className="block text-xs text-muted">{helper}</span> : null}
    </label>
  );
}

