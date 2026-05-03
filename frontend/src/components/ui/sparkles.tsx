"use client";

import { useEffect, useId, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import type { Container, ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";

type ParticlesProps = {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
};

export function SparklesCore({
  id,
  className,
  background,
  minSize,
  maxSize,
  speed,
  particleColor,
  particleDensity
}: ParticlesProps) {
  const [init, setInit] = useState(false);
  const controls = useAnimation();
  const generatedId = useId();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = async (container?: Container) => {
    if (!container) return;
    await controls.start({
      opacity: 1,
      transition: {
        duration: 1
      }
    });
  };

  const options = {
    background: {
      color: {
        value: background || "#0d47a1"
      }
    },
    fullScreen: {
      enable: false,
      zIndex: 1
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: {
          enable: true,
          mode: "push"
        },
        onHover: {
          enable: false,
          mode: "repulse"
        },
        resize: {
          enable: true
        }
      },
      modes: {
        push: {
          quantity: 4
        },
        repulse: {
          distance: 200,
          duration: 0.4
        }
      }
    },
    particles: {
      bounce: {
        horizontal: {
          value: 1
        },
        vertical: {
          value: 1
        }
      },
      collisions: {
        enable: false,
        mode: "bounce",
        overlap: {
          enable: true,
          retries: 0
        }
      },
      color: {
        value: particleColor || "#ffffff"
      },
      move: {
        center: {
          x: 50,
          y: 50,
          mode: "percent",
          radius: 0
        },
        direction: "none",
        enable: true,
        outModes: {
          default: "out"
        },
        speed: {
          min: 0.1,
          max: 1
        },
        straight: false
      },
      number: {
        density: {
          enable: true,
          width: 400,
          height: 400
        },
        limit: {
          mode: "delete",
          value: 0
        },
        value: particleDensity || 120
      },
      opacity: {
        value: {
          min: 0.1,
          max: 1
        },
        animation: {
          enable: true,
          speed: speed || 4,
          sync: false,
          startValue: "random",
          destroy: "none"
        }
      },
      reduceDuplicates: false,
      shape: {
        close: true,
        fill: true,
        options: {},
        type: "circle"
      },
      size: {
        value: {
          min: minSize || 1,
          max: maxSize || 3
        }
      },
      stroke: {
        width: 0
      },
      zIndex: {
        value: 0,
        opacityRate: 1,
        sizeRate: 1,
        velocityRate: 1
      },
      links: {
        enable: false
      }
    },
    detectRetina: true
  } satisfies ISourceOptions;

  return (
    <motion.div animate={controls} className={cn("opacity-0", className)}>
      {init ? (
        <Particles
          id={id || generatedId}
          className="h-full w-full"
          particlesLoaded={particlesLoaded}
          options={options}
        />
      ) : null}
    </motion.div>
  );
}
