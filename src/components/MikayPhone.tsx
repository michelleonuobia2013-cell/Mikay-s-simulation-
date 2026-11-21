import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  MessageSquare,
  Camera,
  Heart,
  MapPin,
  Car,
  Building2,
  Landmark,
  Sparkles,
  ShoppingBag,
  Briefcase,
  Music,
  Settings,
  UserCircle2,
  Send,
  ShieldAlert,
  Ban,
  Check,
  Mic,
  Volume2,
  Film,
  Newspaper,
} from 'lucide-react';
import {
  BUSINESS_CATALOG,
  CAREERS,
  DAILY_CHALLENGES,
  DISTRICTS,
  EMOTES,
  GLOBAL_DESTINATIONS,
  SIM_NEWS_HEADLINES,
  VEHICLE_LISTINGS,
  WEEKLY_CITY_UPDATE,
  WORLD_NPCS,
} from '../game/catalog';
import {
  addLedgerEntry,
  addSimGramPost,
  collectBusinessRevenue,
  depositToSavings,
  launchBusiness,
  purchaseVehicle,
  toggleSimGramLike,
  withdrawFromSavings,
  workCareerShift,
} from '../game/rules';
import type {
  ChatMessage,
  DistrictId,
  EmoteId,
  GameNotification,
  OnlinePlayerPresence,
  PlayerSaveState,
  TimeOfDay,
  WeatherMode,
} from '../game/types';
import { soundEngine } from '../three/soundEngine';
import { voiceEngine } from '../three/voiceEngine';

export type PhoneAppId =
  | 'home'
  | 'messages'
  | 'simgram'
  | 'simtok'
  | 'banking'
  | 'map'
  | 'shopping'
  | 'jobs'
  | 'friends'
  | 'music'
  | 'events'
  | 'camera'
  | 'settings'
  | 'contacts'
  | 'gallery'
  | 'vehicles'
  | 'properties'
  | 'fashion'
  | 'business'
  | 'calendar'
  | 'profile'
  | 'travel';

interface MikayPhoneProps {
  isOpen: boolean;
  initialApp?: PhoneAppId;
  onClose: () => void;
  playerState: PlayerSaveState;
  onUpdateState: (next: PlayerSaveState) => void;
  onlinePlayers: OnlinePlayerPresence[];
  connectionStatus: 'connecting' | 'online' | 'offline';
  roomId: string;
  onChangeRoom: (roomId: string) => void;
  messages: ChatMessage[];
  onSendChat: (text: string, channel?: 'world' | 'dm', recipientId?: string) => boolean;
  onSendInvite: (sessionId: string, district: DistrictId, label: string) => boolean;
  nearbyPlayers?: OnlinePlayerPresence[];
  onTriggerEmote?: (emoteId: EmoteId, targetPlayer?: OnlinePlayerPresence) => void;
  notifications: GameNotification[];
  onTeleportDistrict: (district: DistrictId) => void;
  onCapturePhoto: () => string | null;
  onOpenStudio: () => void;
  onOpenProperties: () => void;
  onOpenAuth: () => void;
  onOpenInstall: () => void;
  timeOfDay: TimeOfDay;
  onChangeTimeOfDay: (t: TimeOfDay) => void;
  weather: WeatherMode;
  onChangeWeather: (w: WeatherMode) => void;
}

const HOME_APPS: { id: PhoneAppId; label: string; icon: React.ReactNode; tint: string }[] = [
  { id: 'messages', label: 'SimChat', icon: <MessageSquare className="w-4 h-4" />, tint: 'bg-indigo-600' },
  { id: 'simgram', label: 'SimGram', icon: <Sparkles className="w-4 h-4" />, tint: 'bg-fuchsia-600' },
  { id: 'simtok', label: 'SimTok', icon: <Film className="w-4 h-4" />, tint: 'bg-purple-700' },
  { id: 'banking', label: 'SimBank', icon: <Landmark className="w-4 h-4" />, tint: 'bg-amber-600' },
  { id: 'map', label: 'SimMap', icon: <MapPin className="w-4 h-4" />, tint: 'bg-emerald-600' },
  { id: 'shopping', label: 'SimMarket', icon: <ShoppingBag className="w-4 h-4" />, tint: 'bg-violet-600' },
  { id: 'jobs', label: 'SimJobs', icon: <Briefcase className="w-4 h-4" />, tint: 'bg-teal-600' },
  { id: 'friends', label: 'SimDate', icon: <Heart className="w-4 h-4" />, tint: 'bg-rose-600' },
  { id: 'music', label: 'SimMusic', icon: <Music className="w-4 h-4" />, tint: 'bg-sky-600' },
  { id: 'events', label: 'SimNews', icon: <Newspaper className="w-4 h-4" />, tint: 'bg-red-600' },
  { id: 'camera', label: 'SimPhotos', icon: <Camera className="w-4 h-4" />, tint: 'bg-slate-700' },
  { id: 'settings', label: 'SimSettings', icon: <Settings className="w-4 h-4" />, tint: 'bg-zinc-700' },
];

const WALLPAPER_CLASS: Record<PlayerSaveState['settings']['phoneWallpaper'], string> = {
  veloria: 'bg-[#120b1f]',
  midnight: 'bg-[#080912]',
  lavender: 'bg-[#1a102b]',
  emerald: 'bg-[#091815]',
};

