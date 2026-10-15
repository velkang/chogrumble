// A Chog's 3D look, derived from its NFT traits. Pure data: no three.js, no canvas.

export type EyeFamily =
  | 'round' | 'happy' | 'side' | 'smirk' | 'laser' | 'x' | 'heart' | 'crying' | 'visor' | 'glasses'
  | 'vr' | 'shades' | 'tired' | 'flat' | 'vertical' | 'angry' | 'worried' | 'crossed' | 'clown'
  | 'frog' | 'mog' | 'up';

export type MouthFamily =
  | 'smile' | 'drool' | 'sad' | 'bubblegum' | 'puke' | 'goldTooth' | 'worried' | 'o' | 'lipBite'
  | 'coin' | 'clown' | 'flat' | 'grit';

export type FurFinish = 'normal' | 'metal' | 'jade' | 'multi' | 'bone' | 'radioactive';
export type ShirtPattern = 'solid' | 'stripes' | 'tux' | 'jacket' | 'robe';

export type HeadKind =
  | 'cap' | 'bucket' | 'beanie' | 'band' | 'crown' | 'wizard' | 'ushanka' | 'helmet' | 'durag'
  | 'hair' | 'nose' | 'horns' | 'wreath' | 'halo' | 'eye3' | 'diamond' | 'banana' | 'shroom'
  | 'fedora' | 'mask';

export interface EyeSpec {
  family: EyeFamily;
  /** Iris, lens or laser colour; null keeps the family's default. */
  tint: number | null;
}

export interface MouthSpec {
  family: MouthFamily;
  tint: number | null;
}

export interface FurSpec {
  /** null keeps the model's original cream-and-pink colours. */
  color: number | null;
  finish: FurFinish;
}

export interface ShirtSpec {
  color: number;
  /** Second colour for stripes, tux fronts and jacket linings. */
  color2: number;
  pattern: ShirtPattern;
  finish: 'cloth' | 'metal';
}

export interface HeadSpec {
  kind: HeadKind;
  color: number;
  color2?: number;
  /** Printed on caps and beanies. */
  text?: string;
}

export interface LookSpec {
  eyes: EyeSpec;
  mouth: MouthSpec;
  fur: FurSpec;
  shirt: ShirtSpec | null;
  head: HeadSpec | null;
  aura: number | null;
  /** Side=Left Chogs face the other way in their art, so their face is mirrored. */
  mirror: boolean;
  /** "Type=Value" traits that fell back to a default look. */
  unmapped: string[];
}
