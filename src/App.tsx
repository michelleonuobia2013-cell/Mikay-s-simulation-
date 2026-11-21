import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Smartphone,
  Volume2,
  VolumeX,
  Pause,
  Sun,
  Sunset,
  Moon,
  CloudRain,
  Snowflake,
  Home,
  Play,
  Map as MapIcon,
  User,
  Users,
  Briefcase,
  ShoppingBag,
  CalendarDays,
  Gift,
  Gamepad2,
  ChevronDown,
  ChevronUp,
  Car,
  Sparkles,
  Download,
  BookOpen,
  X,
  Smile,
  Compass,
  Globe2,
  Hammer,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { DISTRICTS, EMOTES, WORLD_NPCS } from './game/catalog';
import { addLedgerEntry, createInitialPlayerState } from './game/rules';
import type {
  ArcadeGameId,
  DistrictId,
  EmoteId,
  GameNotification,
  OnlinePlayerPresence,
  PlayerSaveState,
  TimeOfDay,
  WeatherMode,
  WorldNpc,
} from './game/types';
import { useMultiplayer } from './hooks/useMultiplayer';
import { usePWAInstall } from './hooks/usePWAInstall';
import { soundEngine } from './three/soundEngine';
import { voiceEngine } from './three/voiceEngine';
import type { InteractableZone } from './three/worldBuilder';
import { ArcadeModal } from './components/ArcadeModal';
import { AuthModal } from './components/AuthModal';
import { CharacterStudio } from './components/CharacterStudio';
import { ExperiencesHubModal, type HubTab } from './components/ExperiencesHubModal';
import { InstallModal } from './components/InstallModal';
import { MikayPhone, type PhoneAppId } from './components/MikayPhone';
import { PropertyModal } from './components/PropertyModal';
import { StoryModal } from './components/StoryModal';
import { TouchJoystick } from './components/TouchJoystick';
import { WorldViewport, type WorldViewportHandle } from './components/WorldViewport';

const SAVE_STORAGE_KEY = 'mikay_sim_save_v1';
const TOKEN_STORAGE_KEY = 'mikay_sim_token_v1';

function loadInitialSave(): PlayerSaveState {
  const base = createInitialPlayerState();
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerSaveState>;
      return {
        ...base,
        ...parsed,
        lumina: parsed.lumina ?? base.lumina,
        savingsCoins: parsed.savingsCoins ?? base.savingsCoins,
        completedHorror: parsed.completedHorror ?? base.completedHorror,
        customExperiences: parsed.customExperiences ?? base.customExperiences,
        simGramPosts: parsed.simGramPosts ?? base.simGramPosts,
        simTokClips: parsed.simTokClips ?? base.simTokClips,
        appearance: { ...base.appearance, ...(parsed.appearance || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) },
      };
    }
  } catch {
    // fallback to clean initial state
  }
  return base;
}

