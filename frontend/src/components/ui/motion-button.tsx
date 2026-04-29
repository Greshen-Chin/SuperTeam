"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type MotionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  href?: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
  classes?: string;
};

export default function MotionButton({
  label,
  href,
  icon,
  variant = "primary",
  classes,
  className,
  ...props
}: MotionButtonProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "m-0 block h-12 w-12 overflow-hidden rounded-full duration-500 group-hover:w-full",
          variant === "primary" ? "bg-brand-600" : "bg-ink"
        )}
      />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 translate-x-0 duration-500 group-hover:translate-x-[0.4rem]">
        {icon ?? <ArrowRight className="size-6 text-white" />}
      </span>
      <span className="absolute left-1/2 top-1/2 ml-4 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-base font-semibold tracking-normal text-ink duration-500 group-hover:text-white">
        {label}
      </span>
    </>
  );

  const buttonClassName = cn(
    "group relative h-auto w-52 cursor-pointer rounded-full border border-line bg-white p-1 outline-none transition hover:shadow-soft",
    classes,
    className
  );

  if (href) {
    return (
      <Link className={buttonClassName} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={buttonClassName} {...props}>
      {content}
    </button>
  );
}

