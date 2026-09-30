/**
 * Procedural Web Audio API sound generator and rhythmic music synthesizer.
 * Operates 100% locally with zero external network APIs and comprehensive error checking.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    this.isMuted = false;
    this.isMusicMuted = false;
    this.masterVolume = 0.65;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.55;

    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.currentBpm = 130;
    this.stepCounter = 0;
    this.theme = 'cyber_cyan';
  }

  /**
   * Initializes the AudioContext safely.
   */
  init() {
    if (this.ctx) return true;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API is not supported in this environment.');
        return false;
      }

      this.ctx = new AudioContextClass();

      // Master output node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Music bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      return true;
    } catch (err) {
      console.error('Failed to initialize AudioContext:', err);
      this.ctx = null;
      return false;
    }
  }

  /**
   * Ensure audio context is resumed (browsers require user interaction).
   */
  async ensureRunning() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume failed:', err);
      }
    }
  }

  setMute(muted) {
    this.isMuted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(
          this.isMuted ? 0 : this.masterVolume,
          this.ctx.currentTime
        );
      } catch (e) {
        console.warn('Error setting mute state:', e);
      }
    }
  }

  setMusicMuted(muted) {
    this.isMusicMuted = Boolean(muted);
    if (this.musicGain && this.ctx) {
      try {
        this.musicGain.gain.setValueAtTime(
          this.isMusicMuted ? 0 : this.musicVolume,
          this.ctx.currentTime
        );
      } catch (e) {
        console.warn('Error setting music mute state:', e);
      }
    }
  }

  toggleMusicMute() {
    this.setMusicMuted(!this.isMusicMuted);
    return this.isMusicMuted;
  }

  setVolume(volume) {
    const clamped = Math.max(0, Math.min(1, Number(volume) || 0));
    this.masterVolume = clamped;
    if (this.masterGain && this.ctx && !this.isMuted) {
      try {
        this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
      } catch (e) {
        console.warn('Error setting volume:', e);
      }
    }
  }

  /* ------------------- SFX GENERATORS ------------------- */

  playJump() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Audio error suppressed safely
    }
  }

  playOrbHit() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [660, 880, 1320].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);
        gain.gain.setValueAtTime(0.25, now + idx * 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + idx * 0.02);
        osc.stop(now + 0.22);
      });
    } catch (e) {
      // Audio error suppressed safely
    }
  }

  playPadBounce() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.18);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      // Audio error caught
    }
  }

  playGravityFlip() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // Audio error caught
    }
  }

  playCrash() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      
      // Low punch oscillator
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      oscGain.gain.setValueAtTime(0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.3);

      // White noise explosion burst
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);
    } catch (e) {
      // Audio error caught
    }
  }

  playVictory() {
    if (!this.ctx || this.isMuted) return;
    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      notes.forEach((f, i) => {
        const time = this.ctx.currentTime + i * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, time);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.35);
      });
    } catch (e) {
      // Caught
    }
  }

  playCheckpoint() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Caught
    }
  }

  playShoot() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      // Audio error caught
    }
  }

  playHit() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      // Audio error caught
    }
  }

  playPunch() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      // Audio error caught
    }
  }

  playEnemyDeath() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.22);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      // Audio error caught
    }
  }

  playAlarm() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      // Audio error caught
    }
  }

  playClick() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Caught
    }
  }

  playCoin() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Dual-tone shimmering chime
      [987.77, 1318.51, 1975.53].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + i * 0.055;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch (e) {
      // Caught
    }
  }

  playDash() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.2);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      // Caught
    }
  }

  playSlam() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {
      // Caught
    }
  }

  /* ------------------- SYNTHESIZED SOUNDTRACK LOOP ------------------- */

  startRhythmTrack(bpm = 130, theme = 'cyber_cyan') {
    this.stopMusic();
    this.init();
    this.ensureRunning();

    this.currentBpm = Math.max(80, Math.min(200, Number(bpm) || 130));
    this.theme = theme;
    this.isPlayingMusic = true;
    this.stepCounter = 0;

    // 16th note interval in milliseconds
    const stepDurationMs = (60 / this.currentBpm / 4) * 1000;

    const playStep = () => {
      if (!this.isPlayingMusic || !this.ctx) return;

      try {
        const step = this.stepCounter % 16;
        const now = this.ctx.currentTime;

        // Bass drum kick on beats 0, 4, 8, 12
        if (step % 4 === 0) {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(130, now);
          kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
          kickGain.gain.setValueAtTime(0.45, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          kickOsc.connect(kickGain);
          kickGain.connect(this.musicGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.12);
        }

        // Hi-hat on off-beats (2, 6, 10, 14)
        if (step % 2 === 0 && step % 4 !== 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(8000, now);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 0.03);
        }

        // Bass synth sequence (Root, Minor 3rd, 5th, Octave)
        const bassNotes = [65.41, 65.41, 77.78, 65.41, 87.31, 77.78, 65.41, 98.00];
        const noteFreq = bassNotes[step % bassNotes.length];

        if (step % 2 === 0) {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          const bassFilter = this.ctx.createBiquadFilter();

          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(noteFreq, now);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(650, now);
          bassFilter.frequency.exponentialRampToValueAtTime(200, now + 0.14);

          bassGain.gain.setValueAtTime(0.25, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.musicGain);

          bassOsc.start(now);
          bassOsc.stop(now + 0.14);
        }

        // Synth Arpeggio lead melody
        const leadScale = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25];
        const leadNote = leadScale[(step * 3) % leadScale.length];

        if (step % 2 === 1) {
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = 'triangle';
          leadOsc.frequency.setValueAtTime(leadNote, now);
          leadGain.gain.setValueAtTime(0.12, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          leadOsc.connect(leadGain);
          leadGain.connect(this.musicGain);
          leadOsc.start(now);
          leadOsc.stop(now + 0.1);
        }

        this.stepCounter++;
      } catch (err) {
        console.warn('Rhythm step error:', err);
      }

      if (this.isPlayingMusic) {
        this.musicTimer = setTimeout(playStep, stepDurationMs);
      }
    };

    playStep();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new AudioEngine();