export default function App() {
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused'>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      return 'playing';
    }
    return 'title';
  });

  const [playerState, setPlayerState] = useState<PlayerSaveState>(() => loadInitialSave());
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('sunset');
  const [weather, setWeather] = useState<WeatherMode>('snow');
  const [driving, setDriving] = useState(false);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [nearbyZone, setNearbyZone] = useState<InteractableZone | null>(null);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  // Multiplayer Room State
  const [multiplayerEnabled, setMultiplayerEnabled] = useState(true);
  const [roomId, setRoomId] = useState('public-world');

  // Modals & Phone
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneApp, setPhoneApp] = useState<PhoneAppId>('home');
  const [studioOpen, setStudioOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyInitialArcId, setStoryInitialArcId] = useState<string | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [hubTab, setHubTab] = useState<HubTab>('discover');
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const [activeEmote, setActiveEmote] = useState<{ id: EmoteId; startedAt: number } | null>(null);
  const [nearbyOnlinePlayers, setNearbyOnlinePlayers] = useState<OnlinePlayerPresence[]>([]);
  const [activeNpc, setActiveNpc] = useState<WorldNpc | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<GameNotification[]>([
    {
      id: 'notif_xmas',
      title: 'Christmas Wonderland Active',
      body: 'The Grand Christmas Tree is glowing in Mikay’s City Plaza.',
      type: 'info',
      timestamp: Date.now(),
      actionDistrict: 'city',
      read: false,
    },
  ]);

  const worldRef = useRef<WorldViewportHandle | null>(null);
  const touchInputRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const emoteTimerRef = useRef<number | null>(null);
  const { isInstallable, isInstalled, install, isOnline } = usePWAInstall();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Sync body dataset state for accessibility & automated checks
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Persist locally on every state update
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(playerState));
    } catch {
      // ignore storage quota errors
    }
  }, [playerState]);

  // Restore server account if token exists
  useEffect(() => {
    if (!authToken) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.saveState) {
          setPlayerState(data.saveState);
        }
      })
      .catch(() => {});
  }, [authToken]);

  const syncToCloud = useCallback(async () => {
    if (!authToken || playerState.isGuest) return;
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ saveState: playerState }),
      });
    } catch {
      // offline fallback preserved in localStorage
    }
  }, [authToken, playerState]);

  // Periodic cloud save when authenticated
  useEffect(() => {
    if (!authToken || playerState.isGuest) return;
    const id = window.setInterval(syncToCloud, 15000);
    return () => clearInterval(id);
  }, [authToken, playerState.isGuest, syncToCloud]);

  const handleNotification = useCallback(
    (notif: GameNotification) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 15));
      soundEngine.playPhonePing();
      showToast(`${notif.title}: ${notif.body}`);
    },
    [showToast],
  );

  useEffect(() => {
    voiceEngine.setVoicesEnabled(playerState.settings.voicesEnabled);
  }, [playerState.settings.voicesEnabled]);

  const mp = useMultiplayer({
    enabled: multiplayerEnabled && gameState !== 'title' && isOnline,
    roomId,
    username: playerState.username,
    characterName: playerState.characterName,
    district: playerState.activeDistrict,
    pos: playerState.playerPos,
    appearance: playerState.appearance,
    vipTier: playerState.vipTier,
    blockedUsers: playerState.blockedUsers,
    onNotification: handleNotification,
    onPlayerEmote: (evt) => {
      const def = EMOTES.find((e) => e.id === evt.emoteId);
      const label = def?.label || evt.emoteId;
      const myPos = worldRef.current?.getPlayerPosition() ?? playerState.playerPos;
      const dist = Math.hypot(evt.pos[0] - myPos[0], evt.pos[2] - myPos[2]);
      if (dist <= 16) {
        soundEngine.playEmoteSound(evt.emoteId);
        showToast(`${evt.characterName} performed ${label}!`);
      }
    },
  });

  const handleStartGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setGameState('playing');
    document.body.dataset.state = 'playing';
    soundEngine.setMuted(playerState.settings.audioMuted);
    voiceEngine.setVoicesEnabled(playerState.settings.voicesEnabled);
    if (!playerState.settings.audioMuted && playerState.settings.musicStation !== 'off') {
      soundEngine.startMusic(playerState.settings.musicStation);
    }
    soundEngine.playClick();
    voiceEngine.speak(`Welcome to Mikay's Simulation, ${playerState.characterName}.`, 'narrator');
  }, [
    playerState.settings.audioMuted,
    playerState.settings.musicStation,
    playerState.settings.voicesEnabled,
    playerState.characterName,
  ]);

  // Global keyboard shortcuts (Title Enter/Space, Playing Esc/P/M/H/G)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }
      if (e.code === 'Escape') {
        if (activeNpc) setActiveNpc(null);
        else if (studioOpen) setStudioOpen(false);
        else if (arcadeOpen) setArcadeOpen(false);
        else if (storyOpen) setStoryOpen(false);
        else if (hubOpen) setHubOpen(false);
        else if (propertyOpen) setPropertyOpen(false);
        else if (authOpen) setAuthOpen(false);
        else if (installOpen) setInstallOpen(false);
        else if (emoteMenuOpen) setEmoteMenuOpen(false);
        else if (phoneOpen) setPhoneOpen(false);
        else setGameState((s) => (s === 'playing' ? 'paused' : 'playing'));
      } else if (gameState === 'playing' && !e.repeat) {
        if (e.code === 'KeyP') setPhoneOpen((o) => !o);
        else if (e.code === 'KeyH') setHudCollapsed((c) => !c);
        else if (e.code === 'KeyG' && driving) soundEngine.playCarHorn();
        else if (e.code === 'KeyM') {
          const nextMuted = !playerState.settings.audioMuted;
          soundEngine.setMuted(nextMuted);
          if (nextMuted) voiceEngine.stop();
          setPlayerState((prev) => ({
            ...prev,
            settings: { ...prev.settings, audioMuted: nextMuted },
          }));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    handleStartGame,
    activeNpc,
    studioOpen,
    arcadeOpen,
    storyOpen,
    hubOpen,
    propertyOpen,
    authOpen,
    installOpen,
    emoteMenuOpen,
    phoneOpen,
    driving,
    playerState.settings.audioMuted,
  ]);

  const openPhoneAt = (appId: PhoneAppId) => {
    setPhoneApp(appId);
    setPhoneOpen(true);
    soundEngine.playClick();
  };

  const openHubAt = (tabId: HubTab) => {
    setHubTab(tabId);
    setHubOpen(true);
    soundEngine.playClick();
  };

  const teleportDistrict = (districtId: DistrictId) => {
    const dist = DISTRICTS[districtId];
    if (!dist) return;
    if (districtId === 'sanctuary' && !playerState.unlockedSanctuary) {
      showToast('Mirror Sanctuary is locked. Find 2 Secret Clues or reach 90 Reputation!');
      return;
    }
    worldRef.current?.teleportTo(dist.spawnPos);
    setPlayerState((prev) => ({ ...prev, activeDistrict: districtId, playerPos: [...dist.spawnPos] }));
    soundEngine.playClick();
  };

  const handleToggleDrive = useCallback(() => {
    if (!playerState.activeVehicleId) {
      openPhoneAt('vehicles');
      showToast('Select or purchase a vehicle in Mikay’s Phone to drive!');
      return;
    }
    setDriving((d) => !d);
    soundEngine.playClick();
  }, [playerState.activeVehicleId, showToast]);

  const triggerEmote = useCallback(
    (emoteId: EmoteId, targetPlayer?: OnlinePlayerPresence) => {
      if (driving) {
        showToast('Exit your vehicle ([F]) to perform an emote.');
        return;
      }
      const def = EMOTES.find((e) => e.id === emoteId);
      if (!def) return;
      if (emoteTimerRef.current !== null) {
        clearTimeout(emoteTimerRef.current);
      }
      const startedAt = Date.now();
      setActiveEmote({ id: emoteId, startedAt });
      setEmoteMenuOpen(false);
      soundEngine.playEmoteSound(emoteId);
      voiceEngine.speakEmote(def.label);
      mp.sendEmote(emoteId);
      const nearTarget = targetPlayer || nearbyOnlinePlayers[0];
      if (nearTarget) {
        showToast(`Performed ${def.label} near ${nearTarget.characterName}!`);
      } else {
        showToast(`Performing ${def.label} (stand near online players to share live)`);
      }
      emoteTimerRef.current = window.setTimeout(() => {
        setActiveEmote((cur) => (cur && cur.startedAt === startedAt ? null : cur));
      }, def.durationMs);
    },
    [driving, mp, nearbyOnlinePlayers, showToast],
  );

  const handleInteract = useCallback(
    (zone: InteractableZone) => {
      soundEngine.playClick();
      if (zone.actionType === 'studio') setStudioOpen(true);
      else if (zone.actionType === 'property') setPropertyOpen(true);
      else if (zone.actionType === 'dealership') openPhoneAt('vehicles');
      else if (zone.actionType === 'business') openPhoneAt('business');
      else if (zone.actionType === 'career') openPhoneAt('jobs');
      else if (zone.actionType === 'story') {
        setStoryInitialArcId(null);
        setStoryOpen(true);
      } else if (zone.actionType === 'arcade') setArcadeOpen(true);
      else if (zone.actionType === 'christmas_tree') {
        setWeather('snow');
        setTimeOfDay('night');
        setPlayerState((prev) => addLedgerEntry(prev, 'Christmas Tree Plaza Blessing', 50, 'reward', 8, undefined, 5));
        soundEngine.playSuccessFanfare();
        voiceEngine.speak('Happy Holidays from Mikay City Plaza!', 'narrator');
        showToast('Happy Holidays! +50 Mikay Coins & +5 Lumina at the Grand Tree.');
      } else if (zone.actionType === 'npc' && zone.payload) {
        const npc = WORLD_NPCS.find((n) => n.id === zone.payload) || null;
        if (npc) {
          voiceEngine.speak(npc.greeting, npc.voicePersona || 'npc_warm');
        }
        setActiveNpc(npc);
      } else if (zone.actionType === 'secret' && zone.payload) {
        if (playerState.secretsFound.includes(zone.payload)) {
          showToast('You already collected this Mirror Sanctuary clue.');
          return;
        }
        setPlayerState((prev) => {
          const nextSecrets = [...prev.secretsFound, zone.payload!];
          const unlocked = prev.unlockedSanctuary || nextSecrets.length >= 2;
          const updated = addLedgerEntry(prev, 'Discovered Secret Mirror Clue', 150, 'reward', 20, 'Academic Scholar', 20);
          return {
            ...updated,
            secretsFound: nextSecrets,
            unlockedSanctuary: unlocked,
          };
        });
        soundEngine.playSuccessFanfare();
        voiceEngine.speak('You discovered a secret Mirror Sanctuary clue!', 'narrator');
        showToast('Secret Clue discovered! Check Worlds in Discover for Mirror Sanctuary.');
      }
    },
    [playerState.secretsFound, showToast],
  );

  const activeVehicleObj = playerState.ownedVehicles.find((v) => v.vehicleId === playerState.activeVehicleId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0713] text-[#f6f3fa]">
      {/* Isolated 3D World Canvas */}
      <WorldViewport
        ref={worldRef}
        gameState={gameState}
        appearance={playerState.appearance}
        timeOfDay={timeOfDay}
        weather={weather}
        christmasEdition={playerState.settings.christmasEdition}
        activeVehicleId={playerState.activeVehicleId}
        activeVehicleColor={activeVehicleObj?.paintColor ?? '#5b21b6'}
        driving={driving}
        onlinePlayers={mp.onlinePlayers}
        activeEmote={activeEmote}
        touchInputRef={touchInputRef}
        onDistrictChange={(d) => setPlayerState((prev) => (prev.activeDistrict === d ? prev : { ...prev, activeDistrict: d }))}
        onNearbyInteractable={setNearbyZone}
        onNearbyOnlinePlayersChange={setNearbyOnlinePlayers}
        onInteractTriggered={handleInteract}
        onToggleDrive={handleToggleDrive}
        onEmoteTriggered={(id) => triggerEmote(id)}
        onPlayerMoveBroadcast={(pos, rotY, district, moving, inVeh) => {
          mp.sendMove(pos, rotY, district, moving, inVeh);
        }}
        onSpeedChange={setSpeedKmh}
      />

      {/* TITLE SCREEN OVERLAY */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none bg-gradient-to-r from-[#0b0713]/80 via-[#0b0713]/35 to-transparent">
          {/* Upper-Left Bespoke Inline SVG Title Lockup */}
          <div className="max-w-xl space-y-5 pointer-events-auto">
            <div className="flex items-center gap-4">
              <img
                src="/pwa-192x192.png"
                alt="Mikay's Simulation Official Mirror Emblem"
                className="w-16 h-16 rounded-2xl border border-purple-300/35 shadow-xl object-cover"
              />
              <div>
                <svg viewBox="0 0 380 68" className="w-72 sm:w-96 h-auto" aria-label="Mikay's Simulation">
                  <defs>
                    <linearGradient id="veloriaSilver" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f5f3ff" />
                      <stop offset="65%" stopColor="#d8b4fe" />
                      <stop offset="100%" stopColor="#e2c07d" />
                    </linearGradient>
                  </defs>
                  <path d="M2 8 L28 8 M2 8 L2 30" stroke="#c084fc" strokeWidth="1.5" fill="none" opacity="0.7" />
                  <text
                    x="10"
                    y="40"
                    fill="url(#veloriaSilver)"
                    fontFamily="Cormorant Garamond, Georgia, serif"
                    fontWeight="700"
                    fontSize="38"
                    letterSpacing="-0.5"
                  >
                    Mikay&apos;s Simulation
                  </text>
                  <text
                    x="12"
                    y="60"
                    fill="#d8b4fe"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight="500"
                    fontSize="11.2"
                    letterSpacing="2.0"
                  >
                    YOUR LIFE · YOUR RULES · YOUR REALITY
                  </text>
                </svg>
              </div>
            </div>

            <p className="text-sm sm:text-base text-purple-100/85 max-w-md leading-relaxed">
              One universe, infinite lives: explore 3D districts, live campus &amp; career dramas, brave DARKSIDE horror, customize your character, and build your own experiences.
            </p>

            {/* Primary & Secondary Actions (<= 3 actions) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={handleStartGame}
                className="min-h-[48px] px-7 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg transition flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Enter World</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="min-h-[48px] px-5 rounded-xl bg-[#160f26]/90 hover:bg-[#23183b] border border-purple-300/25 text-purple-100 font-medium text-sm transition"
              >
                {authToken && !playerState.isGuest ? `Account (@${playerState.username})` : 'Sign In / Create Account'}
              </button>

              {!isInstalled && (
                <button
                  type="button"
                  onClick={() => (isInstallable ? install() : setInstallOpen(true))}
                  className="min-h-[48px] px-4 rounded-xl bg-[#160f26]/85 hover:bg-[#23183b] border border-white/15 text-purple-200 text-sm font-medium flex items-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>
              )}
            </div>
          </div>

          {/* Single Flat Control Hint Line */}
          <div className="text-xs text-purple-200/80 tracking-wide">
            WASD / Stick Move · Drag Look · E Interact · F Drive · P Phone · Esc Menu
          </div>
        </div>
      )}

      {/* PLAYING HUD (>= 85% Open Viewport, pointer-events-none wrapper, NO backdrop-filter) */}
      {gameState === 'playing' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
          {/* Top Perimeter Row */}
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            {/* Top-Left World & Dual Currency Cluster */}
            <div className="pointer-events-auto min-w-0 max-w-[calc(100%-168px)] sm:max-w-none rounded-2xl bg-[#110a1d]/90 border border-purple-300/20 px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg">
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-purple-200/80 whitespace-nowrap truncate">
                <span className="font-semibold text-white truncate">{DISTRICTS[playerState.activeDistrict].name}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-amber-300 font-semibold shrink-0">{playerState.velorCoins} MC</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-purple-300 font-semibold shrink-0">{playerState.lumina ?? 0} LM</span>
                {driving && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-nums text-sky-300 shrink-0">{speedKmh} km/h</span>
                  </>
                )}
              </div>
              <div className="text-[10px] sm:text-[11px] text-purple-200/65 mt-0.5 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap truncate">
                <span className="hidden sm:inline">{playerState.parallelPath}</span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span className="truncate">{playerState.vipTier}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">
                  {!isOnline || mp.status === 'offline'
                    ? 'Offline (Solo)'
                    : mp.status === 'connecting'
                      ? 'Connecting...'
                      : `Online (${mp.onlinePlayers.length + 1})`}
                </span>
              </div>
            </div>

            {/* Top-Right Compact Utility Controls */}
            <div className="pointer-events-auto shrink-0 flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                aria-label="Cycle Time of Day"
                title="Cycle Day / Sunset / Night"
                onClick={() =>
                  setTimeOfDay((t) => (t === 'day' ? 'sunset' : t === 'sunset' ? 'night' : 'day'))
                }
                className="min-h-[38px] min-w-[38px] sm:min-h-[42px] sm:min-w-[42px] rounded-xl bg-[#110a1d]/90 border border-white/15 hover:border-purple-400/50 flex items-center justify-center text-amber-300"
              >
                {timeOfDay === 'day' ? <Sun className="w-4 h-4" /> : timeOfDay === 'sunset' ? <Sunset className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label="Cycle Weather"
                title="Cycle Clear / Rain / Snow"
                onClick={() =>
                  setWeather((w) => (w === 'clear' ? 'rain' : w === 'rain' ? 'snow' : 'clear'))
                }
                className="min-h-[38px] min-w-[38px] sm:min-h-[42px] sm:min-w-[42px] rounded-xl bg-[#110a1d]/90 border border-white/15 hover:border-purple-400/50 flex items-center justify-center text-sky-300"
              >
                {weather === 'rain' ? <CloudRain className="w-4 h-4" /> : weather === 'snow' ? <Snowflake className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label={playerState.settings.audioMuted ? 'Unmute Audio' : 'Mute Audio'}
                onClick={() => {
                  const next = !playerState.settings.audioMuted;
                  soundEngine.setMuted(next);
                  if (next) voiceEngine.stop();
                  setPlayerState((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, audioMuted: next },
                  }));
                }}
                className="min-h-[38px] min-w-[38px] sm:min-h-[42px] sm:min-w-[42px] rounded-xl bg-[#110a1d]/90 border border-white/15 hover:border-purple-400/50 flex items-center justify-center text-purple-100"
              >
                {playerState.settings.audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                aria-label="Pause Menu"
                onClick={() => setGameState('paused')}
                className="min-h-[38px] min-w-[38px] sm:min-h-[42px] sm:min-w-[42px] rounded-xl bg-[#110a1d]/90 border border-white/15 hover:border-purple-400/50 flex items-center justify-center text-purple-100"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Side-Edge Mikay's Phone Launcher (Never blocks center playfield!) */}
          <div className="fixed right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-auto flex flex-col gap-2">
            <button
              type="button"
              aria-label="Open Mikay's Phone"
              onClick={() => {
                setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
                setPhoneOpen((o) => !o);
              }}
              className="relative min-h-[52px] min-w-[52px] rounded-2xl bg-[#150d24]/95 border border-purple-300/30 hover:border-purple-400 shadow-xl flex flex-col items-center justify-center gap-0.5 text-purple-100 transition"
            >
              <Smartphone className="w-5 h-5 text-purple-300" />
              <span className="text-[10px] font-semibold">Phone</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              aria-label="Open Emotes Menu"
              onClick={() => setEmoteMenuOpen((o) => !o)}
              className={`relative min-h-[50px] min-w-[52px] rounded-2xl bg-[#150d24]/95 border shadow-xl flex flex-col items-center justify-center gap-0.5 text-purple-100 transition ${
                nearbyOnlinePlayers.length > 0
                  ? 'border-emerald-400/60 hover:border-emerald-300'
                  : 'border-purple-300/30 hover:border-purple-400'
              }`}
            >
              <Smile className={`w-5 h-5 ${nearbyOnlinePlayers.length > 0 ? 'text-emerald-300' : 'text-purple-300'}`} />
              <span className="text-[10px] font-semibold">Emotes</span>
              {nearbyOnlinePlayers.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-[10px] font-bold flex items-center justify-center">
                  {nearbyOnlinePlayers.length}
                </span>
              )}
            </button>

            {playerState.activeVehicleId && (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  aria-label={driving ? 'Exit Vehicle' : 'Drive Active Vehicle'}
                  onClick={handleToggleDrive}
                  className={`min-h-[48px] min-w-[52px] rounded-2xl border shadow-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                    driving
                      ? 'bg-amber-600/90 border-amber-300 text-white'
                      : 'bg-[#150d24]/95 border-white/20 text-purple-100'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>{driving ? 'Exit' : 'Drive'}</span>
                </button>
                {driving && (
                  <button
                    type="button"
                    aria-label="Sound Vehicle Horn"
                    onClick={() => soundEngine.playCarHorn()}
                    className="min-h-[42px] min-w-[52px] rounded-2xl bg-[#150d24]/95 border border-sky-300/35 text-sky-200 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Horn</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Floating HUD Emotes Tray */}
          {emoteMenuOpen && (
            <div
              role="dialog"
              aria-label="Emotes Menu"
              className="fixed right-[72px] top-1/2 -translate-y-1/2 z-30 pointer-events-auto w-60 rounded-2xl bg-[#140d22]/95 border border-purple-300/30 p-3 shadow-2xl space-y-2"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                  <div className="text-xs font-semibold text-white">Character Emotes</div>
                  <div className="text-[10px] text-purple-200/75">
                    {nearbyOnlinePlayers.length > 0
                      ? `Live near ${nearbyOnlinePlayers[0].characterName}`
                      : 'Solo preview · Approach players to share'}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close Emotes Menu"
                  onClick={() => setEmoteMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-purple-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {EMOTES.map((em) => (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => triggerEmote(em.id)}
                    className="w-full min-h-[38px] px-3 rounded-xl bg-[#1e1433] hover:bg-purple-600/35 border border-white/10 flex items-center justify-between text-xs text-purple-100 transition"
                  >
                    <span className="font-semibold">{em.label}</span>
                    <span className="text-[10px] text-purple-200/60 font-mono">[{em.hotkey}]</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Toast & Context Prompts + Bottom Navigation Dock */}
          <div className="flex flex-col items-center gap-2.5">
            {toast && (
              <div className="pointer-events-auto rounded-xl bg-[#19102b]/95 border border-purple-400/35 px-4 py-2 text-xs font-medium text-purple-100 shadow-lg">
                {toast}
              </div>
            )}

            {nearbyOnlinePlayers.length > 0 && !activeNpc && (
              <div
                aria-label="Nearby Player Social Bar"
                className="pointer-events-auto self-end lg:self-center max-w-[calc(100vw-124px)] lg:max-w-none rounded-2xl bg-[#140d22]/95 border border-emerald-400/35 px-2.5 sm:px-3 py-1.5 shadow-xl flex items-center gap-1.5 sm:gap-2"
              >
                <span className="text-[11px] font-medium text-emerald-200 whitespace-nowrap truncate max-w-[76px] sm:max-w-none">
                  <span className="hidden sm:inline">Near </span>
                  {nearbyOnlinePlayers[0].characterName}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {EMOTES.slice(0, 3).map((em) => (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => triggerEmote(em.id, nearbyOnlinePlayers[0])}
                      className="min-h-[32px] px-2 sm:px-2.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-[11px] font-semibold text-white transition"
                    >
                      {em.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {nearbyZone && !activeNpc && (
              <button
                type="button"
                onClick={() => handleInteract(nearbyZone)}
                className="pointer-events-auto min-h-[44px] rounded-xl bg-purple-600/95 hover:bg-purple-500 border border-purple-200/30 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xl transition"
              >
                [E] {nearbyZone.label}
              </button>
            )}

            {/* Mobile Thumbstick positioned above bottom dock */}
            <div className="fixed bottom-24 left-3 z-20 lg:hidden">
              <TouchJoystick touchInputRef={touchInputRef} />
            </div>

            {/* Bottom Navigation Dock */}
            <div className="w-full flex items-end justify-center">
              <div className="pointer-events-auto flex flex-col items-center max-w-full">
                <button
                  type="button"
                  onClick={() => setHudCollapsed((c) => !c)}
                  aria-label={hudCollapsed ? 'Show Navigation Bar' : 'Hide Navigation Bar'}
                  className="mb-1 px-3 py-1 rounded-t-lg bg-[#120b1e]/90 border border-b-0 border-white/15 text-[11px] text-purple-200/80 flex items-center gap-1"
                >
                  {hudCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{hudCollapsed ? 'Menu' : 'Hide'}</span>
                </button>

                {!hudCollapsed && (
                  <nav
                    aria-label="Main Game Navigation"
                    className="max-w-[96vw] overflow-x-auto rounded-2xl bg-[#110a1d]/95 border border-purple-300/20 px-2 py-1.5 shadow-2xl flex items-center gap-1"
                  >
                    <DockBtn icon={<Compass className="w-4 h-4" />} label="Discover" onClick={() => openHubAt('discover')} />
                    <DockBtn icon={<Globe2 className="w-4 h-4" />} label="Worlds" onClick={() => openHubAt('worlds')} />
                    <DockBtn icon={<BookOpen className="w-4 h-4" />} label="Stories" onClick={() => { setStoryInitialArcId(null); setStoryOpen(true); }} />
                    <DockBtn icon={<Hammer className="w-4 h-4" />} label="Create" onClick={() => openHubAt('create')} />
                    <DockBtn icon={<MessageSquare className="w-4 h-4" />} label="Messages" onClick={() => openPhoneAt('messages')} />
                    <DockBtn icon={<User className="w-4 h-4" />} label="Profile" onClick={() => setStudioOpen(true)} />
                    <DockBtn icon={<Home className="w-4 h-4" />} label="Estates" onClick={() => setPropertyOpen(true)} />
                    <DockBtn icon={<MapIcon className="w-4 h-4" />} label="DARKSIDE" onClick={() => openHubAt('horror')} />
                    <DockBtn icon={<Users className="w-4 h-4" />} label="Friends" onClick={() => openPhoneAt('friends')} />
                    <DockBtn icon={<ShoppingBag className="w-4 h-4" />} label="Market" onClick={() => openPhoneAt('shopping')} />
                    <DockBtn icon={<Briefcase className="w-4 h-4" />} label="Jobs" onClick={() => openPhoneAt('jobs')} />
                    <DockBtn icon={<CalendarDays className="w-4 h-4" />} label="News" onClick={() => openPhoneAt('events')} />
                    <DockBtn icon={<Gift className="w-4 h-4" />} label="Bank" onClick={() => openPhoneAt('banking')} />
                    <DockBtn icon={<Gamepad2 className="w-4 h-4" />} label="Arcade" onClick={() => setArcadeOpen(true)} />
                  </nav>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NPC CONVERSATION DIALOGUE CARD */}
      {activeNpc && gameState === 'playing' && (
        <div className="fixed inset-x-4 bottom-24 z-30 max-w-xl mx-auto rounded-2xl bg-[#140d22]/95 border border-purple-300/25 p-5 shadow-2xl text-[#f6f3fa]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-amber-300">{activeNpc.role}</div>
              <h3 className="font-display text-xl font-semibold text-white">{activeNpc.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveNpc(null)}
              aria-label="Close NPC Dialogue"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-sm text-purple-100/90 leading-relaxed">{activeNpc.greeting}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPlayerState((prev) => {
                  const nextRel = prev.relationships.map((r) =>
                    r.targetId === activeNpc.id ? { ...r, level: Math.min(100, r.level + 8) } : r,
                  );
                  return addLedgerEntry({ ...prev, relationships: nextRel }, `Connected with ${activeNpc.name}`, 40, 'reward', 6, undefined, 4);
                });
                soundEngine.playCoinChime();
                showToast(`Friendship deepened with ${activeNpc.name} [NPC] (+40 MC)`);
                setActiveNpc(null);
              }}
              className="min-h-[42px] px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold"
            >
              Build Friendship (+40 MC)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNpc(null);
                setStoryInitialArcId(null);
                setStoryOpen(true);
              }}
              className="min-h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              Open Mikay Stories
            </button>
          </div>
        </div>
      )}

      {/* PAUSE / SETTINGS MODAL */}
      {gameState === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Game Menu">
          <div className="w-full max-w-md rounded-2xl bg-[#130d20] border border-purple-300/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <img src="/pwa-192x192.png" alt="Mikay's Simulation" className="w-11 h-11 rounded-xl border border-purple-300/30" />
              <div>
                <h2 className="font-display text-2xl font-semibold">Mikay&apos;s Simulation</h2>
                <p className="text-xs text-purple-200/70">
                  {playerState.characterName} · {playerState.velorCoins} MC · {playerState.lumina ?? 0} LM · {playerState.vipTier}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setGameState('playing')}
                className="w-full min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm text-white"
              >
                Resume World
              </button>
              <button
                type="button"
                onClick={() => {
                  setGameState('playing');
                  setStudioOpen(true);
                }}
                className="w-full min-h-[44px] rounded-xl bg-[#1c1330] hover:bg-[#261a40] border border-white/10 text-sm font-medium"
              >
                Character &amp; Fashion Studio
              </button>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="w-full min-h-[44px] rounded-xl bg-[#1c1330] hover:bg-[#261a40] border border-white/10 text-sm font-medium"
              >
                Account, Login &amp; Cloud Sync
              </button>
              <button
                type="button"
                onClick={() => setMultiplayerEnabled((m) => !m)}
                className="w-full min-h-[44px] rounded-xl bg-[#1c1330] hover:bg-[#261a40] border border-white/10 text-sm font-medium"
              >
                Multiplayer Mode: {multiplayerEnabled ? 'Shared Online World' : 'Solo Mode Only'}
              </button>
              <button
                type="button"
                onClick={() => setInstallOpen(true)}
                className="w-full min-h-[44px] rounded-xl bg-[#1c1330] hover:bg-[#261a40] border border-white/10 text-sm font-medium"
              >
                Install Mobile App / Android Package
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.stopMusic();
                  setGameState('title');
                }}
                className="w-full min-h-[44px] rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-purple-200/80"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE MODALS & MIKAY'S PHONE */}
      <MikayPhone
        isOpen={phoneOpen && gameState === 'playing'}
        initialApp={phoneApp}
        onClose={() => setPhoneOpen(false)}
        playerState={playerState}
        onUpdateState={setPlayerState}
        onlinePlayers={mp.onlinePlayers}
        connectionStatus={mp.status}
        roomId={roomId}
        onChangeRoom={setRoomId}
        messages={mp.messages}
        onSendChat={mp.sendChat}
        onSendInvite={mp.sendInvite}
        nearbyPlayers={nearbyOnlinePlayers}
        onTriggerEmote={triggerEmote}
        notifications={notifications}
        onTeleportDistrict={teleportDistrict}
        onCapturePhoto={() => worldRef.current?.captureSnapshot() ?? null}
        onOpenStudio={() => {
          setPhoneOpen(false);
          setStudioOpen(true);
        }}
        onOpenProperties={() => {
          setPhoneOpen(false);
          setPropertyOpen(true);
        }}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenInstall={() => setInstallOpen(true)}
        timeOfDay={timeOfDay}
        onChangeTimeOfDay={setTimeOfDay}
        weather={weather}
        onChangeWeather={setWeather}
      />

      <CharacterStudio
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        playerState={playerState}
        onUpdateProfile={(patch) => setPlayerState((prev) => ({ ...prev, ...patch }))}
      />

      <StoryModal
        isOpen={storyOpen}
        initialArcId={storyInitialArcId}
        onClose={() => setStoryOpen(false)}
        playerState={playerState}
        onUpdateState={setPlayerState}
      />

      <ExperiencesHubModal
        isOpen={hubOpen}
        initialTab={hubTab}
        onClose={() => setHubOpen(false)}
        playerState={playerState}
        onUpdateState={setPlayerState}
        onTeleportDistrict={teleportDistrict}
        onOpenStory={(arcId) => {
          setHubOpen(false);
          setStoryInitialArcId(arcId || null);
          setStoryOpen(true);
        }}
        onOpenArcade={() => {
          setHubOpen(false);
          setArcadeOpen(true);
        }}
        onShowToast={showToast}
      />

      <PropertyModal
        isOpen={propertyOpen}
        onClose={() => setPropertyOpen(false)}
        playerState={playerState}
        onUpdateState={setPlayerState}
        onTeleport={(pos) => worldRef.current?.teleportTo(pos)}
      />

      <ArcadeModal
        isOpen={arcadeOpen}
        onClose={() => setArcadeOpen(false)}
        highScores={playerState.arcadeHighScores}
        onWinReward={(gameId: ArcadeGameId, score: number, coins: number) => {
          setPlayerState((prev) => {
            const updated = addLedgerEntry(prev, `Arcade: ${gameId}`, coins, 'arcade', Math.max(8, Math.round(coins / 15)));
            return {
              ...updated,
              arcadeHighScores: {
                ...updated.arcadeHighScores,
                [gameId]: Math.max(updated.arcadeHighScores[gameId] || 0, score),
              },
            };
          });
        }}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        currentSave={playerState}
        authToken={authToken}
        onAuthSuccess={(token, save) => {
          setAuthToken(token);
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
          setPlayerState(save);
          showToast(`Welcome back, ${save.characterName}!`);
        }}
        onContinueGuest={() => showToast('Playing in Guest Mode (local save active).')}
        onSyncNow={syncToCloud}
        onSignOut={() => {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setAuthToken(null);
          setPlayerState(createInitialPlayerState());
        }}
      />

      <InstallModal isOpen={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}

const DockBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="min-h-[48px] min-w-[58px] px-2.5 py-1.5 rounded-xl hover:bg-purple-600/25 text-purple-100 flex flex-col items-center justify-center gap-1 transition shrink-0"
  >
    <span className="text-purple-200">{icon}</span>
    <span className="text-[10px] font-medium whitespace-nowrap">{label}</span>
  </button>
);
