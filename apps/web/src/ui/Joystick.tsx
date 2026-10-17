import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { duelInput } from '../duel/input';
import { createJoystick } from '../duel/joystick';

export function Joystick({ disabled }: { disabled: boolean }) {
  const model = useRef(createJoystick());
  const pointer = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const reset = () => {
    pointer.current = null; model.current.reset(); duelInput.releaseAnalog(); setThumb({ x: 0, y: 0 });
  };
  useEffect(() => {
    // The keyed control is remounted at round boundaries, and unmounted on pause/rotation.
    return () => { duelInput.releaseAnalog(); };
  }, []);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const radius = box.width / 2 - 24;
    const value = model.current.move((e.clientX - box.left - box.width / 2) / radius, (e.clientY - box.top - box.height / 2) / radius);
    setThumb({ x: value.x * radius, y: value.y * radius });
    duelInput.analog(value.moveX, value.crouch, value.jump);
  };
  return <div className="duel-joystick" role="group" aria-label="Movement joystick: drag left or right to walk, up to jump, down to crouch" aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
    onContextMenu={(e) => e.preventDefault()}
    onPointerDown={(e) => {
      if (disabled || pointer.current !== null) return;
      e.preventDefault(); pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e);
    }}
    onPointerMove={(e) => { if (!disabled && e.pointerId === pointer.current) move(e); }}
    onPointerUp={(e) => { if (e.pointerId === pointer.current) reset(); }}
    onPointerCancel={(e) => { if (e.pointerId === pointer.current) reset(); }}
    onLostPointerCapture={(e) => { if (e.pointerId === pointer.current) reset(); }}
  >
    <svg className="duel-joystick-directions" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m45 16 5-5 5 5M45 84l5 5 5-5M16 45l-5 5 5 5M84 45l5 5-5 5" />
    </svg>
    <span className="duel-joystick-thumb" style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }} />
  </div>;
}
