import {
  BUSINESS_CATALOG,
  CAREERS,
  DARKSIDE_HORROR_EXPERIENCES,
  DEFAULT_APPEARANCE,
  DISTRICTS,
  INITIAL_CREATOR_EXPERIENCES,
  INITIAL_SIMGRAM_POSTS,
  INITIAL_SIMTOK_CLIPS,
  PROPERTY_LISTINGS,
  VEHICLE_LISTINGS,
} from './catalog';
import type {
  CreatorExperienceDef,
  DistrictId,
  EmoteId,
  OnlinePlayerPresence,
  ParallelPath,
  PlayerSaveState,
  StoryArc,
} from './types';

export interface WorldBoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WORLD_RADIUS = 105;

export function clampDt(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, 0.05);
}

export function createInitialPlayerState(opts?: {
  accountId?: string;
  isGuest?: boolean;
  username?: string;
  characterName?: string;
}): PlayerSaveState {
  const isGuest = opts?.isGuest ?? true;
  const username = opts?.username || (isGuest ? 'GuestResident' : 'MikayPlayer');
  const characterName = opts?.characterName || (isGuest ? 'Mikay Guest' : username);
  return {
    accountId: opts?.accountId || `guest_${Date.now()}`,
    isGuest,
    username,
    characterName,
    bio: 'Your Life. Your Rules. Your Reality — building a story across Mikay’s Simulation.',
    appearance: { ...DEFAULT_APPEARANCE },
    savedOutfits: [
      {
        id: 'outfit_veloria_sig',
        name: 'Veloria Evening Signature',
        category: 'Veloria Exclusive',
        primaryColor: '#5b21b6',
        accentColor: '#d4b483',
        shoeStyle: 'heels',
        accessory: 'pearl_earrings',
      },
      {
        id: 'outfit_festive_gala',
        name: 'Christmas Wonderland Coat',
        category: 'Christmas',
        primaryColor: '#9f1239',
        accentColor: '#e2e8f0',
        shoeStyle: 'boots',
        accessory: 'holiday_scarf',
      },
      {
        id: 'outfit_ankara_gold',
        name: 'Royal Ankara Heritage',
        category: 'Traditional African',
        primaryColor: '#b45309',
        accentColor: '#d4b483',
        shoeStyle: 'heels',
        accessory: 'pearl_earrings',
      },
    ],
    velorCoins: 2400,
    lumina: 180,
    savingsCoins: 600,
    reputation: 25,
    vipTier: 'Resident',
    parallelPath: 'Fashion Icon',
    pathScores: {
      'Fashion Icon': 25,
      'Business Mogul': 10,
      'Academic Scholar': 10,
      'Global Celebrity': 15,
      'Travel Influencer': 10,
    },
    currentCareerId: 'fashion_designer',
    activeDistrict: 'city',
    playerPos: [...DISTRICTS.city.spawnPos],
    ownedProperties: [],
    ownedVehicles: [],
    activeVehicleId: null,
    ownedBusinesses: [],
    inventoryItems: ['Mikay Mirror Keyring', 'Holiday Sparkler'],
    completedStories: [],
    completedHorror: [],
    storyDecisions: {},
    arcadeHighScores: {},
    customExperiences: [...INITIAL_CREATOR_EXPERIENCES],
    simGramPosts: [...INITIAL_SIMGRAM_POSTS],
    simTokClips: [...INITIAL_SIMTOK_CLIPS],
    secretsFound: [],
    unlockedSanctuary: false,
    relationships: [
      {
        targetId: 'npc_zara',
        targetName: 'Zara Adeyemi [NPC]',
        isNpc: true,
        level: 35,
        status: 'Friend',
        lastInteraction: Date.now(),
      },
    ],
    friends: [],
    blockedUsers: [],
    transactions: [
      {
        id: 'tx_welcome',
        label: 'Welcome Grant · Mikay City',
        amount: 2400,
        timestamp: Date.now(),
        category: 'reward',
      },
    ],
    dailyClaims: [],
    galleryPhotos: [],
    settings: {
      graphicsQuality: 'high',
      audioMuted: false,
      voicesEnabled: true,
      musicStation: 'holiday',
      phoneWallpaper: 'veloria',
      privacyAllowInvites: true,
      privacyShowOnline: true,
      highContrastHud: false,
      christmasEdition: true,
    },
  };
}

