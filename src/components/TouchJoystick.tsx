import React, { useRef, useState } from 'react';

interface TouchJoystickProps {
  touchInputRef: React.MutableRefObject<{ x: number; y: number }>;
}

export const TouchJoystick: React.FC<TouchJoystickProps> = ({ touchInputRef }) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    touchInputRef.current = { x: dx / maxR, y: dy / maxR };
  };

  const reset = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    touchInputRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={baseRef}
      aria-label="Movement Thumbstick"
      onPointerDown={(e) => {
        activePointerId.current = e.pointerId;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activePointerId.current === e.pointerId) {
          updateFromPointer(e.clientX, e.clientY);
        }
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      className="lg:hidden pointer-events-auto relative w-24 h-24 rounded-full bg-[#120b1e]/75 border border-purple-300/25 touch-none flex items-center justify-center"
    >
      <div
        className="w-10 h-10 rounded-full bg-purple-500/80 border border-white/40 shadow"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
};
