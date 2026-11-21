import React, { useEffect, useState } from 'react';
import {
  X,
  Compass,
  Globe2,
  Skull,
  Hammer,
  Sparkles,
  BookOpen,
  Gamepad2,
  Play,
  Volume2,
  CheckCircle2,
  Search,
  MapPin,
} from 'lucide-react';
import {
  ARCADE_GAMES,
  DARKSIDE_HORROR_EXPERIENCES,
  DISTRICTS,
  GLOBAL_DESTINATIONS,
  STORY_ARCS,
} from '../game/catalog';
import {
  completeHorrorExperience,
  playCreatorExperience,
  publishCreatorExperience,
} from '../game/rules';
import type {
  CreatorExperienceDef,
  DistrictId,
  HorrorExperienceDef,
  PlayerSaveState,
} from '../game/types';
import { soundEngine } from '../three/soundEngine';
import { voiceEngine } from '../three/voiceEngine';

export type HubTab = 'discover' | 'worlds' | 'horror' | 'create';

interface ExperiencesHubModalProps {
  isOpen: boolean;
  initialTab?: HubTab;
  onClose: () => void;
  playerState: PlayerSaveState;
  onUpdateState: (next: PlayerSaveState) => void;
  onTeleportDistrict: (district: DistrictId) => void;
  onOpenStory: (arcId?: string) => void;
  onOpenArcade: () => void;
  onShowToast: (msg: string) => void;
}

