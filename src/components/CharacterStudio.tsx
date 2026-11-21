import React, { useState } from 'react';
import { X, Sparkles, Save, Check } from 'lucide-react';
import {
  EYE_COLORS,
  FASHION_CATEGORIES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  SKIN_TONES,
} from '../game/catalog';
import type {
  AccessoryId,
  CharacterAppearance,
  HairStyleId,
  OutfitConfig,
  PlayerSaveState,
  ShoeStyleId,
} from '../game/types';

interface CharacterStudioProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerSaveState;
  onUpdateProfile: (patch: {
    characterName?: string;
    bio?: string;
    appearance?: CharacterAppearance;
    savedOutfits?: OutfitConfig[];
  }) => void;
}

const HAIR_STYLES: { id: HairStyleId; label: string }[] = [
  { id: 'flowing_waves', label: 'Flowing Waves' },
  { id: 'sleek_ponytail', label: 'Sleek Ponytail' },
  { id: 'braided_crown', label: 'Braided Crown' },
  { id: 'voluminous_curls', label: 'Voluminous Curls' },
  { id: 'side_bob', label: 'Side-Swept Bob' },
  { id: 'luxury_updo', label: 'Luxury Updo' },
  { id: 'festive_chignon', label: 'Festive Chignon' },
  { id: 'short_taper', label: 'Classic Taper' },
];

const SHOE_STYLES: { id: ShoeStyleId; label: string }[] = [
  { id: 'heels', label: 'Atelier Heels' },
  { id: 'sneakers', label: 'Street Sneakers' },
  { id: 'loafers', label: 'Tailored Loafers' },
  { id: 'boots', label: 'Winter Boots' },
  { id: 'sandals', label: 'Coastal Sandals' },
];

const ACCESSORIES: { id: AccessoryId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'pearl_earrings', label: 'Pearl Earrings' },
  { id: 'gold_chain', label: 'Gold Chain' },
  { id: 'sunglasses', label: 'Studio Shades' },
  { id: 'tiara', label: 'Veloria Tiara' },
  { id: 'holiday_scarf', label: 'Christmas Scarf' },
];

