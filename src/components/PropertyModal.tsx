import React, { useState } from 'react';
import { X, Home, MapPin, Palette, Check } from 'lucide-react';
import { DISTRICTS, PROPERTY_LISTINGS } from '../game/catalog';
import { purchaseProperty } from '../game/rules';
import type { OwnedProperty, PlayerSaveState } from '../game/types';
import { soundEngine } from '../three/soundEngine';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerSaveState;
  onUpdateState: (next: PlayerSaveState) => void;
  onTeleport: (pos: [number, number, number]) => void;
}

const WALLPAPER_OPTIONS = [
  { label: 'Obsidian Plum', hex: '#1a1326' },
  { label: 'Warm Alabaster', hex: '#e7dfd8' },
  { label: 'Royal Emerald', hex: '#0d2b24' },
  { label: 'Coastal Sand', hex: '#2f2924' },
];

const FURNITURE_CATALOG = [
  'Velvet Lounge Sofa',
  'Silver Vanity Mirror',
  'Grand Concert Piano',
  'Festive Christmas Tree',
  'Marble Dining Set',
  'Canopy King Bed',
];

export const PropertyModal: React.FC<PropertyModalProps> = ({
  isOpen,
  onClose,
  playerState,
  onUpdateState,
  onTeleport,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [decoratingId, setDecoratingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAction = (propertyId: string, mode: 'buy' | 'rent') => {
    const res = purchaseProperty(playerState, propertyId, mode);
    if (!res.ok) {
      setFeedback(res.error || 'Transaction failed');
      return;
    }
    onUpdateState(res.nextState);
    soundEngine.playCoinChime();
    setFeedback(`Success! You now hold this residence.`);
    setDecoratingId(propertyId);
  };

  const updateOwnedProp = (propertyId: string, patch: Partial<OwnedProperty>) => {
    onUpdateState({
      ...playerState,
      ownedProperties: playerState.ownedProperties.map((p) =>
        p.propertyId === propertyId ? { ...p, ...patch } : p,
      ),
    });
  };

  const toggleFurniture = (propertyId: string, item: string) => {
    const prop = playerState.ownedProperties.find((p) => p.propertyId === propertyId);
    if (!prop) return;
    const exists = prop.furniture.includes(item);
    const nextFurniture = exists ? prop.furniture.filter((f) => f !== item) : [...prop.furniture, item];
    updateOwnedProp(propertyId, { furniture: nextFurniture });
    soundEngine.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Property Marketplace and Interior Designer">
      <div className="w-full max-w-3xl rounded-2xl bg-[#130d20] border border-purple-300/20 text-[#f6f3fa] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Home className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-display text-2xl font-semibold">Properties & Interior Studio</h2>
              <p className="text-xs text-purple-200/70 tabular-nums">
                Balance: {playerState.velorCoins} Velor Coins · Owned/Rented: {playerState.ownedProperties.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Properties"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className="mx-6 mt-4 rounded-xl bg-purple-950/70 border border-purple-400/30 px-4 py-2.5 text-xs text-purple-100">
            {feedback}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {PROPERTY_LISTINGS.map((listing) => {
            const held = playerState.ownedProperties.find((p) => p.propertyId === listing.id);
            const isDecorating = decoratingId === listing.id && held;

            return (
              <div key={listing.id} className="rounded-xl border border-white/10 bg-[#1a122a] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-amber-300/90 font-medium">
                      {DISTRICTS[listing.district].name} · {listing.type} · Up to {listing.maxGuests} guests
                    </div>
                    <h3 className="font-display text-xl font-semibold text-white">{listing.name}</h3>
                    <p className="text-sm text-purple-100/75">{listing.description}</p>
                  </div>

                  {held ? (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onTeleport(listing.worldPos);
                          onClose();
                        }}
                        className="min-h-[44px] px-3.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Visit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecoratingId(isDecorating ? null : listing.id)}
                        className="min-h-[44px] px-3.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>{isDecorating ? 'Hide Designer' : 'Decorate'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAction(listing.id, 'rent')}
                        className="min-h-[44px] px-3.5 rounded-lg border border-purple-300/30 hover:bg-white/10 text-xs font-semibold tabular-nums"
                      >
                        Rent {listing.rentPerDay} VC
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(listing.id, 'buy')}
                        className="min-h-[44px] px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold tabular-nums"
                      >
                        Buy {listing.buyPrice} VC
                      </button>
                    </div>
                  )}
                </div>

                {isDecorating && held && (
                  <div className="pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs font-medium text-purple-200/80 mb-2">Wallpaper Finish</span>
                      <div className="grid grid-cols-2 gap-2">
                        {WALLPAPER_OPTIONS.map((w) => (
                          <button
                            key={w.hex}
                            type="button"
                            onClick={() => updateOwnedProp(listing.id, { wallpaperColor: w.hex })}
                            className={`min-h-[40px] rounded-lg border px-2.5 flex items-center gap-2 text-xs ${
                              held.wallpaperColor === w.hex ? 'border-purple-400 bg-white/10' : 'border-white/10 bg-[#0d0817]'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full border border-white/25" style={{ backgroundColor: w.hex }} />
                            <span>{w.label}</span>
                          </button>
                        ))}
                      </div>
                      <span className="block text-xs font-medium text-purple-200/80 mt-3 mb-2">Lighting Mood</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['warm', 'lilac', 'golden', 'festive'] as const).map((mood) => (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => updateOwnedProp(listing.id, { lightingMood: mood })}
                            className={`min-h-[38px] rounded-lg border text-xs capitalize ${
                              held.lightingMood === mood ? 'border-purple-400 bg-purple-600/30' : 'border-white/10 bg-[#0d0817]'
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-medium text-purple-200/80 mb-2">
                        Furniture & Appliances ({held.furniture.length} placed)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {FURNITURE_CATALOG.map((item) => {
                          const active = held.furniture.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleFurniture(listing.id, item)}
                              className={`min-h-[40px] rounded-lg border px-2.5 text-xs flex items-center justify-between text-left ${
                                active ? 'border-emerald-400/50 bg-emerald-950/40 text-emerald-100' : 'border-white/10 bg-[#0d0817] text-purple-200/75'
                              }`}
                            >
                              <span className="truncate">{item}</span>
                              {active && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs text-purple-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={held.allowVisitors}
                          onChange={(e) => updateOwnedProp(listing.id, { allowVisitors: e.target.checked })}
                          className="rounded"
                        />
                        <span>Allow friends to visit this property</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
