import React, { useEffect, useRef, useState } from 'react';
import { X, Gamepad2, Trophy, ArrowLeft } from 'lucide-react';
import { ARCADE_GAMES } from '../game/catalog';
import type { ArcadeGameId } from '../game/types';
import { soundEngine } from '../three/soundEngine';

interface ArcadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  highScores: Record<string, number>;
  onWinReward: (gameId: ArcadeGameId, score: number, coins: number) => void;
}

export const ArcadeModal: React.FC<ArcadeModalProps> = ({
  isOpen,
  onClose,
  highScores,
  onWinReward,
}) => {
  const [activeGame, setActiveGame] = useState<ArcadeGameId | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const gameMeta = ARCADE_GAMES.find((g) => g.id === activeGame) || null;

  const finishGame = (gameId: ArcadeGameId, score: number, coins: number, summary: string) => {
    soundEngine.playCoinChime();
    onWinReward(gameId, score, coins);
    setLastResult(`${summary} · Earned +${coins} Velor Coins!`);
    setActiveGame(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Mikay's Arcade">
      <div className="w-full max-w-4xl rounded-2xl bg-[#120b1e] border border-purple-300/20 text-[#f6f3fa] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {activeGame && (
              <button
                type="button"
                onClick={() => setActiveGame(null)}
                aria-label="Back to Arcade Lobby"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Gamepad2 className="w-5 h-5 text-pink-400" />
            <div>
              <h2 className="font-display text-2xl font-semibold">
                {gameMeta ? gameMeta.title : "Mikay's Arcade"}
              </h2>
              <p className="text-xs text-purple-200/70">
                {gameMeta ? gameMeta.controlsHint : '12 distinct original mini-games · Earn Velor Coins & Reputation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Mikay's Arcade"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {lastResult && !activeGame && (
          <div className="mx-6 mt-4 rounded-xl bg-emerald-950/60 border border-emerald-400/30 px-4 py-2.5 text-xs text-emerald-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{lastResult}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {!activeGame ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {ARCADE_GAMES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setLastResult(null);
                    setActiveGame(g.id);
                    soundEngine.playClick();
                  }}
                  className="rounded-xl border border-white/10 bg-[#1a122b] hover:border-purple-400/60 hover:bg-[#23183b] p-4 text-left transition flex flex-col justify-between min-h-[126px]"
                >
                  <div>
                    <div className="text-[11px] text-purple-300 font-medium">
                      {g.category} · Up to {g.maxReward} VC
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white mt-0.5">{g.title}</h3>
                    <p className="text-xs text-purple-100/70 mt-1">{g.tagline}</p>
                  </div>
                  <div className="mt-3 text-[11px] text-amber-300/90 tabular-nums">
                    Best: {highScores[g.id] ?? 0} pts
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <MiniGameRunner gameId={activeGame} onComplete={finishGame} />
          )}
        </div>
      </div>
    </div>
  );
};

interface MiniGameRunnerProps {
  gameId: ArcadeGameId;
  onComplete: (gameId: ArcadeGameId, score: number, coins: number, summary: string) => void;
}

const MiniGameRunner: React.FC<MiniGameRunnerProps> = ({ gameId, onComplete }) => {
  switch (gameId) {
    case 'runway_revolution':
      return <RunwayGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'city_rush':
      return <CityRushGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'secret_room':
      return <SecretRoomGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'dance_dynasty':
      return <DanceDynastyGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'chefs_challenge':
      return <ChefsChallengeGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'sweet_treats':
      return <SweetTreatsGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'mystery_mansion':
      return <MysteryMansionGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'treasure_trails':
      return <TreasureTrailsGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'escape_district':
      return <EscapeDistrictGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'design_empire':
      return <DesignEmpireGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'star_search':
      return <StarSearchGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
    case 'mini_obby':
      return <MiniObbyGame onDone={(s, c, m) => onComplete(gameId, s, c, m)} />;
  }
};

