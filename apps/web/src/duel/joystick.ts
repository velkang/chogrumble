/** Pure joystick mapping. Y is screen-space: negative is up. */
export function createJoystick() {
  let jumpArmed = true;
  let crouching = false;
  return {
    reset() { jumpArmed = true; crouching = false; },
    move(rawX: number, rawY: number) {
      const length = Math.hypot(rawX, rawY);
      const x = rawX / Math.max(1, length);
      const y = rawY / Math.max(1, length);
      const magnitude = Math.min(1, length);
      const scaled = Math.min(1, Math.max(0, (magnitude - 0.18) / 0.82));
      const moveX = length > 0 ? x / (magnitude || 1) * scaled : 0;
      const jump = jumpArmed && y <= -0.55;
      if (jump) jumpArmed = false;
      if (y > -0.35) jumpArmed = true;
      crouching = crouching ? y > 0.35 : y >= 0.55;
      return { x, y, moveX, jump, crouch: crouching };
    },
  };
}
