import { soundEngine } from './soundEngine';

export type VoicePersona = 'narrator' | 'npc_warm' | 'youth' | 'executive' | 'horror' | 'player';

interface PersonaTuning {
  pitch: number;
  rate: number;
  baseFreq: number;
}

const PERSONA_TUNING: Record<VoicePersona, PersonaTuning> = {
  narrator: { pitch: 1.0, rate: 0.96, baseFreq: 320 },
  npc_warm: { pitch: 1.15, rate: 1.0, baseFreq: 390 },
  youth: { pitch: 1.24, rate: 1.05, baseFreq: 440 },
  executive: { pitch: 0.9, rate: 0.95, baseFreq: 260 },
  horror: { pitch: 0.72, rate: 0.82, baseFreq: 185 },
  player: { pitch: 1.1, rate: 1.06, baseFreq: 370 },
};

class VoiceEngine {
  private voicesEnabled = true;

  public setVoicesEnabled(enabled: boolean) {
    this.voicesEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public isVoicesEnabled(): boolean {
    return this.voicesEnabled;
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore synthesis errors
      }
    }
  }

  public speak(text: string, persona: VoicePersona = 'narrator') {
    const clean = text.trim();
    if (!clean || !this.voicesEnabled || soundEngine.isMuted()) return;
    if (typeof window === 'undefined') return;

    const tuning = PERSONA_TUNING[persona] || PERSONA_TUNING.narrator;
    soundEngine.playVoiceCadence(tuning.baseFreq, persona === 'horror');

    if ('speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function') {
      try {
        window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(clean.slice(0, 260));
        utter.pitch = tuning.pitch;
        utter.rate = tuning.rate;
        utter.volume = 0.85;
        const available = window.speechSynthesis.getVoices?.() || [];
        if (available.length > 0) {
          const english = available.filter((v) => v.lang.startsWith('en'));
          const pool = english.length > 0 ? english : available;
          const idx =
            persona === 'horror' || persona === 'executive'
              ? Math.min(pool.length - 1, 1)
              : 0;
          utter.voice = pool[idx];
        }
        window.speechSynthesis.speak(utter);
      } catch {
        // Web Speech unavailable or blocked prior to user gesture; Web Audio cadence already played
      }
    }
  }

  public speakEmote(emoteLabel: string) {
    const lines: Record<string, string> = {
      Wave: 'Hey there!',
      Dance: 'Feel the rhythm!',
      Laugh: 'Haha, that is amazing!',
      Clap: 'Bravo, everyone!',
      Pose: 'Watch this spotlight!',
    };
    this.speak(lines[emoteLabel] || emoteLabel, 'player');
  }
}

export const voiceEngine = new VoiceEngine();