export function computeVipTier(reputation: number): PlayerSaveState['vipTier'] {
  if (reputation >= 500) return 'World Icon';
  if (reputation >= 220) return 'Veloria Elite';
  if (reputation >= 90) return 'Rising Star';
  return 'Resident';
}

export function computeLeadingPath(pathScores: Record<ParallelPath, number>): ParallelPath {
  let best: ParallelPath = 'Fashion Icon';
  let max = -1;
  for (const [k, v] of Object.entries(pathScores) as [ParallelPath, number][]) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}

export function addLedgerEntry(
  state: PlayerSaveState,
  label: string,
  amount: number,
  category: PlayerSaveState['transactions'][number]['category'],
  repGain = 0,
  pathBonus?: ParallelPath,
  luminaGain = 0,
): PlayerSaveState {
  const nextCoins = Math.max(0, state.velorCoins + amount);
  const nextLumina = Math.max(0, (state.lumina ?? 0) + luminaGain);
  const nextRep = Math.max(0, state.reputation + repGain);
  const nextScores = { ...state.pathScores };
  if (pathBonus) {
    nextScores[pathBonus] = (nextScores[pathBonus] || 0) + Math.max(5, repGain);
  }
  const tx = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label,
    amount,
    timestamp: Date.now(),
    category,
  };
  return {
    ...state,
    velorCoins: nextCoins,
    lumina: nextLumina,
    reputation: nextRep,
    vipTier: computeVipTier(nextRep),
    pathScores: nextScores,
    parallelPath: computeLeadingPath(nextScores),
    transactions: [tx, ...state.transactions].slice(0, 40),
  };
}

export function purchaseProperty(
  state: PlayerSaveState,
  propertyId: string,
  mode: 'buy' | 'rent',
): { ok: boolean; error?: string; nextState: PlayerSaveState } {
  const listing = PROPERTY_LISTINGS.find((p) => p.id === propertyId);
  if (!listing) return { ok: false, error: 'Property not found', nextState: state };
  if (state.ownedProperties.some((p) => p.propertyId === propertyId)) {
    return { ok: false, error: 'You already hold this property', nextState: state };
  }
  const cost = mode === 'buy' ? listing.buyPrice : listing.rentPerDay;
  if (state.velorCoins < cost) {
    return { ok: false, error: `Need ${cost} Mikay Coins (MC)`, nextState: state };
  }
  const updated = addLedgerEntry(
    state,
    `${mode === 'buy' ? 'Purchased' : 'Rented'} ${listing.name}`,
    -cost,
    'purchase',
    mode === 'buy' ? 30 : 10,
    'Business Mogul',
  );
  return {
    ok: true,
    nextState: {
      ...updated,
      ownedProperties: [
        ...updated.ownedProperties,
        {
          propertyId,
          ownership: mode === 'buy' ? 'owned' : 'rented',
          wallpaperColor: listing.defaultWallpaper,
          lightingMood: 'warm',
          furniture: ['Velvet Lounge Sofa', 'Silver Vanity Mirror'],
          allowVisitors: true,
        },
      ],
    },
  };
}