type DoneCb = (score: number, coins: number, summary: string) => void;

// 1. Runway Revolution: Match couture brief pieces across 3 rounds
const RunwayGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const rounds = [
    { theme: 'Midnight Gala at Crown Estate', answer: 'Velvet Obsidian Gown', options: ['Velvet Obsidian Gown', 'Neon Surf Shorts', 'School Blazer'] },
    { theme: 'Sunset Bay Coastal Dinner', answer: 'Linen Coral Breeze', options: ['Heavy Winter Parka', 'Linen Coral Breeze', 'Steel Moto Suit'] },
    { theme: 'Old Town Heritage Festival', answer: 'Gold Ankara Wrap', options: ['Gym Tracksuit', 'Gold Ankara Wrap', 'Lab Coat'] },
  ];
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const current = rounds[step];

  const pick = (opt: string) => {
    const gained = opt === current.answer ? 100 : 30;
    const nextScore = score + gained;
    soundEngine.playNote(opt === current.answer ? 784 : 310, 0.15);
    if (step + 1 >= rounds.length) {
      onDone(nextScore, Math.round(nextScore * 0.7), `Runway Judge Score ${nextScore}/300`);
    } else {
      setScore(nextScore);
      setStep(step + 1);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 text-center">
      <div className="text-xs text-purple-300 tabular-nums">Round {step + 1} / 3 · Score {score}</div>
      <div className="rounded-xl bg-[#1b132b] border border-white/10 p-6">
        <div className="text-xs text-amber-300">Runway Theme</div>
        <h3 className="font-display text-2xl font-semibold mt-1">{current.theme}</h3>
      </div>
      <div className="grid gap-3">
        {current.options.map((opt) => (
          <button key={opt} type="button" onClick={() => pick(opt)} className="min-h-[48px] rounded-xl bg-purple-600/25 hover:bg-purple-600/45 border border-purple-300/25 text-sm font-semibold">
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

// 2. City Rush: 3-lane real-time traffic dodger
const CityRushGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const [lane, setLane] = useState(1);
  const [cars, setCars] = useState<{ id: number; lane: number; y: number }[]>([]);
  const [distance, setDistance] = useState(0);
  const laneRef = useRef(1);
  laneRef.current = lane;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') setLane((l) => Math.max(0, l - 1));
      if (e.code === 'ArrowRight' || e.code === 'KeyD') setLane((l) => Math.min(2, l + 1));
    };
    window.addEventListener('keydown', onKey);
    let idCounter = 1;
    let ticks = 0;
    const timer = window.setInterval(() => {
      ticks++;
      setDistance((d) => {
        const nd = d + 12;
        if (nd >= 360) {
          clearInterval(timer);
          onDone(360, 240, 'Crossed Mikay’s Boulevard Finish!');
        }
        return nd;
      });
      setCars((prev) => {
        const moved = prev.map((c) => ({ ...c, y: c.y + 12 })).filter((c) => c.y <= 105);
        for (const c of moved) {
          if (c.y >= 72 && c.y <= 92 && c.lane === laneRef.current) {
            clearInterval(timer);
            onDone(ticks * 10, Math.max(60, ticks * 6), `Dodged traffic for ${ticks * 12}m`);
          }
        }
        if (ticks % 4 === 0) {
          moved.push({ id: idCounter++, lane: Math.floor(Math.random() * 3), y: 0 });
        }
        return moved;
      });
    }, 150);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(timer);
    };
  }, [onDone]);

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="flex justify-between text-xs text-purple-200 tabular-nums">
        <span>Distance: {distance} / 360m</span>
        <span>Use A / D or tap lanes</span>
      </div>
      <div className="relative h-72 rounded-xl bg-[#0b0713] border border-white/15 grid grid-cols-3 overflow-hidden">
        {[0, 1, 2].map((col) => (
          <div key={col} className="border-r last:border-r-0 border-white/10 relative">
            {cars.filter((c) => c.lane === col).map((c) => (
              <div key={c.id} className="absolute left-1/2 -translate-x-1/2 w-10 h-12 rounded-md bg-rose-500 border border-rose-200/40" style={{ top: `${c.y}%` }} />
            ))}
            {lane === col && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-12 rounded-md bg-purple-500 border-2 border-amber-300" />
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setLane((l) => Math.max(0, l - 1))} className="min-h-[46px] rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm">Steer Left</button>
        <button type="button" onClick={() => setLane((l) => Math.min(2, l + 1))} className="min-h-[46px] rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm">Steer Right</button>
      </div>
    </div>
  );
};

// 3. The Secret Room: 4-symbol cipher deduction
const SecretRoomGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const symbols = ['Mirror', 'Crown', 'Star', 'Lotus'];
  const [target] = useState(() => [0, 1, 2, 3].map(() => symbols[Math.floor(Math.random() * 4)]));
  const [guess, setGuess] = useState(['Mirror', 'Crown', 'Star', 'Lotus']);
  const [history, setHistory] = useState<{ guess: string[]; exact: number }[]>([]);

  const submit = () => {
    const exact = guess.filter((g, i) => g === target[i]).length;
    soundEngine.playNote(440 + exact * 110, 0.16);
    if (exact === 4) {
      const score = Math.max(120, 320 - history.length * 40);
      onDone(score, Math.min(240, score), `Cracked the Secret Room in ${history.length + 1} tries!`);
      return;
    }
    setHistory([{ guess: [...guess], exact }, ...history]);
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <p className="text-xs text-purple-200/80">Tap slots to cycle symbols, then test the Mirror Lock.</p>
      <div className="grid grid-cols-4 gap-2">
        {guess.map((sym, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              const next = [...guess];
              next[idx] = symbols[(symbols.indexOf(sym) + 1) % symbols.length];
              setGuess(next);
            }}
            className="min-h-[56px] rounded-xl bg-[#1d1430] border border-purple-300/30 text-sm font-semibold"
          >
            {sym}
          </button>
        ))}
      </div>
      <button type="button" onClick={submit} className="w-full min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm">
        Test Mirror Cipher
      </button>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {history.map((h, i) => (
          <div key={i} className="text-xs flex justify-between rounded-lg bg-[#0d0817] px-3 py-2 border border-white/10">
            <span>{h.guess.join(' · ')}</span>
            <span className="text-amber-300 tabular-nums">{h.exact} exact</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Dance Dynasty: 4-lane rhythm game
const DanceDynastyGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const lanes = ['D', 'F', 'J', 'K'];
  const freqs = [392, 440, 523.25, 587.33];
  const [activeLane, setActiveLane] = useState(0);
  const [hits, setHits] = useState(0);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveLane(Math.floor(Math.random() * 4));
      setRound((r) => {
        if (r + 1 >= 12) {
          clearInterval(id);
        }
        return r + 1;
      });
    }, 650);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (round >= 12) {
      const score = hits * 30;
      onDone(score, Math.max(70, Math.min(250, hits * 22)), `Dance Dynasty Rhythm: ${hits}/12 beats`);
    }
  }, [round, hits, onDone]);

  const tapLane = (idx: number) => {
    soundEngine.playNote(freqs[idx], 0.14);
    if (idx === activeLane) {
      setHits((h) => h + 1);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5 text-center">
      <div className="text-xs text-purple-200 tabular-nums">Beat {Math.min(round + 1, 12)} / 12 · Hits: {hits}</div>
      <div className="grid grid-cols-4 gap-3">
        {lanes.map((keyLabel, idx) => (
          <button
            key={keyLabel}
            type="button"
            onClick={() => tapLane(idx)}
            className={`min-h-[96px] rounded-2xl border font-semibold text-lg transition ${
              activeLane === idx
                ? 'bg-pink-600 border-amber-300 text-white scale-[1.03]'
                : 'bg-[#1a112b] border-white/15 text-purple-200/70'
            }`}
          >
            {keyLabel}
          </button>
        ))}
      </div>
    </div>
  );
};