export const ExperiencesHubModal: React.FC<ExperiencesHubModalProps> = ({
  isOpen,
  initialTab = 'discover',
  onClose,
  playerState,
  onUpdateState,
  onTeleportDistrict,
  onOpenStory,
  onOpenArcade,
  onShowToast,
}) => {
  const [tab, setTab] = useState<HubTab>(initialTab);
  const [search, setSearch] = useState('');

  // Active DARKSIDE Horror run
  const [activeHorror, setActiveHorror] = useState<HorrorExperienceDef | null>(null);
  const [horrorStepIdx, setHorrorStepIdx] = useState(0);
  const [horrorMistakes, setHorrorMistakes] = useState(0);
  const [horrorFeedback, setHorrorFeedback] = useState<string | null>(null);
  const [horrorCompletedMsg, setHorrorCompletedMsg] = useState<string | null>(null);

  // Active Creator Experience playtest
  const [activeCustom, setActiveCustom] = useState<CreatorExperienceDef | null>(null);

  // Creator Lab Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CreatorExperienceDef['category']>('Campus');
  const [description, setDescription] = useState('');
  const [promptLine, setPromptLine] = useState('');
  const [rewardCoins, setRewardCoins] = useState(140);
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const [creatorSuccess, setCreatorSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    } else {
      voiceEngine.stop();
      setActiveHorror(null);
      setActiveCustom(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const startHorror = (exp: HorrorExperienceDef) => {
    setActiveHorror(exp);
    setHorrorStepIdx(0);
    setHorrorMistakes(0);
    setHorrorFeedback(null);
    setHorrorCompletedMsg(null);
    soundEngine.playHorrorStinger();
    if (!playerState.settings.audioMuted && playerState.settings.musicStation !== 'off') {
      soundEngine.setStation('horror');
    }
    const step = exp.steps[0];
    if (step) {
      voiceEngine.speak(`${exp.title}. ${step.narrative}`, 'horror');
    }
  };

  const handleHorrorChoice = (correct: boolean, feedback: string) => {
    if (!activeHorror) return;
    setHorrorFeedback(feedback);
    const nextMistakes = correct ? horrorMistakes : horrorMistakes + 1;
    if (!correct) {
      setHorrorMistakes(nextMistakes);
      soundEngine.playHorrorStinger();
    } else {
      soundEngine.playClick();
    }

    const nextIdx = horrorStepIdx + 1;
    if (nextIdx < activeHorror.steps.length) {
      setHorrorStepIdx(nextIdx);
      const nextStep = activeHorror.steps[nextIdx];
      voiceEngine.speak(nextStep.narrative, 'horror');
    } else {
      const res = completeHorrorExperience(playerState, activeHorror.id, nextMistakes);
      onUpdateState(res.nextState);
      soundEngine.playSuccessFanfare();
      voiceEngine.speak(`You survived ${activeHorror.title}!`, 'narrator');
      setHorrorCompletedMsg(
        `Survived ${activeHorror.title}! Earned +${res.earnedCoins} MC & +${res.earnedLumina} Lumina.`,
      );
      onShowToast(`DARKSIDE Cleared: +${res.earnedCoins} MC & +${res.earnedLumina} LM`);
    }
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setCreatorError(null);
    setCreatorSuccess(null);
    const res = publishCreatorExperience(playerState, {
      title,
      category,
      description,
      promptLine,
      rewardCoins,
    });
    if (!res.ok || !res.experience) {
      setCreatorError(res.error || 'Could not publish experience.');
      return;
    }
    onUpdateState(res.nextState);
    soundEngine.playSuccessFanfare();
    voiceEngine.speak(`Published ${res.experience.title} to Mikay Discover!`, 'narrator');
    setCreatorSuccess(`Published "${res.experience.title}"! (+75 MC & +15 LM Creator Bonus)`);
    onShowToast(`Published ${res.experience.title} to Experiences Hub!`);
    setTitle('');
    setDescription('');
    setPromptLine('');
  };

  const query = search.trim().toLowerCase();
  const customList = (playerState.customExperiences || []).filter(
    (c) => !query || c.title.toLowerCase().includes(query) || c.category.toLowerCase().includes(query),
  );
  const horrorList = DARKSIDE_HORROR_EXPERIENCES.filter(
    (h) => !query || h.title.toLowerCase().includes(query) || h.setting.toLowerCase().includes(query),
  );
  const storyList = STORY_ARCS.filter(
    (s) => !query || s.title.toLowerCase().includes(query) || s.genre.toLowerCase().includes(query),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Mikay's Simulation Experiences Hub"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-[#110a1e] border border-purple-300/25 text-[#f6f3fa] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0b0614]">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-purple-300 font-semibold">
              Mikay&apos;s Simulation · One Universe, Infinite Lives
            </div>
            <h2 className="font-display text-2xl font-semibold text-white">
              Discover, Worlds, DARKSIDE &amp; Creator Lab
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Experiences Hub"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-white/10 bg-[#150e24]">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['discover', 'Discover', Compass],
                ['worlds', 'Worlds', Globe2],
                ['horror', 'DARKSIDE Horror', Skull],
                ['create', 'Creator Lab', Hammer],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveHorror(null);
                  setActiveCustom(null);
                  setTab(id);
                }}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                  tab === id
                    ? id === 'horror'
                      ? 'bg-rose-700 border-rose-400 text-white'
                      : 'bg-purple-600 border-purple-400 text-white'
                    : 'bg-[#1c1330] border-white/10 text-purple-200 hover:border-purple-400/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {(tab === 'discover' || tab === 'horror') && !activeHorror && !activeCustom && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-purple-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search experiences..."
                aria-label="Search experiences"
                className="w-full min-h-[36px] rounded-xl bg-[#0b0614] border border-white/15 pl-8 pr-3 text-xs text-white"
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Active Creator Experience Runner */}
          {activeCustom && (
            <div className="rounded-2xl bg-[#1b122c] border border-purple-400/35 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300">
                  {activeCustom.category} · Created by {activeCustom.creatorName}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveCustom(null)}
                  className="text-xs underline text-purple-200"
                >
                  Back to Discover
                </button>
              </div>
              <h3 className="font-display text-2xl font-semibold text-white">{activeCustom.title}</h3>
              <p className="text-sm text-purple-100/80">{activeCustom.description}</p>
              <div className="rounded-xl bg-[#100a1b] border border-white/10 p-4 text-sm text-purple-50 leading-relaxed">
                {activeCustom.promptLine}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => voiceEngine.speak(activeCustom.promptLine, 'narrator')}
                  className="min-h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Voice Intro</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = playCreatorExperience(playerState, activeCustom.id);
                    onUpdateState(res.nextState);
                    soundEngine.playSuccessFanfare();
                    onShowToast(
                      `Completed "${activeCustom.title}" (+${res.earnedCoins} MC, +10 LM)!`,
                    );
                    setActiveCustom(null);
                  }}
                  className="min-h-[42px] px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Challenge (+{activeCustom.rewardCoins} MC &amp; +10 LM)</span>
                </button>
              </div>
            </div>
          )}

          {/* Active DARKSIDE Horror Runner */}
          {activeHorror && (
            <div className="rounded-2xl bg-[#140914] border border-rose-500/35 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-rose-400">
                    DARKSIDE · {activeHorror.difficulty} · {activeHorror.setting}
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white">
                    {activeHorror.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    voiceEngine.stop();
                    setActiveHorror(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium"
                >
                  Exit Investigation
                </button>
              </div>

              {horrorFeedback && (
                <div className="rounded-xl bg-rose-950/60 border border-rose-400/30 px-4 py-3 text-xs text-rose-100">
                  {horrorFeedback}
                </div>
              )}

              {horrorCompletedMsg ? (
                <div className="rounded-xl bg-[#13221c] border border-emerald-400/35 p-5 space-y-3">
                  <div className="text-xs font-semibold text-emerald-300">Investigation Survived</div>
                  <div className="text-base font-semibold text-white">{horrorCompletedMsg}</div>
                  <button
                    type="button"
                    onClick={() => setActiveHorror(null)}
                    className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                  >
                    Back to DARKSIDE Catalog
                  </button>
                </div>
              ) : (
                (() => {
                  const step = activeHorror.steps[horrorStepIdx];
                  if (!step) return null;
                  return (
                    <div className="space-y-4">
                      <div className="rounded-xl bg-[#0d050f] border border-white/10 p-5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-rose-300">
                          <span>
                            {step.title} · {step.location}
                          </span>
                          <button
                            type="button"
                            onClick={() => voiceEngine.speak(step.narrative, 'horror')}
                            className="flex items-center gap-1 underline text-rose-200"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Speak Scene</span>
                          </button>
                        </div>
                        <p className="text-sm sm:text-base text-purple-50 leading-relaxed">
                          {step.narrative}
                        </p>
                        <div className="rounded-lg bg-amber-950/35 border border-amber-400/20 px-3 py-2 text-xs text-amber-200">
                          Clue: {step.clueText}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {step.choices.map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => handleHorrorChoice(ch.correct, ch.feedback)}
                            className="w-full min-h-[48px] rounded-xl bg-[#1c0f22] hover:bg-rose-800/35 border border-rose-300/20 px-4 py-3 text-left text-xs sm:text-sm font-medium text-white transition"
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* DISCOVER TAB */}
          {tab === 'discover' && !activeHorror && !activeCustom && (
            <div className="space-y-6">
              {/* Featured Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-[#281347] via-[#1c1033] to-[#290d22] border border-purple-300/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Featured Platform Spotlight</span>
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white">
                    DARKSIDE: The Last Floor &amp; Mikay Campus
                  </h3>
                  <p className="text-xs text-purple-100/80 max-w-xl">
                    Play 10 voiced horror mysteries, 12 branching Mikay Stories, 12 Arcade games, or publish your own experience inside Mikay Creator Lab.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTab('horror')}
                    className="min-h-[42px] px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-xs font-semibold text-white"
                  >
                    Enter DARKSIDE
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className="min-h-[42px] px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white"
                  >
                    Create Experience
                  </button>
                </div>
              </div>

              {/* Creator-Made Experiences */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Creator-Made &amp; Campus Experiences ({customList.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className="text-xs text-purple-300 underline"
                  >
                    + Build New
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customList.map((ce) => (
                    <div
                      key={ce.id}
                      className="rounded-xl bg-[#1a112b] border border-white/10 p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="text-[11px] font-semibold text-purple-300">
                          {ce.category} · by {ce.creatorName}
                        </div>
                        <div className="text-sm font-semibold text-white mt-0.5">{ce.title}</div>
                        <p className="text-xs text-purple-100/75 mt-1">{ce.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setActiveCustom(ce);
                        }}
                        className="min-h-[38px] w-full rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Play (+{ce.rewardCoins} MC)</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Interactive Stories */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Popular Mikay Stories ({storyList.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => onOpenStory()}
                    className="text-xs text-purple-300 underline"
                  >
                    Open Full Library
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {storyList.slice(0, 6).map((arc) => (
                    <div
                      key={arc.id}
                      className="rounded-xl bg-[#1a112b] border border-white/10 p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="text-[11px] font-semibold text-amber-300">{arc.genre}</div>
                        <div className="text-sm font-semibold text-white mt-0.5">{arc.title}</div>
                        <p className="text-xs text-purple-100/75 mt-1 line-clamp-2">{arc.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenStory(arc.id)}
                        className="min-h-[38px] w-full rounded-lg bg-white/10 hover:bg-purple-600 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read &amp; Decide</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Arcade Quick Launch */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Simulation &amp; Arcade Challenges ({ARCADE_GAMES.length})
                  </h3>
                  <button
                    type="button"
                    onClick={onOpenArcade}
                    className="text-xs text-purple-300 underline flex items-center gap-1"
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Open Arcade</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* WORLDS TAB */}
          {tab === 'worlds' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(DISTRICTS) as DistrictId[]).map((id) => {
                  const d = DISTRICTS[id];
                  const locked = id === 'sanctuary' && !playerState.unlockedSanctuary;
                  const here = playerState.activeDistrict === id;
                  return (
                    <div
                      key={id}
                      className="rounded-xl bg-[#1a112b] border border-white/10 p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: d.accentHex }}>
                            {here ? 'Current World' : locked ? 'Locked Sanctuary' : 'Open World Hub'}
                          </span>
                          <MapPin className="w-4 h-4" style={{ color: d.accentHex }} />
                        </div>
                        <h3 className="font-display text-xl font-semibold text-white mt-0.5">{d.name}</h3>
                        <p className="text-xs text-purple-100/75 mt-1">{d.subtitle}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {d.highlights.slice(0, 4).map((h) => (
                            <span
                              key={h}
                              className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-purple-200/80"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          onTeleportDistrict(id);
                          onClose();
                        }}
                        className="min-h-[40px] w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-45 text-xs font-semibold"
                      >
                        {locked
                          ? 'Unlock at 90 Rep or 2 Clues'
                          : here
                            ? 'Already Exploring'
                            : `Travel to ${d.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <section className="space-y-2.5">
                <h3 className="text-sm font-semibold text-white">
                  Global Districts &amp; City Routes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {GLOBAL_DESTINATIONS.map((gd) => (
                    <button
                      key={gd.id}
                      type="button"
                      onClick={() => {
                        onTeleportDistrict(gd.hubDistrict);
                        onShowToast(`Flew to ${gd.city} (${gd.districtLabel})!`);
                        onClose();
                      }}
                      className="rounded-xl bg-[#160f26] hover:bg-purple-600/25 border border-white/10 p-3 text-left transition"
                    >
                      <div className="text-xs font-semibold text-white">{gd.city}</div>
                      <div className="text-[11px] text-amber-300">{gd.districtLabel}</div>
                      <div className="text-[10px] text-purple-200/70 mt-0.5">{gd.theme}</div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* DARKSIDE HORROR TAB */}
          {tab === 'horror' && !activeHorror && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#1e0b16] border border-rose-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-rose-300">DARKSIDE: Mikay Horror Experiences</div>
                  <p className="text-xs text-rose-100/80">
                    10 suspenseful mysteries with eerie sound stingers &amp; Lumina prestige rewards.
                  </p>
                </div>
                <div className="text-xs font-mono-nums text-amber-300 shrink-0">
                  Cleared {playerState.completedHorror.length} / {DARKSIDE_HORROR_EXPERIENCES.length}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {horrorList.map((h) => {
                  const cleared = playerState.completedHorror.includes(h.id);
                  return (
                    <div
                      key={h.id}
                      className="rounded-xl bg-[#160b18] border border-rose-400/20 p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-rose-300 font-semibold">{h.difficulty}</span>
                          <span className="text-amber-300 font-mono-nums">
                            +{h.coinReward} MC · +{h.luminaReward} LM
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-semibold text-white mt-0.5">
                          {h.title} {cleared ? '· Survived' : ''}
                        </h3>
                        <div className="text-[11px] text-purple-200/65">{h.setting}</div>
                        <p className="text-xs text-purple-100/80 mt-1.5">{h.tagline}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startHorror(h)}
                        className="min-h-[40px] w-full rounded-xl bg-rose-700 hover:bg-rose-600 text-xs font-semibold text-white"
                      >
                        {cleared ? 'Replay Investigation' : 'Enter Experience'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MIKAY CREATOR LAB TAB */}
          {tab === 'create' && (
            <form onSubmit={handlePublish} className="space-y-4 max-w-2xl">
              <div className="rounded-xl bg-[#1a112b] border border-purple-300/20 p-4">
                <h3 className="font-display text-xl font-semibold text-white">Mikay Creator Lab</h3>
                <p className="text-xs text-purple-200/75 mt-1">
                  Build and publish your own custom Roleplay, Campus, Mystery, Runway, or Horror experience to Mikay&apos;s Discover catalog.
                </p>
              </div>

              {creatorError && (
                <div className="rounded-xl bg-rose-950/70 border border-rose-400/40 px-4 py-2.5 text-xs text-rose-200">
                  {creatorError}
                </div>
              )}
              {creatorSuccess && (
                <div className="rounded-xl bg-emerald-950/70 border border-emerald-400/40 px-4 py-2.5 text-xs text-emerald-200">
                  {creatorSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="creator-exp-title" className="block text-xs text-purple-200/80 mb-1">
                    Experience Title
                  </label>
                  <input
                    id="creator-exp-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Midnight Dorm Mystery"
                    className="w-full min-h-[42px] rounded-xl bg-[#0a0612] border border-white/15 px-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="creator-exp-cat" className="block text-xs text-purple-200/80 mb-1">
                    Experience Category
                  </label>
                  <select
                    id="creator-exp-cat"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as CreatorExperienceDef['category'])
                    }
                    className="w-full min-h-[42px] rounded-xl bg-[#0a0612] border border-white/15 px-3 text-xs text-white"
                  >
                    <option value="Campus">Campus</option>
                    <option value="Roleplay">Roleplay</option>
                    <option value="Mystery">Mystery</option>
                    <option value="Horror">Horror</option>
                    <option value="Runway">Runway</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="creator-exp-desc" className="block text-xs text-purple-200/80 mb-1">
                  Description
                </label>
                <input
                  id="creator-exp-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the objective, world mood, and players..."
                  className="w-full min-h-[42px] rounded-xl bg-[#0a0612] border border-white/15 px-3 text-xs text-white"
                />
              </div>

              <div>
                <label htmlFor="creator-exp-prompt" className="block text-xs text-purple-200/80 mb-1">
                  Opening Scene Voice Line
                </label>
                <textarea
                  id="creator-exp-prompt"
                  rows={2}
                  value={promptLine}
                  onChange={(e) => setPromptLine(e.target.value)}
                  placeholder="Welcome players when they spawn inside your experience..."
                  className="w-full rounded-xl bg-[#0a0612] border border-white/15 p-3 text-xs text-white"
                />
              </div>

              <div>
                <label htmlFor="creator-exp-reward" className="block text-xs text-purple-200/80 mb-1">
                  Player Completion Reward ({rewardCoins} MC)
                </label>
                <input
                  id="creator-exp-reward"
                  type="range"
                  min={60}
                  max={250}
                  step={10}
                  value={rewardCoins}
                  onChange={(e) => setRewardCoins(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    voiceEngine.speak(
                      promptLine.trim() || 'Welcome to my Mikay Creator Lab experience!',
                      category === 'Horror' ? 'horror' : 'narrator',
                    )
                  }
                  className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Test Voice Line</span>
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white"
                >
                  Publish to Mikay Discover
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
