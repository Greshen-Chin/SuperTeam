export function playSoftTone(kind: "activate" | "hum" | "reveal") {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(kind === "hum" ? 72 : kind === "activate" ? 180 : 320, now);
  oscillator.frequency.exponentialRampToValueAtTime(kind === "hum" ? 148 : kind === "activate" ? 520 : 760, now + (kind === "hum" ? 0.8 : 0.32));
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === "hum" ? 0.04 : 0.06, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "hum" ? 0.8 : 0.45));
  oscillator.start(now);
  oscillator.stop(now + (kind === "hum" ? 0.85 : 0.5));
  window.setTimeout(() => void context.close(), kind === "hum" ? 950 : 620);
}