export function purchaseVehicle(
  state: PlayerSaveState,
  vehicleId: string,
  mode: 'buy' | 'rent',
): { ok: boolean; error?: string; nextState: PlayerSaveState } {
  const listing = VEHICLE_LISTINGS.find((v) => v.id === vehicleId);
  if (!listing) return { ok: false, error: 'Vehicle not found', nextState: state };
  const existing = state.ownedVehicles.find((v) => v.vehicleId === vehicleId);
  if (existing && existing.ownership === 'owned') {
    return { ok: false, error: 'Vehicle already in your garage', nextState: state };
  }
  const cost = mode === 'buy' ? listing.buyPrice : listing.rentPrice;
  if (state.velorCoins < cost) {
    return { ok: false, error: `Need ${cost} Mikay Coins (MC)`, nextState: state };
  }
  const updated = addLedgerEntry(
    state,
    `${mode === 'buy' ? 'Purchased' : 'Rented'} ${listing.name}`,
    -cost,
    'purchase',
    mode === 'buy' ? 20 : 6,
    'Travel Influencer',
  );
  const filtered = updated.ownedVehicles.filter((v) => v.vehicleId !== vehicleId);
  return {
    ok: true,
    nextState: {
      ...updated,
      activeVehicleId: vehicleId,
      ownedVehicles: [
        ...filtered,
        {
          vehicleId,
          ownership: mode === 'buy' ? 'owned' : 'rented',
          paintColor: listing.defaultColor,
          condition: 100,
        },
      ],
    },
  };
}

export function workCareerShift(
  state: PlayerSaveState,
  careerId: string,
): { ok: boolean; error?: string; nextState: PlayerSaveState; earned: number } {
  const career = CAREERS.find((c) => c.id === careerId);
  if (!career) return { ok: false, error: 'Career not found', nextState: state, earned: 0 };
  const vipBonus =
    state.vipTier === 'World Icon'
      ? 1.35
      : state.vipTier === 'Veloria Elite'
        ? 1.2
        : state.vipTier === 'Rising Star'
          ? 1.1
          : 1;
  const earned = Math.round(career.payPerShift * vipBonus);
  const updated = addLedgerEntry(
    state,
    `Career Shift · ${career.title}`,
    earned,
    'salary',
    career.reputationGain,
    career.pathAffinity,
    6,
  );
  return {
    ok: true,
    earned,
    nextState: { ...updated, currentCareerId: careerId },
  };
}

export function launchBusiness(
  state: PlayerSaveState,
  defId: string,
  customName: string,
): { ok: boolean; error?: string; nextState: PlayerSaveState } {
  const def = BUSINESS_CATALOG.find((b) => b.id === defId);
  if (!def) return { ok: false, error: 'Business template not found', nextState: state };
  const cleanName = customName.trim();
  if (cleanName.length < 3) {
    return { ok: false, error: 'Enter a business name (3+ characters)', nextState: state };
  }
  if (state.velorCoins < def.startupCost) {
    return { ok: false, error: `Need ${def.startupCost} Mikay Coins (MC)`, nextState: state };
  }
  const updated = addLedgerEntry(
    state,
    `Founded ${cleanName}`,
    -def.startupCost,
    'purchase',
    35,
    'Business Mogul',
  );
  return {
    ok: true,
    nextState: {
      ...updated,
      ownedBusinesses: [
        ...updated.ownedBusinesses,
        {
          id: `biz_${Date.now()}`,
          defId,
          customName: cleanName,
          district: def.district,
          level: 1,
          staffCount: 2,
          totalEarned: 0,
        },
      ],
    },
  };
}

export function collectBusinessRevenue(state: PlayerSaveState): {
  nextState: PlayerSaveState;
  collected: number;
} {
  if (state.ownedBusinesses.length === 0) {
    return { nextState: state, collected: 0 };
  }
  let total = 0;
  const updatedList = state.ownedBusinesses.map((biz) => {
    const def = BUSINESS_CATALOG.find((b) => b.id === biz.defId);
    const rev = (def?.tickProfit ?? 100) * biz.level + biz.staffCount * 20;
    total += rev;
    return { ...biz, totalEarned: biz.totalEarned + rev };
  });
  const next = addLedgerEntry(
    state,
    `Business Profits (${state.ownedBusinesses.length} ventures)`,
    total,
    'business',
    10,
    'Business Mogul',
    8,
  );
  return {
    collected: total,
    nextState: { ...next, ownedBusinesses: updatedList },
  };
}

