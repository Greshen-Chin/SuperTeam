"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";

export function ContainerScroll({
  titleComponent,
  children
}: {
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.72, 0.92] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div className="relative flex h-[58rem] items-center justify-center p-2 md:h-[76rem] md:p-20" ref={containerRef}>
      <div className="relative w-full py-10 md:py-36" style={{ perspective: "1000px" }}>
        <ScrollHeader titleComponent={titleComponent} translate={translate} />
        <ScrollCard rotate={rotate} scale={scale}>
          {children}
        </ScrollCard>
      </div>
    </div>
  );
}

function ScrollHeader({ translate, titleComponent }: { translate: MotionValue<number>; titleComponent: ReactNode }) {
  return (
    <motion.div className="mx-auto max-w-5xl text-center" style={{ translateY: translate }}>
      {titleComponent}
    </motion.div>
  );
}

function ScrollCard({
  rotate,
  scale,
  children
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="mx-auto -mt-10 h-[30rem] w-full max-w-5xl rounded-[28px] border-4 border-zinc-700 bg-[#222222] p-2 shadow-2xl md:h-[40rem] md:p-6"
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003"
      }}
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-zinc-950 md:p-4">{children}</div>
    </motion.div>
  );
}
