import { cn } from "@/lib/utils";

type SpotlightProps = {
  className?: string;
  fill?: string;
};

export function Spotlight({ className, fill = "white" }: SpotlightProps) {
  return (
    <svg
      className={cn("animate-spotlight pointer-events-none absolute z-[1] h-[169%] w-[138%] opacity-0 lg:w-[84%]", className)}
      fill="none"
      viewBox="0 0 3787 2842"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          fill={fill}
          fillOpacity="0.21"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
        />
      </g>
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          height="2840.26"
          id="spotlight-filter"
          width="3785.16"
          x="0.860352"
          y="0.838989"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
          <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="151" />
        </filter>
      </defs>
    </svg>
  );
}