export function evaluateStoryChoice(
  state: PlayerSaveState,
  arc: StoryArc,
  nodeId: string,
  choiceId: string,
): { nextState: PlayerSaveState; nextNodeId: string; consequence: string } {
  const node = arc.nodes[nodeId];
  const choice = node?.choices?.find((c) => c.id === choiceId);
  if (!choice) {
    return { nextState: state, nextNodeId: nodeId, consequence: '' };
  }
  let next = addLedgerEntry(
    state,
    `Story: ${arc.title}`,
    choice.coinReward,
    'story',
    choice.repReward,
    choice.pathBonus,
    10,
  );
  const nextNode = arc.nodes[choice.nextNodeId];
  const completed =
    nextNode && nextNode.endingTitle && !next.completedStories.includes(arc.id)
      ? [...next.completedStories, arc.id]
      : next.completedStories;

  let secretsFound = next.secretsFound;
  let unlockedSanctuary = next.unlockedSanctuary;
  if (choice.id === 'c_unlock' && !secretsFound.includes('mirror_frame_key')) {
    secretsFound = [...secretsFound, 'mirror_frame_key'];
  }
  if (secretsFound.length >= 2 || next.reputation >= 90) {
    unlockedSanctuary = true;
  }

  next = {
    ...next,
    completedStories: completed,
    storyDecisions: { ...next.storyDecisions, [`${arc.id}:${nodeId}`]: choiceId },
    secretsFound,
    unlockedSanctuary,
  };
  return {
    nextState: next,
    nextNodeId: choice.nextNodeId,
    consequence: choice.consequenceText,
  };
}

export function depositToSavings(
  state: PlayerSaveState,
  rawAmount: number,
): { ok: boolean; error?: string; nextState: PlayerSaveState } {
  const amount = Math.floor(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter a valid positive amount', nextState: state };
  }
  if (state.velorCoins < amount) {
    return { ok: false, error: 'Insufficient wallet Mikay Coins', nextState: state };
  }
  const updated = addLedgerEntry(state, `SimBank Savings Deposit`, -amount, 'purchase', 2);
  return {
    ok: true,
    nextState: {
      ...updated,
      savingsCoins: (updated.savingsCoins ?? 0) + amount,
    },
  };
}

export function withdrawFromSavings(
  state: PlayerSaveState,
  rawAmount: number,
): { ok: boolean; error?: string; nextState: PlayerSaveState } {
  const amount = Math.floor(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter a valid positive amount', nextState: state };
  }
  const currentSavings = state.savingsCoins ?? 0;
  if (currentSavings < amount) {
    return { ok: false, error: 'Insufficient SimBank savings balance', nextState: state };
  }
  const updated = addLedgerEntry(state, `SimBank Savings Withdrawal`, amount, 'reward', 0);
  return {
    ok: true,
    nextState: {
      ...updated,
      savingsCoins: currentSavings - amount,
    },
  };
}

export function completeHorrorExperience(
  state: PlayerSaveState,
  horrorId: string,
  mistakes = 0,
): { ok: boolean; error?: string; nextState: PlayerSaveState; earnedCoins: number; earnedLumina: number } {
  const exp = DARKSIDE_HORROR_EXPERIENCES.find((h) => h.id === horrorId);
  if (!exp) {
    return { ok: false, error: 'Experience not found', nextState: state, earnedCoins: 0, earnedLumina: 0 };
  }
  const penalty = Math.min(80, mistakes * 35);
  const earnedCoins = Math.max(100, exp.coinReward - penalty);
  const earnedLumina = Math.max(12, exp.luminaReward - mistakes * 5);
  const updated = addLedgerEntry(
    state,
    `DARKSIDE: ${exp.title}`,
    earnedCoins,
    'horror',
    24,
    'Global Celebrity',
    earnedLumina,
  );
  const completedHorror = updated.completedHorror.includes(horrorId)
    ? updated.completedHorror
    : [...updated.completedHorror, horrorId];
  return {
    ok: true,
    earnedCoins,
    earnedLumina,
    nextState: {
      ...updated,
      completedHorror,
    },
  };
}