// 5. Chef's Challenge: Sequence memory culinary order
const ChefsChallengeGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const order = ['Saffron Rice', 'Grilled Snapper', 'Plantain Glaze', 'Hibiscus Jus'];
  const [picked, setPicked] = useState<string[]>([]);
  const [shuffled] = useState(() => [...order].sort(() => Math.random() - 0.5));

  const choose = (ing: string) => {
    const next = [...picked, ing];
    setPicked(next);
    soundEngine.playNote(520 + next.length * 70, 0.12);
    if (next.length === order.length) {
      const matches = next.filter((v, i) => v === order[i]).length;
      const score = matches * 75;
      onDone(score, Math.max(80, matches * 55), `Plated ${matches}/4 layers in exact chef order`);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="rounded-xl bg-[#1a122a] border border-white/10 p-4">
        <div className="text-xs text-amber-300">Required Plating Sequence</div>
        <div className="text-sm font-semibold mt-1">{order.join(' → ')}</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {shuffled.map((ing) => (
          <button
            key={ing}
            type="button"
            disabled={picked.includes(ing)}
            onClick={() => choose(ing)}
            className="min-h-[48px] rounded-xl bg-purple-600/25 disabled:opacity-35 hover:bg-purple-600/45 border border-purple-300/25 text-xs font-semibold"
          >
            {ing}
          </button>
        ))}
      </div>
    </div>
  );
};

