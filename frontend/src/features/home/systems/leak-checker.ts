type LeakCheckTarget = {
  destroy?: () => void;
  onSectionExit?: unknown;
  pause?: () => void;
};

export class LeakChecker {
  static check(systemName: string, system: LeakCheckTarget) {
    const checks = [
      typeof system.destroy === "function",
      typeof system.pause === "function",
      "onSectionExit" in system
    ];
    const passed = checks.every(Boolean);
    if (!passed) console.warn(`[LeakChecker] ${systemName} may have leaks`);
    return passed;
  }
}
