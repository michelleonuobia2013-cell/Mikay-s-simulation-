export type DistrictId =
  | 'city'
  | 'luxury'
  | 'sunset_bay'
  | 'old_town'
  | 'island'
  | 'sanctuary';

export type TimeOfDay = 'day' | 'sunset' | 'night';
export type WeatherMode = 'clear' | 'rain' | 'snow';

export type FashionCategory =
  | 'Elegant'
  | 'Luxury'
  | 'Casual'
  | 'Streetwear'
  | 'Party'
  | 'Beachwear'
  | 'School'
  | 'Christmas'
  | 'Traditional African'
  | 'Professional'
  | 'Celebrity'
  | 'Evening'
  | 'Veloria Exclusive';

export type HairStyleId =
  | 'flowing_waves'
  | 'sleek_ponytail'
  | 'braided_crown'
  | 'voluminous_curls'
  | 'short_taper'
  | 'side_bob'
  | 'luxury_updo'
  | 'festive_chignon';

export type ShoeStyleId = 'heels' | 'sneakers' | 'loafers' | 'boots' | 'sandals';
export type AccessoryId = 'none' | 'pearl_earrings' | 'gold_chain' | 'sunglasses' | 'tiara' | 'holiday_scarf';

export type ParallelPath =
  | 'Fashion Icon'
  | 'Business Mogul'
  | 'Academic Scholar'
  | 'Global Celebrity'
  | 'Travel Influencer';

export type VoicePersona = 'narrator' | 'npc_warm' | 'youth' | 'executive' | 'horror' | 'player';

export interface OutfitConfig {
  id: string;
  name: string;
  category: FashionCategory;
  primaryColor: string;
  accentColor: string;
  shoeStyle: ShoeStyleId;
  accessory: AccessoryId;
}

export interface CharacterAppearance {
  gender: 'female' | 'male';
  skinTone: string;
  eyeColor: string;
  hairStyle: HairStyleId;
  hairColor: string;
  lipColor: string;
  blushIntensity: number;
  outfitCategory: FashionCategory;
  primaryColor: string;
  accentColor: string;
  shoeStyle: ShoeStyleId;
  accessory: AccessoryId;
}

export interface PropertyListing {
  id: string;
  name: string;
  district: DistrictId;
  type: 'Apartment' | 'House' | 'Beach House' | 'Mansion' | 'Penthouse';
  buyPrice: number;
  rentPerDay: number;
  maxGuests: number;
  description: string;
  defaultWallpaper: string;
  worldPos: [number, number, number];
}

export interface OwnedProperty {
  propertyId: string;
  ownership: 'owned' | 'rented';
  wallpaperColor: string;
  lightingMood: 'warm' | 'lilac' | 'golden' | 'festive';
  furniture: string[];
  allowVisitors: boolean;
}

export interface VehicleListing {
  id: string;
  name: string;
  category: 'Sedan' | 'Sports' | 'SUV' | 'Convertible' | 'Motorcycle';
  buyPrice: number;
  rentPrice: number;
  maxSpeed: number;
  handling: number;
  defaultColor: string;
  description: string;
}

export interface OwnedVehicle {
  vehicleId: string;
  ownership: 'owned' | 'rented';
  paintColor: string;
  condition: number;
}

export interface CareerDef {
  id: string;
  title: string;
  payPerShift: number;
  reputationGain: number;
  pathAffinity: ParallelPath;
  district: DistrictId;
  description: string;
}

export interface BusinessDef {
  id: string;
  name: string;
  type: string;
  startupCost: number;
  tickProfit: number;
  district: DistrictId;
  description: string;
}

export interface OwnedBusiness {
  id: string;
  defId: string;
  customName: string;
  district: DistrictId;
  level: number;
  staffCount: number;
  totalEarned: number;
}

export interface TransactionEntry {
  id: string;
  label: string;
  amount: number;
  timestamp: number;
  category: 'salary' | 'business' | 'purchase' | 'arcade' | 'story' | 'reward' | 'horror' | 'creator';
}

export interface RelationshipEntry {
  targetId: string;
  targetName: string;
  isNpc: boolean;
  level: number; // 0..100
  status: 'Acquaintance' | 'Friend' | 'Close Friend' | 'Dating' | 'Partner';
  lastInteraction: number;
}

export interface SimGramPost {
  id: string;
  author: string;
  handle: string;
  caption: string;
  tag: string;
  likes: number;
  liked: boolean;
  comments: string[];
  createdAt: number;
}

export interface SimTokClip {
  id: string;
  creator: string;
  title: string;
  category: string;
  views: number;
  liked: boolean;
  durationSec: number;
}

