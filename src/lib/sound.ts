/** Procedural clan audio. All tones are synthesized — no external files. */

export type SfxName = "strike" | "whoosh" | "drum" | "horn" | "chime" | "scrape" | "tick";

const MUSIC_KEY = "claspectros-music";
const SFX_KEY = "claspectros-sfx";
const MUTE_KEY = "claspectros-muted";

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function curve(level: number) {
  return clamp01(level) ** 2;
}

class SoundEngine {
  version = 0;
  unlocked = false;
  muted = false;
  musicLevel = 0.62;
  sfxLevel = 0.85;
  ambientOn = false;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private ambientGen = 0;
  private crackleTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private lastPlayed: Partial<Record<SfxName, number>> = {};
  private prefsLoaded = false;

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.version += 1;
    this.listeners.forEach((fn) => fn());
  }

  loadPrefs() {
    if (this.prefsLoaded || typeof window === "undefined") return;
    this.prefsLoaded = true;
    try {
      const music = localStorage.getItem(MUSIC_KEY);
      const sfx = localStorage.getItem(SFX_KEY);
      const muted = localStorage.getItem(MUTE_KEY);
      if (music != null) this.musicLevel = clamp01(Number(music));
      if (sfx != null) this.sfxLevel = clamp01(Number(sfx));
      if (muted != null) this.muted = muted === "1";
    } catch {
      /* private mode */
    }
    this.applyGains();
    this.emit();
  }

  /** Call synchronously inside a pointer/key gesture. */
  unlock() {
    if (typeof window === "undefined") return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!this.ctx) {
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noise = makeNoise(this.ctx, 2);
      this.applyGains(true);
    }

    if (this.ctx.state === "suspended") void this.ctx.resume();
    const became = !this.unlocked;
    this.unlocked = true;
    if (!this.muted) this.startAmbient();
    if (became) this.emit();
  }

  resumeIfNeeded() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(next: boolean) {
    this.muted = next;
    this.persist(MUTE_KEY, next ? "1" : "0");
    this.applyGains();
    if (next) this.stopAmbient();
    else if (this.unlocked) this.startAmbient();
    this.emit();
  }

  setMusicLevel(level: number) {
    this.musicLevel = clamp01(level);
    this.persist(MUSIC_KEY, String(this.musicLevel));
    this.applyGains();
    this.emit();
  }

  setSfxLevel(level: number) {
    this.sfxLevel = clamp01(level);
    this.persist(SFX_KEY, String(this.sfxLevel));
    this.applyGains();
    this.emit();
  }

  play(name: SfxName, minGap = 0) {
    if (!this.ctx || !this.sfx || !this.noise || !this.unlocked || this.muted) return;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const nowMs = performance.now();
    if (nowMs - (this.lastPlayed[name] ?? 0) < minGap) return;
    this.lastPlayed[name] = nowMs;

    const t = this.ctx.currentTime;
    const rate = 1 + (Math.random() * 2 - 1) * 0.06;
    switch (name) {
      case "strike":
        this.burst(t, 1400, 0.28, 0.07, rate);
        this.tone("triangle", 680 * rate, 360, t, 0.1, 0.16);
        break;
      case "whoosh":
        this.sweep(t, 280, 2200, 0.16, 0.22);
        break;
      case "drum":
        this.tone("sine", 96, 42, t, 0.42, 0.32);
        this.burst(t, 180, 0.2, 0.04, 1);
        break;
      case "horn":
        this.tone("sawtooth", 196, 262, t, 0.11, 0.62, 900);
        this.tone("triangle", 294, 392, t + 0.04, 0.05, 0.5, 1400);
        break;
      case "chime":
        this.tone("sine", 523.25 * rate, 523.25 * rate, t, 0.07, 0.45);
        this.tone("sine", 783.99, 783.99, t + 0.07, 0.05, 0.4);
        this.tone("sine", 1046.5, 1046.5, t + 0.13, 0.035, 0.36);
        break;
      case "scrape":
        this.sweep(t, 500, 1600, 0.12, 0.28);
        break;
      case "tick":
        this.tone("sine", 1480 * rate, 980, t, 0.045, 0.05);
        break;
      default:
        break;
    }
  }

  private persist(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  private applyGains(immediate = false) {
    if (!this.ctx || !this.master || !this.music || !this.sfx) return;
    const t = this.ctx.currentTime;
    const tau = immediate ? 0.01 : 0.04;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, tau);
    this.music.gain.setTargetAtTime(curve(this.musicLevel), t, tau);
    this.sfx.gain.setTargetAtTime(curve(this.sfxLevel), t, tau);
  }

  private startAmbient() {
    if (!this.ctx || !this.music || !this.noise || this.ambientOn || this.muted) return;
    const ctx = this.ctx;
    const bus = this.music;
    this.ambientOn = true;
    const gen = ++this.ambientGen;

    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 380;
    bp.Q.value = 0.55;
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, ctx.currentTime);
    wind.connect(bp);
    bp.connect(windGain);
    windGain.connect(bus);
    wind.start();
    windGain.gain.setTargetAtTime(0.34, ctx.currentTime, 0.6);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 160;
    lfo.connect(lfoAmt);
    lfoAmt.connect(bp.frequency);
    lfo.start();

    const drones: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
    const droneSpecs: Array<[number, OscillatorType, number]> = [
      [55, "sine", 0.16],
      [82.4, "sine", 0.07],
      [110, "triangle", 0.035],
    ];
    for (const [freq, type, level] of droneSpecs) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(g);
      g.connect(bus);
      osc.start();
      g.gain.setTargetAtTime(level, ctx.currentTime, 0.8);
      drones.push({ osc, gain: g });
    }

    this.scheduleCrackle(gen);

    const stop = () => {
      windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      for (const drone of drones) drone.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      window.setTimeout(() => {
        try {
          wind.stop();
          lfo.stop();
          for (const drone of drones) drone.osc.stop();
        } catch {
          /* already stopped */
        }
        wind.disconnect();
        lfo.disconnect();
      }, 260);
    };

    this.stopAmbientGraph = stop;
    this.ambientGraphGen = gen;
  }

  private stopAmbientGraph: (() => void) | null = null;
  private ambientGraphGen = 0;

  private scheduleCrackle(gen: number) {
    if (this.crackleTimer) clearTimeout(this.crackleTimer);
    const wait = 500 + Math.random() * 1700;
    this.crackleTimer = setTimeout(() => {
      if (!this.ambientOn || this.ambientGraphGen !== gen || this.muted) return;
      this.crackleOnce();
      this.scheduleCrackle(gen);
    }, wait);
  }

  private crackleOnce() {
    if (!this.ctx || !this.music || !this.noise) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1600 + Math.random() * 2400;
    const g = ctx.createGain();
    const dur = 0.04 + Math.random() * 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.music);
    src.start(t);
    src.stop(t + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      hp.disconnect();
      g.disconnect();
    };
  }

  private stopAmbient() {
    if (this.crackleTimer) {
      clearTimeout(this.crackleTimer);
      this.crackleTimer = null;
    }
    this.ambientOn = false;
    this.ambientGraphGen += 1;
    const stop = this.stopAmbientGraph;
    this.stopAmbientGraph = null;
    stop?.();
  }

  private tone(
    type: OscillatorType,
    from: number,
    to: number,
    when: number,
    peak: number,
    dur: number,
    cutoff?: number,
  ) {
    if (!this.ctx || !this.sfx) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), when);
    if (Math.abs(from - to) > 1) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + dur);
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + Math.min(0.03, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    let node: AudioNode = osc;
    let filter: BiquadFilterNode | null = null;
    if (cutoff) {
      filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.max(40, cutoff * 0.6), when);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, cutoff), when + dur * 0.7);
      osc.connect(filter);
      node = filter;
    }
    node.connect(g);
    g.connect(this.sfx);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      filter?.disconnect();
      g.disconnect();
    };
  }

  private burst(when: number, hpFreq: number, peak: number, dur: number, rate: number) {
    if (!this.ctx || !this.sfx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rate;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hpFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.sfx);
    src.start(when);
    src.stop(when + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      hp.disconnect();
      g.disconnect();
    };
  }

  private sweep(when: number, from: number, to: number, peak: number, dur: number) {
    if (!this.ctx || !this.sfx || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(from, when);
    bp.frequency.exponentialRampToValueAtTime(to, when + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfx);
    src.start(when);
    src.stop(when + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      bp.disconnect();
      g.disconnect();
    };
  }
}

export const sound = new SoundEngine();

function makeNoise(ctx: AudioContext, seconds: number) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last;
  }
  let max = 0;
  for (let i = 0; i < length; i++) max = Math.max(max, Math.abs(data[i]!));
  const norm = max > 0 ? 0.85 / max : 1;
  for (let i = 0; i < length; i++) data[i] = data[i]! * norm;
  return buffer;
}
