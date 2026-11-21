// Procedural Web Audio sound effects, emote audio & multi-station music synthesizer (zero external mp3 404s)

export type MusicStation = 'lounge' | 'holiday' | 'runway' | 'campus' | 'horror' | 'off';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private station: MusicStation = 'holiday';
  private musicTimer: number | null = null;
  private stepIdx = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    } else if (this.station !== 'off') {
      this.startMusic(this.station);
    }
  }

  public isMuted() {
    return this.muted;
  }

  public setStation(station: MusicStation) {
    this.station = station;
    this.stopMusic();
    if (!this.muted && station !== 'off') {
      this.startMusic(station);
    }
  }

  public playClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playPhonePing() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [987.77, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.055, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.18);
    });
  }

  public playCoinChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1174.66, 1396.91].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.07, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.2);
    });
  }

  public playSuccessFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.06, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }

  public playHorrorStinger() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [110, 116.54, 155.56].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.65);
      gain.gain.setValueAtTime(0.032, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.68);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  public playCarHorn() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [349.23, 440].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  public playEmoteSound(emoteId: string) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (emoteId === 'wave') {
      [587.33, 783.99].forEach((f, i) => this.playNote(f, 0.14, 'sine', 0.05, i * 0.08));
    } else if (emoteId === 'dance') {
      [261.63, 329.63, 392.0, 523.25].forEach((f, i) => this.playNote(f, 0.16, 'triangle', 0.045, i * 0.09));
    } else if (emoteId === 'laugh') {
      [520, 620, 580, 680].forEach((f, i) => this.playNote(f, 0.09, 'sine', 0.045, i * 0.075));
    } else if (emoteId === 'clap') {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(920 - i * 40, now + i * 0.12);
        osc.frequency.exponentialRampToValueAtTime(220, now + i * 0.12 + 0.045);
        gain.gain.setValueAtTime(0.04, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.05);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.055);
      }
    } else {
      [440, 554.37, 659.25].forEach((f, i) => this.playNote(f, 0.24, 'sine', 0.045, i * 0.05));
    }
  }

  public playVoiceCadence(baseFreq: number, eerie = false) {
    const offsets = eerie ? [0, -18, -32] : [0, 28, 12];
    offsets.forEach((off, i) => {
      this.playNote(Math.max(90, baseFreq + off), 0.11, eerie ? 'triangle' : 'sine', 0.02, i * 0.065);
    });
  }

  public playFootstep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const pitch = 95 + (Math.random() - 0.5) * 16;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.04);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playNote(freq: number, duration = 0.22, type: OscillatorType = 'triangle', vol = 0.05, delay = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public startMusic(station: MusicStation) {
    if (this.muted || station === 'off') return;
    this.stopMusic();
    this.station = station;

    const scales: Record<Exclude<MusicStation, 'off'>, number[]> = {
      holiday: [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 783.99, 1046.5],
      lounge: [293.66, 349.23, 440.0, 523.25, 392.0, 349.23, 329.63, 293.66],
      runway: [220.0, 261.63, 329.63, 440.0, 392.0, 329.63, 293.66, 261.63],
      campus: [392.0, 440.0, 493.88, 587.33, 523.25, 493.88, 440.0, 392.0],
      horror: [130.81, 138.59, 196.0, 146.83, 123.47, 130.81, 185.0, 116.54],
    };

    const intervalMs =
      station === 'runway'
        ? 320
        : station === 'holiday'
          ? 520
          : station === 'horror'
            ? 840
            : station === 'campus'
              ? 460
              : 680;
    this.musicTimer = window.setInterval(() => {
      if (this.muted || document.hidden) return;
      const notes = scales[station];
      const note = notes[this.stepIdx % notes.length];
      this.stepIdx++;
      this.playNote(
        note,
        station === 'holiday' ? 0.35 : station === 'horror' ? 0.55 : 0.26,
        station === 'holiday' || station === 'horror' ? 'sine' : 'triangle',
        station === 'horror' ? 0.018 : 0.022,
      );
    }, intervalMs);
  }

  public stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