const LIP_SHADES = [
  { label: 'Natural Rose', hex: '#a66b5c' },
  { label: 'Veloria Berry', hex: '#8f3a4e' },
  { label: 'Crimson Silk', hex: '#9f1239' },
  { label: 'Soft Mocha', hex: '#6d4436' },
];

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  isOpen,
  onClose,
  playerState,
  onUpdateProfile,
}) => {
  const [section, setSection] = useState<'identity' | 'features' | 'wardrobe' | 'collections'>('wardrobe');
  const [outfitTitle, setOutfitTitle] = useState('');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const app = playerState.appearance;

  const setAppearance = (patch: Partial<CharacterAppearance>) => {
    onUpdateProfile({ appearance: { ...app, ...patch } });
  };

  const handleSaveOutfit = () => {
    const title = outfitTitle.trim() || `${app.outfitCategory} Look`;
    const newOutfit: OutfitConfig = {
      id: `outfit_${Date.now()}`,
      name: title,
      category: app.outfitCategory,
      primaryColor: app.primaryColor,
      accentColor: app.accentColor,
      shoeStyle: app.shoeStyle,
      accessory: app.accessory,
    };
    onUpdateProfile({ savedOutfits: [newOutfit, ...playerState.savedOutfits] });
    setOutfitTitle('');
    setSavedToast(`Saved "${title}" to your collection`);
    setTimeout(() => setSavedToast(null), 2500);
  };

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-full max-w-md bg-[#120b1e]/95 border-r border-purple-300/20 text-[#f6f3fa] flex flex-col shadow-2xl" role="dialog" aria-label="Character Creation Studio">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Character Studio</h2>
          <p className="text-xs text-purple-200/70">Live 3D Atelier · Changes apply immediately</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Character Studio"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1 p-2 bg-[#0c0715] border-b border-white/10">
        {(
          [
            ['identity', 'Identity'],
            ['features', 'Face & Hair'],
            ['wardrobe', 'Fashion'],
            ['collections', 'Saved'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`min-h-[40px] rounded-lg text-xs font-semibold transition ${
              section === key ? 'bg-purple-600 text-white' : 'text-purple-200/75 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {section === 'identity' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="char-name-input" className="block text-xs font-medium text-purple-200/80 mb-1">
                Character Name
              </label>
              <input
                id="char-name-input"
                type="text"
                value={playerState.characterName}
                onChange={(e) => onUpdateProfile({ characterName: e.target.value })}
                className="w-full min-h-[44px] rounded-lg bg-[#0b0713] border border-white/15 px-3 text-sm text-white"
              />
            </div>

            <div>
              <label htmlFor="char-bio-input" className="block text-xs font-medium text-purple-200/80 mb-1">
                Personal Biography
              </label>
              <textarea
                id="char-bio-input"
                rows={3}
                value={playerState.bio}
                onChange={(e) => onUpdateProfile({ bio: e.target.value })}
                className="w-full rounded-lg bg-[#0b0713] border border-white/15 p-3 text-sm text-white"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Presentation</span>
              <div className="grid grid-cols-2 gap-2">
                {(['female', 'male'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setAppearance({ gender: g })}
                    className={`min-h-[44px] rounded-xl border text-sm font-semibold capitalize transition ${
                      app.gender === g
                        ? 'bg-purple-600/30 border-purple-400 text-white'
                        : 'bg-[#0d0817] border-white/10 text-purple-200/75'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'features' && (
          <div className="space-y-5">
            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Skin Tone</span>
              <div className="grid grid-cols-3 gap-2">
                {SKIN_TONES.map((st) => (
                  <button
                    key={st.hex}
                    type="button"
                    onClick={() => setAppearance({ skinTone: st.hex })}
                    className={`min-h-[44px] rounded-lg border px-2 flex items-center gap-2 text-xs ${
                      app.skinTone === st.hex ? 'border-purple-400 bg-white/10' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: st.hex }} />
                    <span className="truncate">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Eye Color</span>
              <div className="grid grid-cols-3 gap-2">
                {EYE_COLORS.map((ec) => (
                  <button
                    key={ec.hex}
                    type="button"
                    onClick={() => setAppearance({ eyeColor: ec.hex })}
                    className={`min-h-[44px] rounded-lg border px-2 flex items-center gap-2 text-xs ${
                      app.eyeColor === ec.hex ? 'border-purple-400 bg-white/10' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: ec.hex }} />
                    <span className="truncate">{ec.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Hairstyle</span>
              <div className="grid grid-cols-2 gap-2">
                {HAIR_STYLES.map((hs) => (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => setAppearance({ hairStyle: hs.id })}
                    className={`min-h-[44px] rounded-lg border px-3 text-xs font-medium text-left ${
                      app.hairStyle === hs.id
                        ? 'border-purple-400 bg-purple-600/25 text-white'
                        : 'border-white/10 bg-[#0d0817] text-purple-200/80'
                    }`}
                  >
                    {hs.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Hair Color</span>
              <div className="grid grid-cols-3 gap-2">
                {HAIR_COLORS.map((hc) => (
                  <button
                    key={hc.hex}
                    type="button"
                    onClick={() => setAppearance({ hairColor: hc.hex })}
                    className={`min-h-[44px] rounded-lg border px-2 flex items-center gap-2 text-xs ${
                      app.hairColor === hc.hex ? 'border-purple-400 bg-white/10' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0 border border-white/20" style={{ backgroundColor: hc.hex }} />
                    <span className="truncate">{hc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Makeup · Lip Shade</span>
              <div className="grid grid-cols-2 gap-2">
                {LIP_SHADES.map((lip) => (
                  <button
                    key={lip.hex}
                    type="button"
                    onClick={() => setAppearance({ lipColor: lip.hex })}
                    className={`min-h-[44px] rounded-lg border px-2 flex items-center gap-2 text-xs ${
                      app.lipColor === lip.hex ? 'border-purple-400 bg-white/10' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: lip.hex }} />
                    <span>{lip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === 'wardrobe' && (
          <div className="space-y-5">
            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">
                Fashion Category (13 Collections)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {FASHION_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAppearance({ outfitCategory: cat })}
                    className={`min-h-[44px] rounded-lg border px-3 text-xs font-medium text-left flex items-center justify-between ${
                      app.outfitCategory === cat
                        ? 'border-purple-400 bg-purple-600/30 text-white'
                        : 'border-white/10 bg-[#0d0817] text-purple-200/80'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {app.outfitCategory === cat && <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Primary Fabric Color</span>
              <div className="grid grid-cols-2 gap-2">
                {OUTFIT_COLORS.map((oc) => (
                  <button
                    key={oc.hex}
                    type="button"
                    onClick={() => setAppearance({ primaryColor: oc.hex })}
                    className={`min-h-[44px] rounded-lg border px-2.5 flex items-center gap-2 text-xs ${
                      app.primaryColor === oc.hex ? 'border-purple-400 bg-white/10' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full shrink-0 border border-white/25" style={{ backgroundColor: oc.hex }} />
                    <span className="truncate">{oc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Footwear</span>
              <div className="grid grid-cols-3 gap-2">
                {SHOE_STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAppearance({ shoeStyle: s.id })}
                    className={`min-h-[44px] rounded-lg border px-2 text-xs ${
                      app.shoeStyle === s.id ? 'border-purple-400 bg-purple-600/25' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-purple-200/80 mb-2">Accessories</span>
              <div className="grid grid-cols-2 gap-2">
                {ACCESSORIES.map((ac) => (
                  <button
                    key={ac.id}
                    type="button"
                    onClick={() => setAppearance({ accessory: ac.id })}
                    className={`min-h-[44px] rounded-lg border px-3 text-xs text-left ${
                      app.accessory === ac.id ? 'border-purple-400 bg-purple-600/25' : 'border-white/10 bg-[#0d0817]'
                    }`}
                  >
                    {ac.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <label htmlFor="save-outfit-name" className="block text-xs font-medium text-purple-200/80">
                Save This Combination to Your Fashion Collection
              </label>
              <div className="flex gap-2">
                <input
                  id="save-outfit-name"
                  type="text"
                  value={outfitTitle}
                  onChange={(e) => setOutfitTitle(e.target.value)}
                  placeholder="Collection look name..."
                  className="flex-1 min-h-[44px] rounded-lg bg-[#0b0713] border border-white/15 px-3 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveOutfit}
                  className="min-h-[44px] px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
              {savedToast && <p className="text-xs text-emerald-300">{savedToast}</p>}
            </div>
          </div>
        )}

        {section === 'collections' && (
          <div className="space-y-3">
            <p className="text-xs text-purple-200/75">
              Tap any saved outfit to wear it immediately in Mikay’s World.
            </p>
            {playerState.savedOutfits.map((outfit) => (
              <button
                key={outfit.id}
                type="button"
                onClick={() =>
                  setAppearance({
                    outfitCategory: outfit.category,
                    primaryColor: outfit.primaryColor,
                    accentColor: outfit.accentColor,
                    shoeStyle: outfit.shoeStyle,
                    accessory: outfit.accessory,
                  })
                }
                className="w-full min-h-[56px] rounded-xl border border-white/10 bg-[#191129] hover:border-purple-400/50 p-3 flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg border border-white/20 shrink-0"
                    style={{ backgroundColor: outfit.primaryColor }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">{outfit.name}</div>
                    <div className="text-xs text-purple-200/70">
                      {outfit.category} · {outfit.shoeStyle}
                    </div>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-purple-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-[#0d0817]">
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition"
        >
          Done & Return to World
        </button>
      </div>
    </div>
  );
};
