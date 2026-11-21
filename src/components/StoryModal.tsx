import React, { useEffect, useState } from 'react';
import { X, BookOpen, ArrowRight, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { STORY_ARCS } from '../game/catalog';
import { evaluateStoryChoice } from '../game/rules';
import type { PlayerSaveState, StoryArc } from '../game/types';
import { soundEngine } from '../three/soundEngine';
import { voiceEngine } from '../three/voiceEngine';

interface StoryModalProps {
  isOpen: boolean;
  initialArcId?: string | null;
  onClose: () => void;
  playerState: PlayerSaveState;
  onUpdateState: (next: PlayerSaveState) => void;
}

const GENRES = ['All', 'Campus', 'Romance', 'Ambition', 'Mystery', 'Fashion', 'Holiday'] as const;

export const StoryModal: React.FC<StoryModalProps> = ({
  isOpen,
  initialArcId = null,
  onClose,
  playerState,
  onUpdateState,
}) => {
  const [selectedArc, setSelectedArc] = useState<StoryArc | null>(null);
  const [nodeId, setNodeId] = useState<string>('start');
  const [lastConsequence, setLastConsequence] = useState<string | null>(null);
  const [genreFilter, setGenreFilter] = useState<(typeof GENRES)[number]>('All');

  useEffect(() => {
    if (isOpen && initialArcId) {
      const found = STORY_ARCS.find((a) => a.id === initialArcId);
      if (found) {
        setSelectedArc(found);
        setNodeId(found.startNodeId);
        setLastConsequence(null);
      }
    }
  }, [isOpen, initialArcId]);

  const currentNode = selectedArc ? selectedArc.nodes[nodeId] : null;
  const voicesOn = playerState.settings.voicesEnabled && !playerState.settings.audioMuted;

  useEffect(() => {
    if (!isOpen || !currentNode) return;
    if (voicesOn) {
      voiceEngine.speak(currentNode.text, currentNode.voicePersona || 'narrator');
    }
  }, [isOpen, selectedArc?.id, nodeId, currentNode, voicesOn]);

  useEffect(() => {
    if (!isOpen) {
      voiceEngine.stop();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startArc = (arc: StoryArc) => {
    setSelectedArc(arc);
    setNodeId(arc.startNodeId);
    setLastConsequence(null);
    soundEngine.playClick();
  };

  const handleChoice = (choiceId: string) => {
    if (!selectedArc) return;
    const res = evaluateStoryChoice(playerState, selectedArc, nodeId, choiceId);
    onUpdateState(res.nextState);
    setNodeId(res.nextNodeId);
    setLastConsequence(res.consequence);
    const nextNode = selectedArc.nodes[res.nextNodeId];
    if (nextNode?.endingTitle) {
      soundEngine.playSuccessFanfare();
    } else {
      soundEngine.playCoinChime();
    }
  };

  const toggleVoices = () => {
    const nextEnabled = !playerState.settings.voicesEnabled;
    voiceEngine.setVoicesEnabled(nextEnabled);
    onUpdateState({
      ...playerState,
      settings: { ...playerState.settings, voicesEnabled: nextEnabled },
    });
  };

  const visibleArcs =
    genreFilter === 'All' ? STORY_ARCS : STORY_ARCS.filter((arc) => arc.genre === genreFilter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mikay Stories"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#130d20] border border-purple-300/20 text-[#f6f3fa] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-purple-300" />
            <div>
              <h2 className="font-display text-2xl font-semibold">Mikay Stories</h2>
              <p className="text-xs text-purple-200/70">
                Interactive drama, campus &amp; mystery arcs with voice narration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoices}
              aria-label="Toggle Story Voices"
              className="min-h-[38px] px-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1.5"
            >
              {playerState.settings.voicesEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-300" />
              )}
              <span>{playerState.settings.voicesEnabled ? 'Voices On' : 'Voices Off'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                voiceEngine.stop();
                onClose();
              }}
              aria-label="Close Stories"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedArc ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setGenreFilter(g);
                    }}
                    className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold border transition ${
                      genreFilter === g
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-[#1a122a] border-white/10 text-purple-200/80 hover:border-purple-400/40'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {visibleArcs.map((arc) => {
                const completed = playerState.completedStories.includes(arc.id);
                return (
                  <div
                    key={arc.id}
                    className="rounded-xl border border-white/10 bg-[#1a122a] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs text-purple-300 font-medium">
                        {arc.genre} {completed ? '· Completed' : '· Episode 1'}
                      </div>
                      <h3 className="font-display text-xl font-semibold text-white">{arc.title}</h3>
                      <p className="text-sm text-purple-100/75 max-w-lg">{arc.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startArc(arc)}
                      className="min-h-[44px] px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white whitespace-nowrap shrink-0 flex items-center gap-2"
                    >
                      <span>{completed ? 'Replay Story' : 'Play Chapter'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : currentNode ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between text-xs text-purple-200/70">
                <span>
                  {selectedArc.title} · {selectedArc.genre}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Replay Voice Narration"
                    onClick={() =>
                      voiceEngine.speak(currentNode.text, currentNode.voicePersona || 'narrator')
                    }
                    className="px-2.5 py-1 rounded-lg bg-purple-600/30 border border-purple-400/30 text-purple-100 flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Speak</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      voiceEngine.stop();
                      setSelectedArc(null);
                    }}
                    className="underline hover:text-white min-h-[36px]"
                  >
                    All Stories
                  </button>
                </div>
              </div>

              {lastConsequence && (
                <div className="rounded-xl bg-purple-950/60 border border-purple-400/25 px-4 py-3 text-xs text-purple-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{lastConsequence}</span>
                </div>
              )}

              <div className="rounded-2xl bg-[#1c132d] border border-white/10 p-6 space-y-3">
                <div className="text-xs font-semibold text-amber-300">
                  {currentNode.speaker} · {currentNode.speakerRole}
                </div>
                <p className="text-base leading-relaxed text-purple-50">{currentNode.text}</p>
              </div>

              {currentNode.choices ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-purple-200/75">Choose your response:</p>
                  {currentNode.choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleChoice(choice.id)}
                      className="w-full min-h-[54px] rounded-xl border border-purple-300/20 bg-[#171026] hover:bg-purple-600/25 hover:border-purple-400 px-4 py-3 text-left transition flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{choice.label}</div>
                        <div className="text-xs text-purple-200/70 tabular-nums mt-0.5">
                          {choice.pathBonus} · +{choice.coinReward} MC · +{choice.repReward} Rep · +10 LM
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-purple-300 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-[#19221d] border border-emerald-400/30 p-5 space-y-3">
                  <div className="text-xs font-semibold text-emerald-300">Ending Reached</div>
                  <h3 className="font-display text-2xl font-semibold text-white">{currentNode.endingTitle}</h3>
                  <p className="text-sm text-emerald-100/85">{currentNode.endingSummary}</p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => startArc(selectedArc)}
                      className="min-h-[44px] px-4 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Explore Another Path</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        voiceEngine.stop();
                        setSelectedArc(null);
                      }}
                      className="min-h-[44px] px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold"
                    >
                      Back to Story Library
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
