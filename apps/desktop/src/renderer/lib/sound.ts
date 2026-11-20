// Pleasant notification chime using HTML5 Web Audio API (Zero external assets needed)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playJobAlertChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First tone (523.25 Hz - C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (659.25 Hz - E5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.error("Audio chime error:", err);
  }
}

export function triggerDesktopAlert(
  tokenLabel: string,
  customerName: string,
  soundEnabled = true,
) {
  if (soundEnabled) {
    playJobAlertChime();
  }

  // Taskbar flash via Electron IPC
  if (
    typeof window !== "undefined" &&
    (window as any).electronAPI?.flashWindow
  ) {
    (window as any).electronAPI.flashWindow();
  }

  // Native HTML5 notification
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`Naya Print Job: ${tokenLabel}`, {
        body: `${customerName} ne naya print job bheja hai.`,
        icon: "/favicon.ico",
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification(`Naya Print Job: ${tokenLabel}`, {
            body: `${customerName} ne naya print job bheja hai.`,
          });
        }
      });
    }
  }
}