// 6. Sweet Treats: Interactive 3x3 confection swapper
const SweetTreatsGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const treats = ['Macaron', 'Truffle', 'Gelato'];
  const [grid, setGrid] = useState(['Macaron', 'Truffle', 'Macaron', 'Gelato', 'Macaron', 'Truffle', 'Truffle', 'Gelato', 'Gelato']);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  const clickTile = (idx: number) => {
    if (selected === null) {
      setSelected(idx);
      return;
    }
    const next = [...grid];
    [next[selected], next[idx]] = [next[idx], next[selected]];
    setGrid(next);
    setSelected(null);
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    soundEngine.playClick();
    // Check top or middle row match
    for (let r = 0; r < 3; r++) {
      if (next[r * 3] === next[r * 3 + 1] && next[r * 3 + 1] === next[r * 3 + 2]) {
        const score = Math.max(120, 260 - nextMoves * 25);
        onDone(score, Math.min(200, score), `Sweet Row Matched (${next[r * 3]})!`);
        return;
      }
    }
  };

  return (
    <div className="max-w-xs mx-auto space-y-4 text-center">
      <div className="text-xs text-purple-200">Align 3 identical treats in any horizontal row (Moves: {moves})</div>
      <div className="grid grid-cols-3 gap-2">
        {grid.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => clickTile(idx)}
            className={`min-h-[64px] rounded-xl border text-xs font-semibold ${
              selected === idx ? 'border-amber-300 bg-purple-600/40' : 'border-white/15 bg-[#1b122c]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

// 7. Mystery Mansion: Clue deduction
const MysteryMansionGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const suspects = [
    { name: 'Victor Sterling', claim: 'I stayed in the East Conservatory during the storm.' },
    { name: 'Clara Moreau', claim: 'I locked the gallery at 9:00 PM and left via the dry fountain path.' },
    { name: 'Damon Vance', claim: 'My velvet gloves never left my coat pocket.' },
  ];
  const answer = 'Clara Moreau';
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="rounded-xl bg-[#1a122a] border border-amber-300/25 p-4 text-xs text-amber-100">
        Evidence Note: Muddy footprints on the gallery carpet came from heavy rain outside the fountain path at 9:00 PM!
      </div>
      <div className="space-y-2.5">
        {suspects.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => {
              const win = s.name === answer;
              onDone(win ? 250 : 90, win ? 240 : 80, win ? 'Exposed the true contradiction!' : 'Case closed with partial insight');
            }}
            className="w-full rounded-xl border border-white/10 bg-[#181026] hover:border-purple-400 p-4 text-left"
          >
            <div className="text-sm font-semibold text-white">{s.name}</div>
            <div className="text-xs text-purple-200/75 mt-1">"{s.claim}"</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// 8. Treasure Trails: 4x4 sonar distance radar
const TreasureTrailsGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const [target] = useState(() => ({ r: Math.floor(Math.random() * 4), c: Math.floor(Math.random() * 4) }));
  const [scans, setScans] = useState<Record<string, number>>({});

  const scan = (r: number, c: number) => {
    const dist = Math.abs(r - target.r) + Math.abs(c - target.c);
    const key = `${r},${c}`;
    const next = { ...scans, [key]: dist };
    setScans(next);
    soundEngine.playNote(680 - dist * 70, 0.14);
    if (dist === 0) {
      const tries = Object.keys(next).length;
      const score = Math.max(100, 260 - tries * 20);
      onDone(score, Math.min(210, score), `Relic unearthed in ${tries} sonar pings!`);
    }
  };

  return (
    <div className="max-w-xs mx-auto space-y-3 text-center">
      <div className="text-xs text-purple-200">Tap tiles—0 means Relic Found! Numbers show Manhattan distance.</div>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => {
            const k = `${r},${c}`;
            const val = scans[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => scan(r, c)}
                className="min-h-[54px] rounded-lg border border-white/15 bg-[#1b122c] font-mono-nums text-sm font-semibold"
              >
                {val === undefined ? '?' : val}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
};

// 9. The Escape District: 5-node linked switch puzzle
const EscapeDistrictGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const [nodes, setNodes] = useState([true, false, true, false, false]);
  const [steps, setSteps] = useState(0);

  const toggle = (idx: number) => {
    const next = [...nodes];
    next[idx] = !next[idx];
    if (idx > 0) next[idx - 1] = !next[idx - 1];
    if (idx < 4) next[idx + 1] = !next[idx + 1];
    setNodes(next);
    setSteps(steps + 1);
    soundEngine.playClick();
    if (next.every(Boolean)) {
      const score = Math.max(120, 280 - steps * 15);
      onDone(score, Math.min(245, score), `Breached all 5 vault relays in ${steps + 1} flips!`);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4 text-center">
      <p className="text-xs text-purple-200">Toggling a switch flips itself and neighbors. Turn all 5 relays emerald green!</p>
      <div className="grid grid-cols-5 gap-2">
        {nodes.map((on, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => toggle(idx)}
            className={`min-h-[64px] rounded-xl border font-semibold text-xs ${
              on ? 'bg-emerald-600 border-emerald-300 text-white' : 'bg-[#1a1129] border-white/15 text-purple-200/70'
            }`}
          >
            {on ? 'ON' : 'OFF'}
          </button>
        ))}
      </div>
    </div>
  );
};

// 10. Design Empire: Client room brief
const DesignEmpireGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const [wall, setWall] = useState('Obsidian');
  const [light, setLight] = useState('Warm Gold');
  const submit = () => {
    const score = (wall === 'Soft Lilac' ? 120 : 60) + (light === 'Warm Gold' ? 120 : 60);
    onDone(score, Math.min(215, score), 'Delivered Interior Design Proposal');
  };
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="rounded-xl bg-[#1a122a] border border-white/10 p-4 text-xs text-purple-100">
        Client Brief: "I want a dreamy Soft Lilac wall palette paired with Warm Gold ambient sconces."
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-purple-200">Wall Tone</span>
          {['Soft Lilac', 'Obsidian', 'Forest'].map((w) => (
            <button key={w} type="button" onClick={() => setWall(w)} className={`mt-1.5 w-full min-h-[42px] rounded-lg border text-xs ${wall === w ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#0d0817]'}`}>{w}</button>
          ))}
        </div>
        <div>
          <span className="text-xs text-purple-200">Lighting</span>
          {['Warm Gold', 'Cool Blue', 'Neon Pink'].map((l) => (
            <button key={l} type="button" onClick={() => setLight(l)} className={`mt-1.5 w-full min-h-[42px] rounded-lg border text-xs ${light === l ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#0d0817]'}`}>{l}</button>
          ))}
        </div>
      </div>
      <button type="button" onClick={submit} className="w-full min-h-[46px] rounded-xl bg-purple-600 font-semibold text-sm">Present Room Design</button>
    </div>
  );
};

