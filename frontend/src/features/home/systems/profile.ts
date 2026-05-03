export type VisualProfile = {
  ctaBg: "canvas" | "css";
  disputeBg: "canvas" | "css";
  eyeTrackingSmoothing: number;
  flashlightDust: boolean;
  flashlightRadius: number;
  heroIcons: number;
  heroMouseRepulsion: boolean;
  maxParticles: number;
  phashBg: "canvas" | "css";
  problemBg: "canvas" | "css";
  royaltiesBg: "canvas" | "css";
  transitionType: "cinematic" | "fade";
  useOffscreenCanvas: boolean;
};

function getDeviceMemory() {
  if (typeof navigator === "undefined") return 4;
  const value = "deviceMemory" in navigator ? navigator.deviceMemory : undefined;
  return typeof value === "number" ? value : 4;
}

function getHardwareConcurrency() {
  if (typeof navigator === "undefined") return 4;
  return typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
}

export function createVisualProfile(): VisualProfile {
  if (typeof window === "undefined") {
    return {
      ctaBg: "canvas",
      disputeBg: "canvas",
      eyeTrackingSmoothing: 0.08,
      flashlightDust: true,
      flashlightRadius: 150,
      heroIcons: 30,
      heroMouseRepulsion: true,
      maxParticles: 300,
      phashBg: "canvas",
      problemBg: "canvas",
      royaltiesBg: "canvas",
      transitionType: "cinematic",
      useOffscreenCanvas: true
    };
  }
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const isLowEnd = getDeviceMemory() <= 2 || getHardwareConcurrency() <= 2;

  if (isMobile || isLowEnd) {
    return {
      ctaBg: "canvas",
      disputeBg: "css",
      eyeTrackingSmoothing: 0.15,
      flashlightDust: false,
      flashlightRadius: 100,
      heroIcons: 10,
      heroMouseRepulsion: false,
      maxParticles: 40,
      phashBg: "canvas",
      problemBg: "css",
      royaltiesBg: "css",
      transitionType: "fade",
      useOffscreenCanvas: false
    };
  }

  return {
    ctaBg: "canvas",
    disputeBg: "canvas",
    eyeTrackingSmoothing: 0.08,
    flashlightDust: true,
    flashlightRadius: 150,
    heroIcons: 30,
    heroMouseRepulsion: true,
    maxParticles: 300,
    phashBg: "canvas",
    problemBg: "canvas",
    royaltiesBg: "canvas",
    transitionType: "cinematic",
    useOffscreenCanvas: true
  };
}
