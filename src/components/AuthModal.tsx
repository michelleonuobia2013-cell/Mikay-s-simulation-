import React, { useState } from 'react';
import { X, ShieldCheck, Cloud, KeyRound, UserPlus, LogIn } from 'lucide-react';
import type { PlayerSaveState } from '../game/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSave: PlayerSaveState;
  authToken: string | null;
  onAuthSuccess: (token: string, saveState: PlayerSaveState) => void;
  onContinueGuest: () => void;
  onSyncNow: () => Promise<void>;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentSave,
  authToken,
  onAuthSuccess,
  onContinueGuest,
  onSyncNow,
  onSignOut,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'recover'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [characterName, setCharacterName] = useState(currentSave.characterName);
  const [recoveryHint, setRecoveryHint] = useState('Favorite city');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [fetchedHint, setFetchedHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (tab === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            characterName,
            recoveryHint,
            recoveryAnswer,
            initialSaveState: currentSave,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        onAuthSuccess(data.token, data.saveState);
        onClose();
      } else if (tab === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        onAuthSuccess(data.token, data.saveState);
        onClose();
      } else {
        const res = await fetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, recoveryAnswer, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Recovery failed');
        if (data.hint && !recoveryAnswer) {
          setFetchedHint(data.hint);
          setInfo('Hint retrieved. Enter your recovery answer and new password.');
        } else {
          setInfo(data.message || 'Password updated. Please log in.');
          setTab('login');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Account and Cloud Save">
      <div className="w-full max-w-md rounded-2xl bg-[#140e21] border border-purple-300/20 p-6 shadow-2xl text-[#f6f3fa] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Mikay's Simulation Official Icon" className="w-10 h-10 rounded-lg object-cover border border-purple-300/30" />
            <div>
              <h2 className="font-display text-2xl font-semibold leading-tight">Mikay Identity & Cloud</h2>
              <p className="text-xs text-purple-200/70">Sync progress across devices</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Account Modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 text-purple-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {authToken && !currentSave.isGuest ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-[#1d1530] border border-purple-400/25 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                <Cloud className="w-4 h-4" />
                <span>Cloud Account Connected</span>
              </div>
              <p className="text-sm text-purple-100">
                Signed in as <strong>@{currentSave.username}</strong> · {currentSave.characterName}
              </p>
              <p className="text-xs text-purple-200/70 tabular-nums">
                {currentSave.velorCoins} Velor Coins · {currentSave.reputation} Rep · {currentSave.vipTier}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  await onSyncNow();
                  setLoading(false);
                  setInfo('Progress synchronized to server.');
                }}
                disabled={loading}
                className="flex-1 min-h-[44px] rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition"
              >
                {loading ? 'Syncing...' : 'Sync Cloud Save Now'}
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="min-h-[44px] rounded-lg border border-white/15 hover:bg-white/10 px-4 py-2 text-sm font-medium text-purple-100"
              >
                Sign Out
              </button>
            </div>
            {info && <p className="text-xs text-emerald-300">{info}</p>}
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-xl bg-[#1c142e] border border-amber-400/25 p-3 text-xs text-amber-100/90 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Guest Mode Notice</span>
              </div>
              <p>
                Guest progress is saved only in this browser. Register a free account below to protect your character, properties, vehicles, and Velor Coins in the cloud.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0d0817] border border-white/10">
              <button
                type="button"
                onClick={() => { setTab('register'); setError(null); }}
                className={`min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  tab === 'register' ? 'bg-purple-600 text-white' : 'text-purple-200/75 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
              <button
                type="button"
                onClick={() => { setTab('login'); setError(null); }}
                className={`min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  tab === 'login' ? 'bg-purple-600 text-white' : 'text-purple-200/75 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={() => { setTab('recover'); setError(null); }}
                className={`min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  tab === 'recover' ? 'bg-purple-600 text-white' : 'text-purple-200/75 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Recover</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="auth-username" className="block text-xs font-medium text-purple-200/80 mb-1">
                  Username
                </label>
                <input
                  id="auth-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. mikay_star"
                  className="w-full min-h-[44px] rounded-lg bg-[#0d0817] border border-white/15 px-3 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              {tab === 'register' && (
                <div>
                  <label htmlFor="auth-charname" className="block text-xs font-medium text-purple-200/80 mb-1">
                    Character Display Name
                  </label>
                  <input
                    id="auth-charname"
                    type="text"
                    required
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="e.g. Mikaylla Vance"
                    className="w-full min-h-[44px] rounded-lg bg-[#0d0817] border border-white/15 px-3 text-sm text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              {tab !== 'recover' && (
                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-purple-200/80 mb-1">
                    Password (6+ characters)
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] rounded-lg bg-[#0d0817] border border-white/15 px-3 text-sm text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}

              {tab === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-hint" className="block text-xs font-medium text-purple-200/80 mb-1">
                      Recovery Question
                    </label>
                    <input
                      id="auth-hint"
                      type="text"
                      value={recoveryHint}
                      onChange={(e) => setRecoveryHint(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg bg-[#0d0817] border border-white/15 px-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-ans" className="block text-xs font-medium text-purple-200/80 mb-1">
                      Recovery Answer
                    </label>
                    <input
                      id="auth-ans"
                      type="text"
                      required
                      value={recoveryAnswer}
                      onChange={(e) => setRecoveryAnswer(e.target.value)}
                      placeholder="Your secret answer"
                      className="w-full min-h-[44px] rounded-lg bg-[#0d0817] border border-white/15 px-3 text-sm text-white"
                    />
                  </div>
                </div>
              )}

              {tab === 'recover' && (
                <>
                  {fetchedHint && (
                    <p className="text-xs text-purple-200">
                      Question: <strong>{fetchedHint}</strong>
                    </p>
                  )}
                  <div>
                    <label htmlFor="rec-ans" className="block text-xs font-medium text-purple-200/80 mb-1">
                      Recovery Answer (leave blank first to view hint)
                    </label>
                    <input
                      id="rec-ans"
                      type="text"
                      value={recoveryAnswer}
                      onChange={(e) => setRecoveryAnswer(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg bg-[#0d0817] border border-white/15 px-3 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="rec-newpass" className="block text-xs font-medium text-purple-200/80 mb-1">
                      New Password
                    </label>
                    <input
                      id="rec-newpass"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg bg-[#0d0817] border border-white/15 px-3 text-sm text-white"
                    />
                  </div>
                </>
              )}

              {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
              {info && <p className="text-xs text-emerald-300 font-medium">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition"
              >
                {loading
                  ? 'Please wait...'
                  : tab === 'register'
                    ? 'Create Account & Save Progress'
                    : tab === 'login'
                      ? 'Log In & Load World'
                      : fetchedHint
                        ? 'Reset Password'
                        : 'Lookup Recovery Hint'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                onContinueGuest();
                onClose();
              }}
              className="mt-3 w-full min-h-[44px] rounded-xl border border-white/10 hover:bg-white/5 text-xs font-medium text-purple-200/80"
            >
              Continue in Guest Mode (Local Save Only)
            </button>
          </>
        )}
      </div>
    </div>
  );
};
