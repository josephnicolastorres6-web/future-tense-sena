/* =====================================================================
   audio.js — All sound effects are synthesized live with the Web Audio
   API. No MP3/WAV files → nothing to download, nothing to break.
   ===================================================================== */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let muted = false;

  /** Lazily create (and resume) the AudioContext — browsers require a user gesture. */
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** MIDI note number → frequency (Hz) */
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /** Generic oscillator voice with a simple envelope. */
  function tone({ f = 440, type = 'sine', t = 0, d = 0.2, v = 0.25, a = 0.01, to = null, lp = null, detune = 0 } = {}) {
    const c = getCtx();
    if (!c || muted) return;
    const t0 = c.currentTime + t;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    let node = o;
    if (lp) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = lp;
      o.connect(fl);
      node = fl;
    }
    node.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + d + 0.05);
  }

  /** Filtered white-noise burst (snares, whooshes, cymbals). */
  function noise({ t = 0, d = 0.15, v = 0.2, f = 1000, q = 1, type = 'bandpass', fTo = null } = {}) {
    const c = getCtx();
    if (!c || muted) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + t;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t0);
    fl.Q.value = q;
    if (fTo) fl.frequency.exponentialRampToValueAtTime(fTo, t0 + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + Math.min(0.02, d / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(fl);
    fl.connect(g);
    g.connect(master);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + d + 0.05);
  }

  /** Brass-like voice: two detuned saws through a low-pass filter. */
  function brass(n, t, d, v = 0.09) {
    tone({ f: N(n), type: 'sawtooth', t, d, v, a: 0.03, lp: 2400, detune: -7 });
    tone({ f: N(n), type: 'sawtooth', t, d, v, a: 0.03, lp: 2400, detune: 7 });
  }

  // ---------------- Public sound palette ----------------
  const click = () => tone({ f: N(84), type: 'triangle', d: 0.07, v: 0.12 });

  const flip = () => {
    tone({ f: N(76), to: N(88), type: 'sine', d: 0.18, v: 0.14 });
    noise({ d: 0.12, v: 0.05, f: 3000 });
  };

  const whoosh = () => noise({ d: 0.38, v: 0.12, f: 400, fTo: 4200, q: 0.8 });

  const start = () => {
    [60, 64, 67, 72].forEach((n, i) => tone({ f: N(n), type: 'square', t: i * 0.09, d: 0.18, v: 0.09, lp: 3200 }));
    [72, 76, 79, 84].forEach((n) => tone({ f: N(n), type: 'triangle', t: 0.38, d: 0.8, v: 0.11 }));
    noise({ t: 0.36, d: 0.5, v: 0.07, f: 6000, type: 'highpass' });
  };

  const tick = (urgent) => {
    tone({ f: urgent ? N(93) : N(86), type: 'square', d: 0.05, v: 0.08, lp: 5000 });
    noise({ d: 0.03, v: 0.05, f: 5000 });
  };

  const countBlip = (final) => tone({ f: final ? N(84) : N(72), type: 'triangle', d: final ? 0.35 : 0.16, v: 0.18 });

  const correct = () => {
    [72, 76, 79, 84].forEach((n, i) => tone({ f: N(n), type: 'triangle', t: i * 0.07, d: 0.32, v: 0.16 }));
    [84, 88, 91].forEach((n) => tone({ f: N(n), type: 'sine', t: 0.3, d: 0.7, v: 0.07 }));
    tone({ f: N(96), type: 'sine', t: 0.34, d: 0.6, v: 0.05 });
    noise({ t: 0.28, d: 0.4, v: 0.04, f: 8000, type: 'highpass' });
  };

  const wrong = () => {
    tone({ f: 150, type: 'sawtooth', d: 0.6, v: 0.16, lp: 900 });
    tone({ f: 157, type: 'sawtooth', d: 0.6, v: 0.16, lp: 900 });
    tone({ f: 110, to: 70, type: 'square', t: 0.05, d: 0.55, v: 0.08, lp: 600 });
  };

  const timeUp = () => {
    tone({ f: N(76), type: 'square', d: 0.12, v: 0.08, lp: 2500 });
    tone({ f: N(72), type: 'square', t: 0.14, d: 0.12, v: 0.08, lp: 2500 });
    setTimeout(wrong, 260);
  };

  const drumroll = (dur = 2.6) => {
    const hits = Math.floor(dur / 0.045);
    for (let i = 0; i < hits; i++) {
      noise({ t: i * 0.045, d: 0.07, v: 0.03 + 0.12 * (i / hits), f: 1800, q: 0.7 });
    }
    noise({ t: dur, d: 1.4, v: 0.16, f: 5000, type: 'highpass' }); // cymbal crash
    tone({ f: 55, type: 'sine', t: dur, d: 0.6, v: 0.3 });            // kick
  };

  const fanfare = () => {
    // "ta-ta-ta TAAA — ta TAAAAA"
    brass(67, 0, 0.12); brass(67, 0.13, 0.12); brass(67, 0.26, 0.12);
    brass(72, 0.39, 0.5);
    brass(67, 0.92, 0.14);
    brass(72, 1.08, 1.3, 0.1);
    brass(76, 1.08, 1.3, 0.07);
    brass(79, 1.08, 1.3, 0.07);
    tone({ f: N(48), type: 'triangle', t: 1.08, d: 1.3, v: 0.2 });
    noise({ t: 1.08, d: 1.6, v: 0.12, f: 6000, type: 'highpass' });
  };

  return {
    unlock: getCtx,
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    click, flip, whoosh, start, tick, countBlip, correct, wrong, timeUp, drumroll, fanfare,
  };
})();