// 11. Star Search: Timing spotlight meter
const StarSearchGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const [pos, setPos] = useState(10);
  useEffect(() => {
    let dir = 1;
    const id = window.setInterval(() => {
      setPos((p) => {
        if (p >= 94) dir = -1;
        if (p <= 6) dir = 1;
        return p + dir * 6;
      });
    }, 45);
    return () => clearInterval(id);
  }, []);

  const strike = () => {
    const dist = Math.abs(pos - 50);
    const score = Math.max(80, Math.round(250 - dist * 4));
    onDone(score, Math.min(235, score), `Spotlight Precision ${Math.max(40, 100 - dist * 2)}%`);
  };

  return (
    <div className="max-w-md mx-auto space-y-5 text-center">
      <p className="text-xs text-purple-200">Hit Strike Note when the marker enters the center gold zone!</p>
      <div className="relative h-10 rounded-full bg-[#0b0713] border border-white/15 overflow-hidden">
        <div className="absolute inset-y-0 left-[40%] w-[20%] bg-amber-400/30 border-x border-amber-300/60" />
        <div className="absolute top-1 bottom-1 w-3 rounded-full bg-purple-400" style={{ left: `calc(${pos}% - 6px)` }} />
      </div>
      <button type="button" onClick={strike} className="w-full min-h-[48px] rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm">
        Strike Spotlight Note
      </button>
    </div>
  );
};

