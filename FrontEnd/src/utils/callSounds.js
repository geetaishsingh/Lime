/**
 * callSounds.js
 * Native Web Audio API sound synthesizer for audio/video calling.
 * Generates realistic incoming ringtones, outgoing dial tones, and call completion beeps
 * without external audio file dependencies or network latency.
 */

class CallSoundManager {
  constructor() {
    this.audioCtx = null;
    this.incomingTimer = null;
    this.outgoingTimer = null;
    this.unlocked = false;

    // Auto-unlock on first user gesture
    if (typeof window !== "undefined") {
      const unlockAudio = () => {
        if (this.audioCtx && this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {});
        }
        this.unlocked = true;
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("touchstart", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };
      window.addEventListener("click", unlockAudio, { passive: true });
      window.addEventListener("touchstart", unlockAudio, { passive: true });
      window.addEventListener("keydown", unlockAudio, { passive: true });
    }
  }

  getAudioContext() {
    if (typeof window === "undefined") return null;

    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.audioCtx = new AudioCtx();
    }

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Plays a pleasant harmonic chime note
   */
  playChime(frequency, startTime, duration = 0.35, peakGain = 0.12) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startTime);

      // Fast attack and natural exponential fade
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch (_err) {}
  }

  /**
   * Starts playing the incoming call ringtone
   * An attractive melodic sequence repeating every 2.4s
   */
  startIncomingRingtone() {
    this.stopIncomingRingtone();
    const ctx = this.getAudioContext();
    if (!ctx) return () => {};

    let active = true;

    const playRingtonePhrase = () => {
      if (!active) return;
      const now = ctx.currentTime;

      // Note 1: E5 (659Hz)
      this.playChime(659.25, now, 0.28, 0.16);
      // Note 2: G#5 (830Hz)
      this.playChime(830.61, now + 0.12, 0.28, 0.16);
      // Note 3: B5 (987Hz)
      this.playChime(987.77, now + 0.24, 0.35, 0.16);
      // Note 4: E6 (1318Hz)
      this.playChime(1318.51, now + 0.38, 0.55, 0.14);

      // Response motif
      this.playChime(830.61, now + 0.85, 0.28, 0.14);
      this.playChime(987.77, now + 0.98, 0.28, 0.14);
      this.playChime(1318.51, now + 1.12, 0.60, 0.13);
    };

    playRingtonePhrase();
    this.incomingTimer = setInterval(playRingtonePhrase, 2400);

    return () => this.stopIncomingRingtone();
  }

  stopIncomingRingtone() {
    if (this.incomingTimer) {
      clearInterval(this.incomingTimer);
      this.incomingTimer = null;
    }
  }

  /**
   * Starts playing the outgoing calling tone (soft dual-tone pulse)
   * Repeating every 3.2s until answered
   */
  startOutgoingTone() {
    this.stopOutgoingTone();
    const ctx = this.getAudioContext();
    if (!ctx) return () => {};

    let active = true;

    const playRingbackPulse = () => {
      if (!active) return;
      const now = ctx.currentTime;
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
        gain.gain.setValueAtTime(0.06, now + 1.15);
        gain.gain.linearRampToValueAtTime(0.0001, now + 1.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
      } catch (_e) {}
    };

    playRingbackPulse();
    this.outgoingTimer = setInterval(playRingbackPulse, 3200);

    return () => this.stopOutgoingTone();
  }

  stopOutgoingTone() {
    if (this.outgoingTimer) {
      clearInterval(this.outgoingTimer);
      this.outgoingTimer = null;
    }
  }

  /**
   * Short 2-beep tone when call ends or disconnects
   */
  playCallEndTone() {
    this.stopIncomingRingtone();
    this.stopOutgoingTone();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this.playChime(480, now, 0.16, 0.10);
      this.playChime(360, now + 0.20, 0.26, 0.10);
    } catch (_e) {}
  }

  /**
   * Stop everything
   */
  cleanup() {
    this.stopIncomingRingtone();
    this.stopOutgoingTone();
  }
}

export const callSounds = new CallSoundManager();
export default callSounds;
