import React from 'react';
import { X, Smartphone, Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Install Mikay's Simulation">
      <div className="w-full max-w-lg rounded-2xl bg-[#130d20] border border-purple-300/20 text-[#f6f3fa] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <img src="/pwa-192x192.png" alt="Mikay's Simulation Launcher Icon" className="w-12 h-12 rounded-xl border border-purple-300/30 object-cover" />
            <div>
              <h2 className="font-display text-2xl font-semibold">Install Mobile & Desktop App</h2>
              <p className="text-xs text-purple-200/70">Standalone App Icon · Launch Screen · Offline Cache</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Install Modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl bg-[#1a122a] border border-purple-400/25 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Smartphone className="w-4 h-4 text-purple-300" />
            <span>Direct Browser App Installation (PWA)</span>
          </div>
          {isInstalled ? (
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mikay’s Simulation is already running in standalone installed mode!</span>
            </div>
          ) : isInstallable ? (
            <button
              type="button"
              onClick={install}
              className="w-full min-h-[46px] rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Install Mikay’s Simulation Now</span>
            </button>
          ) : isIOS ? (
            <p className="text-xs text-purple-100/85 leading-relaxed">
              On iPhone / iPad Safari: tap the <strong>Share</strong> icon in Safari, then choose <strong>Add to Home Screen</strong> to install Mikay’s Simulation with its Mirror Icon and fullscreen launch screen.
            </p>
          ) : (
            <p className="text-xs text-purple-100/85 leading-relaxed">
              In Chrome, Edge, or Android Chrome: open the browser menu (⋮) and select <strong>Install Mikay’s Simulation</strong> or <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-[#0e0918] border border-white/10 p-4 space-y-2 text-xs text-purple-100/80">
          <div className="font-semibold text-white">Android Play Store / Signed APK Packaging Path</div>
          <p>
            This application includes a full Web App Manifest, Service Worker, and 192×192 / 512×512 / Maskable PNG launcher icons. To compile a standalone signed Android <code>.apk</code> or <code>.aab</code> package for sideloading or Google Play:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-purple-200/85">
            <li>Install Android Studio &amp; JDK 17 locally, then run <code>npx cap init</code> + <code>npx cap add android</code> (Capacitor) or Bubblewrap TWA pointing at your deployed HTTPS URL.</li>
            <li>Build the web bundle with <code>npm run build</code> and copy assets via <code>npx cap sync android</code>.</li>
            <li>Generate the signed release APK/AAB inside Android Studio (<em>Build &rarr; Generate Signed Bundle / APK</em>).</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