// 12. Mini Obby: Jump timing obstacle dash
const MiniObbyGame: React.FC<{ onDone: DoneCb }> = ({ onDone }) => {
  const [jumping, setJumping] = useState(false);
  const [obsX, setObsX] = useState(95);
  const [cleared, setCleared] = useState(0);
  const jumpingRef = useRef(false);
  jumpingRef.current = jumping;

  useEffect(() => {
    const id = window.setInterval(() => {
      setObsX((x) => {
        const nx = x - 7;
        if (nx <= 22 && nx >= 12 && !jumpingRef.current) {
          clearInterval(id);
          onDone(cleared * 50 + 40, Math.max(60, cleared * 45), `Obby Run: Cleared ${cleared} barriers`);
          return 95;
        }
        if (nx < 0) {
          setCleared((c) => {
            const nc = c + 1;
            if (nc >= 5) {
              clearInterval(id);
              onDone(260, 250, 'Completed 5/5 Mini Obby Courses!');
            }
            return nc;
          });
          return 98;
        }
        return nx;
      });
    }, 60);
    return () => clearInterval(id);
  }, [cleared, onDone]);

  const jump = () => {
    if (jumping) return;
    setJumping(true);
    soundEngine.playNote(580, 0.12);
    window.setTimeout(() => setJumping(false), 480);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 text-center">
      <div className="text-xs text-purple-200 tabular-nums">Barriers Cleared: {cleared} / 5</div>
      <div className="relative h-36 rounded-xl bg-[#0b0713] border border-white/15 overflow-hidden">
        <div
          className="absolute left-[15%] w-7 h-10 rounded bg-purple-400 transition-transform duration-150"
          style={{ bottom: jumping ? '58px' : '12px' }}
        />
        <div className="absolute bottom-3 w-5 h-8 rounded bg-rose-500" style={{ left: `${obsX}%` }} />
        <div className="absolute bottom-0 inset-x-0 h-3 bg-white/15" />
      </div>
      <button type="button" onClick={jump} className="w-full min-h-[48px] rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm">
        Jump
      </button>
    </div>
  );
};