export const MikayPhone: React.FC<MikayPhoneProps> = ({
  isOpen,
  initialApp = 'home',
  onClose,
  playerState,
  onUpdateState,
  onlinePlayers,
  connectionStatus,
  roomId,
  onChangeRoom,
  messages,
  onSendChat,
  onSendInvite,
  nearbyPlayers = [],
  onTriggerEmote,
  notifications,
  onTeleportDistrict,
  onCapturePhoto,
  onOpenStudio,
  onOpenProperties,
  onOpenAuth,
  onOpenInstall,
  timeOfDay,
  onChangeTimeOfDay,
  weather,
  onChangeWeather,
}) => {
  const [app, setApp] = useState<PhoneAppId>(initialApp);
  const [chatText, setChatText] = useState('');
  const [simGramInput, setSimGramInput] = useState('');
  const [bankAmount, setBankAmount] = useState('250');
  const [bizName, setBizName] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [customRoomInput, setCustomRoomInput] = useState('');
  const [localVoiceNotes, setLocalVoiceNotes] = useState<ChatMessage[]>([]);

  React.useEffect(() => {
    if (isOpen && initialApp) {
      setApp(initialApp);
    }
  }, [isOpen, initialApp]);

  if (!isOpen) return null;

  const flash = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 3200);
  };

  const handleReport = async (targetId: string) => {
    await fetch('/api/social/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterId: playerState.username,
        targetId,
        reason: 'Inappropriate social conduct',
      }),
    });
    flash(`Safety report submitted for ${targetId}.`);
  };

  const handleBlock = (username: string) => {
    if (playerState.blockedUsers.includes(username)) return;
    onUpdateState({ ...playerState, blockedUsers: [...playerState.blockedUsers, username] });
    flash(`Blocked ${username}. You will no longer see their messages.`);
  };

  const sendVoiceMessage = () => {
    const line = chatText.trim() || `Hey from ${DISTRICTS[playerState.activeDistrict].name}!`;
    voiceEngine.speak(line, 'player');
    soundEngine.playPhonePing();
    const sent = onSendChat(`[Voice Note] ${line}`);
    if (!sent) {
      setLocalVoiceNotes((prev) => [
        ...prev,
        {
          id: `vn_${Date.now()}`,
          channel: 'world',
          senderId: playerState.accountId,
          senderName: playerState.characterName,
          senderIsNpc: false,
          text: line,
          voiceNote: true,
          timestamp: Date.now(),
        },
      ]);
      flash('Voice Note played locally (connect online to broadcast to room).');
    } else {
      flash('Voice Note sent & spoken!');
    }
    setChatText('');
  };

  const shopItems = [
    { id: 'gift_bouquet', name: 'Lilac Rose Gift Bouquet', price: 90, rep: 8 },
    { id: 'gift_watch', name: 'Brushed Silver Dress Watch', price: 240, rep: 18 },
    { id: 'festive_mug', name: 'Mikay Cocoa Keepsake Set', price: 65, rep: 6 },
    { id: 'mirror_charm', name: 'Sanctuary Mirror Charm (Clue)', price: 180, rep: 14 },
  ];

  const mergedMessages = [...messages, ...localVoiceNotes].sort((a, b) => a.timestamp - b.timestamp);
  const bgClass = WALLPAPER_CLASS[playerState.settings.phoneWallpaper || 'veloria'];

  const appTitle =
    HOME_APPS.find((a) => a.id === app)?.label ||
    (app === 'vehicles'
      ? 'Mikay Motors'
      : app === 'properties'
        ? 'Mikay Estates'
        : app === 'business'
          ? 'Businesses'
          : app === 'profile'
            ? 'Player Profile'
            : app === 'fashion'
              ? 'Closet & Style'
              : 'MIKAY X');

  return (
    <aside
      className={`fixed right-3 bottom-3 top-3 sm:right-5 sm:top-14 sm:bottom-16 z-40 w-[calc(100vw-24px)] sm:w-[382px] rounded-[28px] ${bgClass} border border-purple-300/25 shadow-2xl flex flex-col overflow-hidden text-[#f6f3fa]`}
      aria-label="Mikay X Smartphone"
    >
      {/* Phone Top Bezel */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#090512] border-b border-white/10">
        <div className="flex items-center gap-2">
          {app !== 'home' && (
            <button
              type="button"
              onClick={() => setApp('home')}
              aria-label="Phone Home"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-xs font-semibold tracking-wide text-purple-100">{appTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono-nums text-amber-300">{playerState.velorCoins} MC</span>
          <span className="text-[11px] font-mono-nums text-purple-300">{playerState.lumina ?? 0} LM</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Mikay's Phone"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="bg-purple-900/90 border-b border-purple-400/30 px-4 py-2 text-xs text-purple-100">
          {statusBanner}
        </div>
      )}

      {/* App Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {app === 'home' && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#1c1330] border border-white/10 p-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-purple-200/75">{DISTRICTS[playerState.activeDistrict].name}</div>
                <div className="text-sm font-semibold text-white">{playerState.characterName}</div>
                <div className="text-[11px] text-amber-300 mt-0.5">
                  {playerState.parallelPath} · {playerState.vipTier}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApp('profile')}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-[11px] font-semibold flex items-center gap-1"
              >
                <UserCircle2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Profile</span>
              </button>
            </div>

            {notifications.length > 0 && (
              <div className="rounded-xl bg-[#191128] border border-purple-400/20 p-2.5 space-y-1">
                <div className="text-[11px] font-semibold text-purple-200">{notifications[0].title}</div>
                <div className="text-[11px] text-purple-200/75">{notifications[0].body}</div>
              </div>
            )}

            {/* 12 Signature Apps (4x3 grid — crisp and zero bottom-clipping) */}
            <div className="grid grid-cols-4 gap-2">
              {HOME_APPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setApp(item.id);
                  }}
                  className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span className={`w-11 h-11 rounded-2xl ${item.tint} flex items-center justify-center text-white shadow`}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-medium text-purple-100 truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick System Shortcuts */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setApp('vehicles')}
                className="min-h-[36px] rounded-xl bg-[#1a112b] border border-white/10 text-[11px] font-medium flex items-center justify-center gap-1"
              >
                <Car className="w-3.5 h-3.5 text-sky-300" />
                <span>Motors</span>
              </button>
              <button
                type="button"
                onClick={() => setApp('properties')}
                className="min-h-[36px] rounded-xl bg-[#1a112b] border border-white/10 text-[11px] font-medium flex items-center justify-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5 text-rose-300" />
                <span>Estates</span>
              </button>
              <button
                type="button"
                onClick={() => setApp('business')}
                className="min-h-[36px] rounded-xl bg-[#1a112b] border border-white/10 text-[11px] font-medium flex items-center justify-center gap-1"
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
                <span>Ventures</span>
              </button>
            </div>
          </div>
        )}

        {/* SIMCHAT (Messages + Voice Notes) */}
        {app === 'messages' && (
          <div className="flex flex-col h-full space-y-3">
            <div className="text-[11px] text-purple-200/75 flex items-center justify-between">
              <span>{connectionStatus === 'online' ? 'SimChat · Live Moderated' : 'SimChat · Voice Notes Ready'}</span>
              <span>Age-safe filter active</span>
            </div>
            <div className="flex-1 min-h-[220px] max-h-[330px] overflow-y-auto space-y-2 pr-1">
              {mergedMessages.map((m) => {
                const isVoice = m.voiceNote || m.text.startsWith('[Voice Note]');
                const spokenText = m.text.replace('[Voice Note]', '').trim();
                return (
                  <div key={m.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-purple-300">
                      <span className="font-semibold">
                        {m.senderName} {m.senderIsNpc ? '[NPC]' : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {isVoice && (
                          <button
                            type="button"
                            onClick={() => voiceEngine.speak(spokenText, 'player')}
                            className="text-emerald-300 flex items-center gap-0.5 hover:underline"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Play</span>
                          </button>
                        )}
                        {!m.senderIsNpc && m.senderName !== playerState.characterName && (
                          <>
                            <button type="button" onClick={() => handleReport(m.senderName)} className="text-rose-300 hover:underline">
                              Report
                            </button>
                            <button type="button" onClick={() => handleBlock(m.senderName)} className="text-amber-300 hover:underline">
                              Block
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-purple-50">{m.text}</p>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatText.trim()) return;
                const sent = onSendChat(chatText);
                if (!sent) flash('Offline: tap Voice Note or connect to Multiplayer.');
                else soundEngine.playPhonePing();
                setChatText('');
              }}
              className="flex gap-1.5"
            >
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Message or voice note..."
                className="flex-1 min-h-[42px] rounded-xl bg-[#0a0612] border border-white/15 px-3 text-xs text-white"
              />
              <button
                type="button"
                aria-label="Send Voice Note"
                title="Send & Speak Voice Note"
                onClick={sendVoiceMessage}
                className="min-h-[42px] min-w-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button type="submit" aria-label="Send Message" className="min-h-[42px] min-w-[42px] rounded-xl bg-purple-600 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* SIMGRAM */}
        {app === 'simgram' && (
          <div className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = addSimGramPost(playerState, simGramInput, '#MikaysSimulation');
                if (!res.ok) return flash(res.error || 'Cannot post');
                onUpdateState(res.nextState);
                soundEngine.playCoinChime();
                setSimGramInput('');
                flash('Posted to SimGram! (+20 MC & +2 LM)');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={simGramInput}
                onChange={(e) => setSimGramInput(e.target.value)}
                placeholder="Share a lifestyle update..."
                className="flex-1 min-h-[40px] rounded-xl bg-[#0a0612] border border-white/15 px-3 text-xs"
              />
              <button type="submit" className="px-3 rounded-xl bg-fuchsia-600 text-xs font-semibold">
                Post
              </button>
            </form>

            {(playerState.simGramPosts || []).map((post) => (
              <div key={post.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{post.author}</span>
                  <span className="text-[11px] text-purple-300">{post.handle}</span>
                </div>
                <p className="text-xs text-purple-50">{post.caption}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-amber-300">{post.tag}</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onUpdateState(toggleSimGramLike(playerState, post.id));
                    }}
                    className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                      post.liked ? 'bg-rose-600/30 border-rose-400 text-rose-200' : 'border-white/10 text-purple-200'
                    }`}
                  >
                    <Heart className="w-3 h-3" />
                    <span>{post.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SIMTOK */}
        {app === 'simtok' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                const next = addLedgerEntry(playerState, 'SimTok Moment Clip', 30, 'reward', 6, 'Global Celebrity', 3);
                onUpdateState({
                  ...next,
                  simTokClips: [
                    {
                      id: `st_${Date.now()}`,
                      creator: `@${playerState.username.toLowerCase()}`,
                      title: `Live from ${DISTRICTS[playerState.activeDistrict].name}`,
                      category: 'World Vlog',
                      views: 420,
                      liked: true,
                      durationSec: 19,
                    },
                    ...(next.simTokClips || []),
                  ].slice(0, 15),
                });
                soundEngine.playCoinChime();
                flash('Published SimTok clip! (+30 MC & +3 LM)');
              }}
              className="w-full min-h-[42px] rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold"
            >
              + Film Moment in {DISTRICTS[playerState.activeDistrict].name}
            </button>

            {(playerState.simTokClips || []).map((clip) => (
              <div key={clip.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">{clip.title}</div>
                  <div className="text-[11px] text-purple-200/70">
                    {clip.creator} · {clip.category} · {clip.views.toLocaleString()} views
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => voiceEngine.speak(clip.title, 'youth')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-purple-600 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Watch</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SIMBANK (Dual Currency + Savings Vault + Ledger) */}
        {app === 'banking' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-[#1c1330] border border-amber-300/25 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-purple-200/75">Mikay Coins (MC)</div>
                  <div className="text-2xl font-bold font-mono-nums text-amber-300">
                    {playerState.velorCoins} MC
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-purple-200/75">Lumina (LM)</div>
                  <div className="text-xl font-bold font-mono-nums text-purple-300">
                    {playerState.lumina ?? 0} LM
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-emerald-200">SimBank Savings Vault:</span>
                <span className="font-mono-nums font-bold text-emerald-300">
                  {playerState.savingsCoins ?? 0} MC
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-white">Vault Transfer</div>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value)}
                  aria-label="SimBank transfer amount"
                  className="w-24 min-h-[38px] rounded-lg bg-[#0a0612] border border-white/15 px-2.5 text-xs font-mono-nums"
                />
                <button
                  type="button"
                  onClick={() => {
                    const res = depositToSavings(playerState, Number(bankAmount));
                    if (!res.ok) return flash(res.error || 'Deposit failed');
                    onUpdateState(res.nextState);
                    soundEngine.playCoinChime();
                    flash(`Deposited ${bankAmount} MC to SimBank Vault.`);
                  }}
                  className="flex-1 min-h-[38px] rounded-lg bg-emerald-600 text-xs font-semibold"
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = withdrawFromSavings(playerState, Number(bankAmount));
                    if (!res.ok) return flash(res.error || 'Withdrawal failed');
                    onUpdateState(res.nextState);
                    soundEngine.playCoinChime();
                    flash(`Withdrew ${bankAmount} MC to wallet.`);
                  }}
                  className="flex-1 min-h-[38px] rounded-lg bg-purple-600 text-xs font-semibold"
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="text-xs font-semibold text-purple-200">Recent Transactions</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {playerState.transactions.map((tx) => (
                <div key={tx.id} className="rounded-lg bg-[#1a112b] border border-white/10 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="truncate pr-2">{tx.label}</span>
                  <span className={`font-mono-nums shrink-0 ${tx.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} MC
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SIMDATE / FRIENDS / EMOTES / CONTACTS */}
        {app === 'friends' && (
          <div className="space-y-4">
            {onTriggerEmote && (
              <div className="rounded-xl bg-[#1a112b] border border-purple-300/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">Live Emotes</span>
                  <span className="text-[10px] text-purple-200/75">
                    {nearbyPlayers.length > 0
                      ? `Near ${nearbyPlayers[0].characterName}`
                      : 'Solo preview'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {EMOTES.map((em) => (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => {
                        onTriggerEmote(em.id, nearbyPlayers[0]);
                        flash(`${em.label}!`);
                      }}
                      className="min-h-[36px] rounded-lg bg-[#0d0817] hover:bg-purple-600/35 border border-white/10 text-[11px] font-medium text-purple-100"
                    >
                      {em.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-white">Multiplayer Session Room</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeRoom('public-world')}
                  className={`min-h-[38px] rounded-lg text-xs font-medium border ${
                    roomId === 'public-world' ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#0d0817]'
                  }`}
                >
                  Public World
                </button>
                <button
                  type="button"
                  onClick={() => onChangeRoom(`friends-${playerState.username}`)}
                  className={`min-h-[38px] rounded-lg text-xs font-medium border ${
                    roomId.startsWith('friends-') ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#0d0817]'
                  }`}
                >
                  Friends-Only
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  placeholder="Private server code..."
                  className="flex-1 min-h-[38px] rounded-lg bg-[#0a0612] border border-white/15 px-2.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customRoomInput.trim()) onChangeRoom(`private-${customRoomInput.trim()}`);
                  }}
                  className="px-3 rounded-lg bg-white/10 text-xs font-semibold"
                >
                  Join
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-purple-200 mb-2">
                Real Online Players ({onlinePlayers.length})
              </div>
              {connectionStatus !== 'online' ? (
                <p className="text-xs text-amber-200/80">Offline solo mode. Live players appear here once connected.</p>
              ) : onlinePlayers.length === 0 ? (
                <p className="text-xs text-purple-200/70">No other players in this room yet. Share your private room code!</p>
              ) : (
                <div className="space-y-2">
                  {onlinePlayers.map((p) => {
                    const isNearby = nearbyPlayers.some((np) => np.sessionId === p.sessionId);
                    return (
                      <div key={p.sessionId} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {p.characterName}
                            {isNearby && <span className="ml-1.5 text-[10px] text-emerald-300 font-medium">· Nearby</span>}
                          </div>
                          <div className="text-[11px] text-purple-200/70">
                            @{p.username} · {DISTRICTS[p.district].name}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSendInvite(p.sessionId, playerState.activeDistrict, DISTRICTS[playerState.activeDistrict].name);
                              flash(`Invited ${p.characterName}!`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-600 text-[11px] font-semibold"
                          >
                            Invite
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReport(p.username)}
                            aria-label={`Report ${p.username}`}
                            className="p-1.5 rounded-lg bg-white/10 text-rose-300"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBlock(p.username)}
                            aria-label={`Block ${p.username}`}
                            className="p-1.5 rounded-lg bg-white/10 text-amber-300"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-purple-200">City Companions &amp; Hangouts</div>
              {WORLD_NPCS.map((npc) => (
                <div key={npc.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-white">{npc.name} [NPC]</div>
                    <div className="text-[10px] text-purple-200/70">{DISTRICTS[npc.district].name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      voiceEngine.speak(npc.greeting, npc.voicePersona || 'npc_warm');
                      onTeleportDistrict(npc.district);
                      flash(`Meeting ${npc.name} in ${DISTRICTS[npc.district].name}`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600/80 text-[11px] font-semibold"
                  >
                    Visit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {app === 'contacts' && (
          <div className="space-y-3">
            {WORLD_NPCS.map((npc) => (
              <div key={npc.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">{npc.name} [NPC]</div>
                  <div className="text-[11px] text-purple-200/70">{npc.role}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    voiceEngine.speak(npc.greeting, npc.voicePersona || 'npc_warm');
                    onTeleportDistrict(npc.district);
                    flash(`Traveled to ${npc.name}`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium"
                >
                  Visit
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SIMPHOTOS (Camera + Gallery Unified) */}
        {(app === 'camera' || app === 'gallery') && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                const url = onCapturePhoto();
                if (!url) return flash('Unable to capture frame right now.');
                const photo = {
                  id: `pic_${Date.now()}`,
                  title: DISTRICTS[playerState.activeDistrict].name,
                  dataUrl: url,
                  createdAt: Date.now(),
                };
                onUpdateState({
                  ...playerState,
                  galleryPhotos: [photo, ...playerState.galleryPhotos].slice(0, 12),
                });
                soundEngine.playClick();
                flash('Snapshot saved to SimPhotos!');
              }}
              className="w-full min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-xs flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Take 3D World Photo</span>
            </button>

            {playerState.galleryPhotos.length === 0 ? (
              <p className="text-xs text-purple-200/70">No photos captured yet. Snap a memory above!</p>
            ) : (
              playerState.galleryPhotos.map((p) => (
                <div key={p.id} className="rounded-xl overflow-hidden border border-white/10 bg-[#1a112b]">
                  <img src={p.dataUrl} alt={p.title} className="w-full h-36 object-cover" />
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <span>{p.title}</span>
                    <a href={p.dataUrl} download={`${p.title}.png`} className="text-purple-300 underline">
                      Save PNG
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SIMMAP */}
        {(app === 'map' || app === 'travel') && (
          <div className="space-y-2.5">
            <div className="text-xs text-purple-200/80 mb-1">Fast-Travel Across Worlds &amp; Global Districts:</div>
            {(Object.keys(DISTRICTS) as DistrictId[]).map((id) => {
              const d = DISTRICTS[id];
              const locked = id === 'sanctuary' && !playerState.unlockedSanctuary;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    onTeleportDistrict(id);
                    flash(`Arrived at ${d.name}`);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#1a112b] hover:border-purple-400/50 disabled:opacity-45 p-3 text-left flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {d.name} {playerState.activeDistrict === id ? '· Here' : ''}
                    </div>
                    <div className="text-[11px] text-purple-200/70">
                      {locked ? 'Locked: Find 2 Clues or reach 90 Rep' : d.subtitle}
                    </div>
                  </div>
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: d.accentHex }} />
                </button>
              );
            })}
            <div className="pt-2 text-[11px] font-semibold text-purple-300">Global Hubs</div>
            <div className="grid grid-cols-2 gap-1.5">
              {GLOBAL_DESTINATIONS.slice(0, 4).map((gd) => (
                <button
                  key={gd.id}
                  type="button"
                  onClick={() => {
                    onTeleportDistrict(gd.hubDistrict);
                    flash(`Arrived at ${gd.city}`);
                  }}
                  className="rounded-lg bg-[#1a112b] border border-white/10 p-2 text-left text-[11px]"
                >
                  <div className="font-semibold text-white truncate">{gd.city}</div>
                  <div className="text-purple-200/70 truncate">{gd.theme}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MIKAY MOTORS */}
        {app === 'vehicles' && (
          <div className="space-y-3">
            <div className="text-xs text-purple-200/80">
              Mikay Motors Garage ({playerState.ownedVehicles.length}) · Press [F] to drive · [G] Horn
            </div>
            {VEHICLE_LISTINGS.map((v) => {
              const held = playerState.ownedVehicles.find((ov) => ov.vehicleId === v.id);
              const isActive = playerState.activeVehicleId === v.id;
              return (
                <div key={v.id} className="rounded-xl border border-white/10 bg-[#1a112b] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{v.name}</div>
                      <div className="text-[11px] text-purple-200/70">
                        {v.category} · Top {Math.round(v.maxSpeed * 3.6)} km/h
                      </div>
                    </div>
                    {held && (
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateState({ ...playerState, activeVehicleId: v.id });
                          flash(`${v.name} summoned!`);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
                          isActive ? 'bg-emerald-600 text-white' : 'bg-white/10 text-purple-100'
                        }`}
                      >
                        {isActive ? 'Active' : 'Summon'}
                      </button>
                    )}
                  </div>
                  {held ? (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-purple-200/70">Paint:</span>
                      {['#5b21b6', '#b91c1c', '#1e1b2e', '#e2e8f0', '#d97706'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          aria-label={`Paint ${v.name} ${col}`}
                          onClick={() =>
                            onUpdateState({
                              ...playerState,
                              ownedVehicles: playerState.ownedVehicles.map((ov) =>
                                ov.vehicleId === v.id ? { ...ov, paintColor: col } : ov,
                              ),
                            })
                          }
                          className="w-5 h-5 rounded-full border border-white/30"
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const res = purchaseVehicle(playerState, v.id, 'rent');
                          if (!res.ok) return flash(res.error || 'Failed');
                          onUpdateState(res.nextState);
                          soundEngine.playCoinChime();
                          flash(`Rented ${v.name}! Press F to drive.`);
                        }}
                        className="flex-1 min-h-[36px] rounded-lg border border-white/15 text-xs tabular-nums"
                      >
                        Rent {v.rentPrice} MC
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const res = purchaseVehicle(playerState, v.id, 'buy');
                          if (!res.ok) return flash(res.error || 'Failed');
                          onUpdateState(res.nextState);
                          soundEngine.playCoinChime();
                          flash(`Purchased ${v.name}! Press F to drive.`);
                        }}
                        className="flex-1 min-h-[36px] rounded-lg bg-purple-600 text-xs font-semibold tabular-nums"
                      >
                        Buy {v.buyPrice} MC
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {app === 'properties' && (
          <div className="space-y-3">
            <p className="text-xs text-purple-200/80">
              Mikay Estates: {playerState.ownedProperties.length} owned/rented residences.
            </p>
            <button
              type="button"
              onClick={onOpenProperties}
              className="w-full min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold"
            >
              Open Mikay Estates Marketplace &amp; Designer
            </button>
          </div>
        )}

        {app === 'fashion' && (
          <div className="space-y-3">
            <p className="text-xs text-purple-200/80">Quick-wear any saved outfit or open the Character Studio.</p>
            {playerState.savedOutfits.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onUpdateState({
                    ...playerState,
                    appearance: {
                      ...playerState.appearance,
                      outfitCategory: o.category,
                      primaryColor: o.primaryColor,
                      accentColor: o.accentColor,
                      shoeStyle: o.shoeStyle,
                      accessory: o.accessory,
                    },
                  });
                  flash(`Equipped ${o.name}`);
                }}
                className="w-full rounded-xl bg-[#1a112b] border border-white/10 p-3 text-left flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold">{o.name}</div>
                  <div className="text-[11px] text-purple-200/70">{o.category}</div>
                </div>
                <span className="w-5 h-5 rounded-full border border-white/25" style={{ backgroundColor: o.primaryColor }} />
              </button>
            ))}
            <button type="button" onClick={onOpenStudio} className="w-full min-h-[44px] rounded-xl bg-purple-600 text-xs font-semibold">
              Open Character &amp; Fashion Studio
            </button>
          </div>
        )}

        {/* SIMMARKET (Shopping + Motors + Estates + Studio shortcuts) */}
        {app === 'shopping' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5">
              <button type="button" onClick={onOpenStudio} className="min-h-[38px] rounded-lg bg-purple-600/30 border border-purple-400/30 text-[11px] font-semibold">
                Fashion Studio
              </button>
              <button type="button" onClick={() => setApp('vehicles')} className="min-h-[38px] rounded-lg bg-sky-600/30 border border-sky-400/30 text-[11px] font-semibold">
                Mikay Motors
              </button>
              <button type="button" onClick={onOpenProperties} className="min-h-[38px] rounded-lg bg-rose-600/30 border border-rose-400/30 text-[11px] font-semibold">
                Mikay Estates
              </button>
            </div>
            <div className="text-xs text-purple-200/80">Mikay Market · Gifts &amp; Collectibles</div>
            {shopItems.map((item) => {
              const owned = playerState.inventoryItems.includes(item.name);
              return (
                <div key={item.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-white">{item.name}</div>
                    <div className="text-[11px] text-purple-200/70">+{item.rep} Rep · {item.price} MC</div>
                  </div>
                  <button
                    type="button"
                    disabled={owned || playerState.velorCoins < item.price}
                    onClick={() => {
                      let next = addLedgerEntry(playerState, `Bought ${item.name}`, -item.price, 'purchase', item.rep, undefined, 5);
                      const secrets =
                        item.id === 'mirror_charm' && !next.secretsFound.includes('shop_charm')
                          ? [...next.secretsFound, 'shop_charm']
                          : next.secretsFound;
                      next = {
                        ...next,
                        inventoryItems: [...next.inventoryItems, item.name],
                        secretsFound: secrets,
                        unlockedSanctuary: next.unlockedSanctuary || secrets.length >= 2,
                      };
                      onUpdateState(next);
                      soundEngine.playCoinChime();
                      flash(`Purchased ${item.name}!`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 disabled:opacity-40 text-xs font-semibold"
                  >
                    {owned ? 'Owned' : 'Buy'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* BUSINESS */}
        {app === 'business' && (
          <div className="space-y-4">
            {playerState.ownedBusinesses.length > 0 && (
              <div className="rounded-xl bg-[#17221d] border border-emerald-400/25 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-200">Your Ventures ({playerState.ownedBusinesses.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const res = collectBusinessRevenue(playerState);
                      onUpdateState(res.nextState);
                      soundEngine.playCoinChime();
                      flash(`Collected +${res.collected} MC & +8 LM!`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold"
                  >
                    Collect Profits
                  </button>
                </div>
                {playerState.ownedBusinesses.map((b) => (
                  <div key={b.id} className="text-xs text-emerald-100/85">
                    {b.customName} · {DISTRICTS[b.district].name} · Earned {b.totalEarned} MC
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="biz-custom-name" className="block text-xs text-purple-200/80">
                Name Your New Business
              </label>
              <input
                id="biz-custom-name"
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. Mikay Couture House"
                className="w-full min-h-[40px] rounded-lg bg-[#0a0612] border border-white/15 px-3 text-xs"
              />
            </div>

            {BUSINESS_CATALOG.map((def) => (
              <div key={def.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">{def.name}</div>
                  <div className="text-[11px] text-purple-200/70">
                    {DISTRICTS[def.district].name} · +{def.tickProfit} MC/cycle
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = launchBusiness(playerState, def.id, bizName || def.name);
                    if (!res.ok) return flash(res.error || 'Could not launch');
                    onUpdateState(res.nextState);
                    setBizName('');
                    soundEngine.playCoinChime();
                    flash(`Founded new venture in ${DISTRICTS[def.district].name}!`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-xs font-semibold tabular-nums shrink-0"
                >
                  {def.startupCost} MC
                </button>
              </div>
            ))}
          </div>
        )}

        {/* SIMNEWS & EVENTS */}
        {(app === 'events' || app === 'calendar') && (
          <div className="space-y-3">
            <div className="rounded-xl bg-[#1a112b] border border-purple-300/20 p-3 space-y-1.5">
              <div className="text-xs font-semibold text-amber-300">{WEEKLY_CITY_UPDATE.title}</div>
              <p className="text-xs text-purple-100/80">{WEEKLY_CITY_UPDATE.summary}</p>
            </div>

            {SIM_NEWS_HEADLINES.map((item) => (
              <div key={item.id} className="rounded-xl bg-[#160f26] border border-white/10 p-3 space-y-1">
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <p className="text-[11px] text-purple-200/80">{item.body}</p>
              </div>
            ))}

            <div className="rounded-xl bg-[#25132d] border border-pink-400/25 p-3 space-y-1">
              <div className="text-xs font-semibold text-amber-300">Grand Tree Plaza Event</div>
              <p className="text-xs text-purple-100/85">Join snowfall &amp; plaza festivities in Mikay City.</p>
              <button
                type="button"
                onClick={() => {
                  onChangeWeather('snow');
                  onTeleportDistrict('city');
                  flash('Joined Mikay City Plaza Event!');
                }}
                className="mt-1 px-3 py-1.5 rounded-lg bg-rose-600 text-xs font-semibold"
              >
                Attend Event
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-purple-200">Daily Challenges</div>
              {DAILY_CHALLENGES.map((dc) => {
                const claimed = playerState.dailyClaims.includes(dc.id);
                return (
                  <div key={dc.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-medium text-white">{dc.label}</div>
                      <div className="text-[11px] text-amber-300 tabular-nums">+{dc.rewardCoins} MC · +{dc.rewardRep} Rep</div>
                    </div>
                    <button
                      type="button"
                      disabled={claimed}
                      onClick={() => {
                        const updated = addLedgerEntry(playerState, `Daily: ${dc.label}`, dc.rewardCoins, 'reward', dc.rewardRep, undefined, 10);
                        onUpdateState({ ...updated, dailyClaims: [...updated.dailyClaims, dc.id] });
                        soundEngine.playCoinChime();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 disabled:opacity-40 text-xs font-semibold flex items-center gap-1"
                    >
                      {claimed ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{claimed ? 'Claimed' : 'Claim'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SIMMUSIC */}
        {app === 'music' && (
          <div className="space-y-2.5">
            <p className="text-xs text-purple-200/80">Select live radio station across Mikay&apos;s Simulation:</p>
            {(
              [
                ['holiday', 'Winter Wonderland Bells'],
                ['lounge', 'Veloria Midnight Lounge'],
                ['runway', 'Runway Revolution Pulse'],
                ['campus', 'Mikay Campus Chill'],
                ['horror', 'DARKSIDE Suspense Ambience'],
                ['off', 'Radio Off'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  soundEngine.setStation(id);
                  onUpdateState({
                    ...playerState,
                    settings: { ...playerState.settings, musicStation: id },
                  });
                }}
                className={`w-full min-h-[44px] rounded-xl border px-4 text-left text-xs font-semibold ${
                  playerState.settings.musicStation === id ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#1a112b]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* SIMSETTINGS */}
        {app === 'settings' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-white">Time &amp; Weather Controls</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['day', 'sunset', 'night'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChangeTimeOfDay(t)}
                    className={`min-h-[36px] rounded-lg border text-xs capitalize ${
                      timeOfDay === t ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['clear', 'rain', 'snow'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onChangeWeather(w)}
                    className={`min-h-[36px] rounded-lg border text-xs capitalize ${
                      weather === w ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3 space-y-2">
              <div className="text-xs font-semibold text-white">Mikay X Wallpaper</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['veloria', 'midnight', 'lavender', 'emerald'] as const).map((wp) => (
                  <button
                    key={wp}
                    type="button"
                    onClick={() =>
                      onUpdateState({
                        ...playerState,
                        settings: { ...playerState.settings, phoneWallpaper: wp },
                      })
                    }
                    className={`min-h-[34px] rounded-lg border text-[11px] capitalize ${
                      playerState.settings.phoneWallpaper === wp
                        ? 'border-purple-400 bg-purple-600/30'
                        : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    {wp}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl bg-[#1a112b] border border-white/10 p-3 text-xs cursor-pointer">
              <span>Character &amp; Story Voices</span>
              <input
                type="checkbox"
                checked={playerState.settings.voicesEnabled}
                onChange={(e) => {
                  voiceEngine.setVoicesEnabled(e.target.checked);
                  onUpdateState({
                    ...playerState,
                    settings: { ...playerState.settings, voicesEnabled: e.target.checked },
                  });
                }}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-[#1a112b] border border-white/10 p-3 text-xs cursor-pointer">
              <span>Mute All Sound &amp; Music</span>
              <input
                type="checkbox"
                checked={playerState.settings.audioMuted}
                onChange={(e) => {
                  soundEngine.setMuted(e.target.checked);
                  if (e.target.checked) voiceEngine.stop();
                  onUpdateState({
                    ...playerState,
                    settings: { ...playerState.settings, audioMuted: e.target.checked },
                  });
                }}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl bg-[#1a112b] border border-white/10 p-3 text-xs cursor-pointer">
              <span>Christmas Wonderland Decor</span>
              <input
                type="checkbox"
                checked={playerState.settings.christmasEdition}
                onChange={(e) =>
                  onUpdateState({
                    ...playerState,
                    settings: { ...playerState.settings, christmasEdition: e.target.checked },
                  })
                }
              />
            </label>

            <button type="button" onClick={onOpenAuth} className="w-full min-h-[42px] rounded-xl bg-purple-600 text-xs font-semibold">
              Account, Cloud Save &amp; Security
            </button>
            <button type="button" onClick={onOpenInstall} className="w-full min-h-[42px] rounded-xl border border-purple-300/30 text-xs font-semibold">
              Install Mobile App / Android Package Info
            </button>
          </div>
        )}

        {/* PROFILE */}
        {app === 'profile' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-[#1c1330] border border-white/10 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <img src="/pwa-192x192.png" alt="Mikay Identity Crest" className="w-12 h-12 rounded-xl object-cover border border-purple-300/30" />
                <div>
                  <div className="font-display text-xl font-semibold text-white">{playerState.characterName}</div>
                  <div className="text-xs text-amber-300">
                    {playerState.vipTier} · {playerState.parallelPath}
                  </div>
                </div>
              </div>
              <p className="text-xs text-purple-100/80">{playerState.bio}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3">
                <div className="text-purple-200/70">Reputation</div>
                <div className="text-lg font-bold tabular-nums">{playerState.reputation}</div>
              </div>
              <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3">
                <div className="text-purple-200/70">DARKSIDE Survived</div>
                <div className="text-lg font-bold tabular-nums">{playerState.completedHorror.length} / 10</div>
              </div>
              <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3">
                <div className="text-purple-200/70">Estates Owned</div>
                <div className="text-lg font-bold tabular-nums">{playerState.ownedProperties.length}</div>
              </div>
              <div className="rounded-xl bg-[#1a112b] border border-white/10 p-3">
                <div className="text-purple-200/70">Stories Completed</div>
                <div className="text-lg font-bold tabular-nums">{playerState.completedStories.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* SIMJOBS */}
        {app === 'jobs' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-purple-200/80">Work shifts for Mikay Coins &amp; Lumina:</p>
              <button
                type="button"
                onClick={() => setApp('business')}
                className="text-xs text-emerald-300 underline"
              >
                My Businesses
              </button>
            </div>
            {CAREERS.map((c) => (
              <div key={c.id} className="rounded-xl bg-[#1a112b] border border-white/10 p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">{c.title}</div>
                  <div className="text-[11px] text-purple-200/70">
                    {c.pathAffinity} · +{c.payPerShift} MC · +6 LM
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = workCareerShift(playerState, c.id);
                    onUpdateState(res.nextState);
                    soundEngine.playCoinChime();
                    flash(`Completed ${c.title} shift! +${res.earned} MC & +6 LM`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold shrink-0"
                >
                  Work Shift
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