export function publishCreatorExperience(
  state: PlayerSaveState,
  draft: {
    title: string;
    category: CreatorExperienceDef['category'];
    description: string;
    promptLine: string;
    rewardCoins?: number;
  },
): { ok: boolean; error?: string; experience?: CreatorExperienceDef; nextState: PlayerSaveState } {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const promptLine = draft.promptLine.trim();
  if (title.length < 3) {
    return { ok: false, error: 'Experience title must be at least 3 characters.', nextState: state };
  }
  if (description.length < 6) {
    return { ok: false, error: 'Add a short description (6+ characters).', nextState: state };
  }
  if (promptLine.length < 4) {
    return { ok: false, error: 'Add an opening scene line for players (4+ characters).', nextState: state };
  }
  const rewardCoins = Math.max(60, Math.min(250, Math.round(draft.rewardCoins ?? 120)));
  const exp: CreatorExperienceDef = {
    id: `ce_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    title,
    category: draft.category,
    description,
    creatorName: state.characterName || state.username,
    rewardCoins,
    createdAt: Date.now(),
    promptLine,
  };
  const updated = addLedgerEntry(
    state,
    `Published Experience: ${title}`,
    75,
    'creator',
    18,
    'Business Mogul',
    15,
  );
  return {
    ok: true,
    experience: exp,
    nextState: {
      ...updated,
      customExperiences: [exp, ...(updated.customExperiences || [])].slice(0, 24),
    },
  };
}

export function playCreatorExperience(
  state: PlayerSaveState,
  expId: string,
): { ok: boolean; nextState: PlayerSaveState; earnedCoins: number } {
  const exp = (state.customExperiences || []).find((e) => e.id === expId);
  if (!exp) return { ok: false, nextState: state, earnedCoins: 0 };
  const updated = addLedgerEntry(
    state,
    `Played Creator Experience: ${exp.title}`,
    exp.rewardCoins,
    'creator',
    12,
    'Travel Influencer',
    10,
  );
  return {
    ok: true,
    earnedCoins: exp.rewardCoins,
    nextState: updated,
  };
}

export function addSimGramPost(
  state: PlayerSaveState,
  caption: string,
  tag = '#MikaysSimulation',
): { ok: boolean; error?: string; nextState: PlayerSaveState } {
  const clean = caption.trim().slice(0, 180);
  if (clean.length < 3) {
    return { ok: false, error: 'Write at least 3 characters to post on SimGram.', nextState: state };
  }
  const post = {
    id: `sg_${Date.now()}`,
    author: state.characterName,
    handle: `@${state.username.toLowerCase()}`,
    caption: clean,
    tag: tag.startsWith('#') ? tag : `#${tag}`,
    likes: 1,
    liked: true,
    comments: [],
    createdAt: Date.now(),
  };
  const updated = addLedgerEntry(state, 'SimGram Post Bonus', 20, 'reward', 4, 'Global Celebrity', 2);
  return {
    ok: true,
    nextState: {
      ...updated,
      simGramPosts: [post, ...(updated.simGramPosts || [])].slice(0, 20),
    },
  };
}

export function toggleSimGramLike(state: PlayerSaveState, postId: string): PlayerSaveState {
  return {
    ...state,
    simGramPosts: (state.simGramPosts || []).map((p) =>
      p.id === postId
        ? { ...p, liked: !p.liked, likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1 }
        : p,
    ),
  };
}

const UNSAFE_WORDS = [
  'kill',
  'hate',
  'stupid',
  'idiot',
  'loser',
  'scam',
  'password',
  'credit card',
  'ssn',
  'damn',
  'hell',
  'crap',
];

