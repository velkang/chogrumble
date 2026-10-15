// The sack model is a thick-walled bag: its inner floor sits 2.5 units up, so drop it to put that floor at y = 0.
/** Widens the whole arena floor (not its height): sack, floor, hazards, bounds and camera limits. */
export const ARENA_SCALE = 1.3;
export const SACK_SCALE_XZ = 28 * ARENA_SCALE;
export const SACK_SCALE_Y = 18;
/** Height (as a fraction of the model) where the sack is cut open at the neck. */
export const RIM_FRAC = 0.655;
export const SACK_DY = -2.5;
export const RIM_Y = RIM_FRAC * SACK_SCALE_Y + SACK_DY;