export interface HorrorChoice {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface HorrorStep {
  id: string;
  title: string;
  location: string;
  narrative: string;
  clueText: string;
  choices: HorrorChoice[];
}

export interface HorrorExperienceDef {
  id: string;
  title: string;
  setting: string;
  difficulty: 'Standard' | 'Intense' | 'Nightmare';
  tagline: string;
  coinReward: number;
  luminaReward: number;
  steps: HorrorStep[];
}

export interface CreatorExperienceDef {
  id: string;
  title: string;
  category: 'Roleplay' | 'Campus' | 'Mystery' | 'Horror' | 'Runway';
  description: string;
  creatorName: string;
  rewardCoins: number;
  createdAt: number;
  promptLine: string;
}

export interface GlobalDestination {
  id: string;
  city: string;
  districtLabel: string;
  theme: string;
  hubDistrict: DistrictId;
}

export interface PlayerSaveState {
  accountId: string;
  isGuest: boolean;
  username: string;
  characterName: string;
  bio: string;
  appearance: CharacterAppearance;
  savedOutfits: OutfitConfig[];
  velorCoins: number; // Displayed in UI as Mikay Coins (MC)
  lumina: number; // Cosmetic & prestige currency (LM)
  savingsCoins: number; // SimBank Vault balance
  reputation: number;
  vipTier: 'Resident' | 'Rising Star' | 'Veloria Elite' | 'World Icon';
  parallelPath: ParallelPath;
  pathScores: Record<ParallelPath, number>;
  currentCareerId: string | null;
  activeDistrict: DistrictId;
  playerPos: [number, number, number];
  ownedProperties: OwnedProperty[];
  ownedVehicles: OwnedVehicle[];
  activeVehicleId: string | null;
  ownedBusinesses: OwnedBusiness[];
  inventoryItems: string[];
  completedStories: string[];
  completedHorror: string[];
  storyDecisions: Record<string, string>;
  arcadeHighScores: Record<string, number>;
  customExperiences: CreatorExperienceDef[];
  simGramPosts: SimGramPost[];
  simTokClips: SimTokClip[];
  secretsFound: string[];
  unlockedSanctuary: boolean;
  relationships: RelationshipEntry[];
  friends: string[];
  blockedUsers: string[];
  transactions: TransactionEntry[];
  dailyClaims: string[];
  galleryPhotos: { id: string; title: string; dataUrl: string; createdAt: number }[];
  settings: {
    graphicsQuality: 'high' | 'balanced';
    audioMuted: boolean;
    voicesEnabled: boolean;
    musicStation: 'lounge' | 'holiday' | 'runway' | 'campus' | 'horror' | 'off';
    phoneWallpaper: 'veloria' | 'midnight' | 'lavender' | 'emerald';
    privacyAllowInvites: boolean;
    privacyShowOnline: boolean;
    highContrastHud: boolean;
    christmasEdition: boolean;
  };
}

export type EmoteId = 'wave' | 'dance' | 'laugh' | 'clap' | 'pose';

export interface EmoteDef {
  id: EmoteId;
  label: string;
  durationMs: number;
  hotkey: string;
  description: string;
}

export interface OnlinePlayerPresence {
  sessionId: string;
  username: string;
  characterName: string;
  district: DistrictId;
  pos: [number, number, number];
  rotY: number;
  moving: boolean;
  inVehicle: boolean;
  vehicleColor?: string;
  appearance: CharacterAppearance;
  vipTier: string;
  isNpc: false;
  activeEmote?: EmoteId | null;
  emoteStartedAt?: number;
}

export interface WorldNpc {
  id: string;
  name: string;
  role: string;
  district: DistrictId;
  pos: [number, number, number];
  rotY: number;
  appearance: CharacterAppearance;
  greeting: string;
  voicePersona?: VoicePersona;
  isNpc: true;
}

export interface ChatMessage {
  id: string;
  channel: 'world' | 'dm' | 'party';
  senderId: string;
  senderName: string;
  senderIsNpc: boolean;
  recipientId?: string;
  text: string;
  voiceNote?: boolean;
  moderated?: boolean;
  timestamp: number;
}

export interface GameNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'reward' | 'invite' | 'friend' | 'warning';
  timestamp: number;
  actionDistrict?: DistrictId;
  read: boolean;
}

export interface StoryChoice {
  id: string;
  label: string;
  nextNodeId: string;
  pathBonus: ParallelPath;
  coinReward: number;
  repReward: number;
  consequenceText: string;
}

export interface StoryNode {
  id: string;
  speaker: string;
  speakerRole: string;
  text: string;
  mood: 'confident' | 'mysterious' | 'warm' | 'dramatic';
  voicePersona?: VoicePersona;
  choices?: StoryChoice[];
  endingTitle?: string;
  endingSummary?: string;
}

export interface StoryArc {
  id: string;
  title: string;
  genre: 'Ambition' | 'Mystery' | 'Romance' | 'Fashion' | 'Holiday' | 'Campus';
  description: string;
  startNodeId: string;
  nodes: Record<string, StoryNode>;
}

export type ArcadeGameId =
  | 'runway_revolution'
  | 'mystery_mansion'
  | 'city_rush'
  | 'secret_room'
  | 'dance_dynasty'
  | 'chefs_challenge'
  | 'treasure_trails'
  | 'escape_district'
  | 'design_empire'
  | 'star_search'
  | 'sweet_treats'
  | 'mini_obby';

export interface ArcadeGameDef {
  id: ArcadeGameId;
  title: string;
  tagline: string;
  category: string;
  maxReward: number;
  controlsHint: string;
}