export function moderateChatMessage(raw: string): {
  allowed: boolean;
  cleaned: string;
  flagged: boolean;
  reason?: string;
} {
  const trimmed = raw.trim().slice(0, 240);
  if (!trimmed) {
    return { allowed: false, cleaned: '', flagged: false, reason: 'Empty message' };
  }
  let cleaned = trimmed;
  let flagged = false;
  for (const word of UNSAFE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(cleaned)) {
      flagged = true;
      cleaned = cleaned.replace(regex, '***');
    }
  }
  // Redact phone/email-like personal info for age-appropriate safety
  const piiRegex = /(\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\S+@\S+\.\S+\b)/gi;
  if (piiRegex.test(cleaned)) {
    flagged = true;
    cleaned = cleaned.replace(piiRegex, '[redacted for safety]');
  }
  return { allowed: true, cleaned, flagged };
}

export function getDistrictAt(x: number, z: number): DistrictId {
  if (z < -68 && Math.abs(x) < 28) return 'sanctuary';
  if (x < -28 && z < -20) return 'luxury';
  if (x < -26 && z > 20) return 'sunset_bay';
  if (x > 26 && z < -20) return 'old_town';
  if (x > 26 && z > 20) return 'island';
  return 'city';
}

export function groundHeightAt(x: number, z: number): number {
  if (x < -46 && z > 66) {
    const depth = Math.min(0.65, (z - 66) * 0.04);
    return -depth;
  }
  if (z < -68 && Math.abs(x) < 24) {
    return 0.6;
  }
  return 0;
}

export function resolveWorldMovement(
  x: number,
  z: number,
  colliders: WorldBoxCollider[],
  radius = 0.55,
): { x: number; z: number } {
  let nx = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, x));
  let nz = Math.max(-WORLD_RADIUS, Math.min(WORLD_RADIUS, z));

  for (const box of colliders) {
    const minX = box.minX - radius;
    const maxX = box.maxX + radius;
    const minZ = box.minZ - radius;
    const maxZ = box.maxZ + radius;
    if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
      const dxLeft = Math.abs(nx - minX);
      const dxRight = Math.abs(maxX - nx);
      const dzTop = Math.abs(nz - minZ);
      const dzBottom = Math.abs(maxZ - nz);
      const minPen = Math.min(dxLeft, dxRight, dzTop, dzBottom);
      if (minPen === dxLeft) nx = minX;
      else if (minPen === dxRight) nx = maxX;
      else if (minPen === dzTop) nz = minZ;
      else nz = maxZ;
    }
  }
  return { x: nx, z: nz };
}

export const EMOTE_NEARBY_RADIUS = 12;

export const VALID_EMOTE_IDS: readonly EmoteId[] = ['wave', 'dance', 'laugh', 'clap', 'pose'];

export function isValidEmoteId(value: unknown): value is EmoteId {
  return typeof value === 'string' && (VALID_EMOTE_IDS as readonly string[]).includes(value);
}

export function findNearbyOnlinePlayers(
  playerPos: [number, number, number],
  onlinePlayers: OnlinePlayerPresence[],
  maxDistance = EMOTE_NEARBY_RADIUS,
): OnlinePlayerPresence[] {
  const maxDistSq = maxDistance * maxDistance;
  const withDist: { player: OnlinePlayerPresence; distSq: number }[] = [];
  for (const p of onlinePlayers) {
    if (!Array.isArray(p.pos) || p.pos.length < 3) continue;
    const dx = p.pos[0] - playerPos[0];
    const dz = p.pos[2] - playerPos[2];
    const distSq = dx * dx + dz * dz;
    if (distSq <= maxDistSq) {
      withDist.push({ player: p, distSq });
    }
  }
  withDist.sort((a, b) => a.distSq - b.distSq);
  return withDist.map((entry) => entry.player);
}
