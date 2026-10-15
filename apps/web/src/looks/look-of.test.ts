import { describe, expect, it } from 'vitest';
import { CHOGS } from '@chog/content/chogs';
import { lookCoverage, lookOf } from './look-of';

describe('lookOf', () => {
  it('gives every Chog in the collection a complete look', () => {
    for (const c of CHOGS) {
      const look = lookOf(c.traits);
      expect(look.eyes.family).toBeTruthy();
      expect(look.mouth.family).toBeTruthy();
      expect(look.fur.finish).toBeTruthy();
    }
  });

  it('is deterministic', () => {
    const traits = CHOGS[123]!.traits;
    expect(lookOf(traits)).toEqual(lookOf(traits));
  });

  it('falls back to a plain Chog for empty or unknown traits', () => {
    const look = lookOf({ Eyes: 'Nope', Mouth: 'Nope', Head: 'Nope', Body: 'Nope' });
    expect(look.eyes.family).toBe('round');
    expect(look.mouth.family).toBe('smile');
    expect(look.head).toBeNull();
    expect(look.unmapped).toEqual(expect.arrayContaining(['Eyes=Nope', 'Mouth=Nope', 'Head=Nope', 'Body=Nope']));
  });

  it('maps eyes, including laser colours', () => {
    expect(lookOf({ Eyes: 'fire laser' }).eyes).toMatchObject({ family: 'laser' });
    expect(lookOf({ Eyes: 'fire laser' }).eyes.tint).not.toBe(lookOf({ Eyes: 'cyan laser' }).eyes.tint);
    expect(lookOf({ Eyes: 'Heart' }).eyes.family).toBe('heart');
    expect(lookOf({ Eyes: 'Dead' }).eyes.family).toBe('x');
    expect(lookOf({ Eyes: 'Sunset visor' }).eyes.family).toBe('visor');
  });

  it('maps mouths', () => {
    expect(lookOf({ Mouth: 'Bubblegum' }).mouth.family).toBe('bubblegum');
    expect(lookOf({ Mouth: 'Rainbow Puke' }).mouth.family).toBe('puke');
    expect(lookOf({ Mouth: 'BTC Coin' }).mouth.family).toBe('coin');
  });

  it('maps skins to fur colour and finish', () => {
    expect(lookOf({ Skin: 'Metal' }).fur.finish).toBe('metal');
    expect(lookOf({ Skin: 'Jade' }).fur.finish).toBe('jade');
    expect(lookOf({ Skin: 'Multi Colored' }).fur.finish).toBe('multi');
    expect(lookOf({ Skin: 'Origin' }).fur.color).toBeNull();
    expect(lookOf({ Skin: 'Red' }).fur.color).not.toBeNull();
  });

  it('maps bodies to shirts, and Naked Chogs wear nothing', () => {
    expect(lookOf({ Body: 'Stripes' }).shirt?.pattern).toBe('stripes');
    expect(lookOf({ Body: 'Tuxedo' }).shirt?.pattern).toBe('tux');
    expect(lookOf({ Body: 'Golden Armor' }).shirt?.finish).toBe('metal');
    expect(lookOf({ Body: 'Tuxedo', Naked: 'Yes' }).shirt).toBeNull();
  });

  it('maps heads to headwear, with cap text', () => {
    expect(lookOf({ Head: 'TISM Cap' }).head).toMatchObject({ kind: 'cap', text: 'TISM' });
    expect(lookOf({ Head: 'MCGA' }).head).toMatchObject({ kind: 'cap', text: 'MCGA' });
    expect(lookOf({ Head: 'Blue Bucket Cap' }).head?.kind).toBe('bucket');
    expect(lookOf({ Head: 'Crown' }).head?.kind).toBe('crown');
    expect(lookOf({ Head: 'Wizard Hat' }).head?.kind).toBe('wizard');
    expect(lookOf({ Head: 'Mon Beanie' }).head?.kind).toBe('beanie');
    expect(lookOf({ Head: 'Red Horn' }).head?.kind).toBe('horns');
    expect(lookOf({ Head: 'Clown Nose' }).head?.kind).toBe('nose');
  });

  it('maps auras, Side and the Skull and Radioactive bases', () => {
    expect(lookOf({ Aura: 'Fiery Aura' }).aura).not.toBeNull();
    expect(lookOf({}).aura).toBeNull();
    expect(lookOf({ Side: 'Left' }).mirror).toBe(true);
    expect(lookOf({ Side: 'Right' }).mirror).toBe(false);
    expect(lookOf({ Base: 'Skull' }).fur.finish).toBe('bone');
    expect(lookOf({ Base: 'Radioactive' }).fur.finish).toBe('radioactive');
  });
});

describe('lookCoverage', () => {
  const cov = lookCoverage(CHOGS.map((c) => c.traits));

  it('fully maps at least 70% of the collection', () => {
    expect(cov.fullyMappedPct).toBeGreaterThanOrEqual(70);
  });

  it('gives every trait value a look or a sensible fallback', () => {
    expect(cov.total).toBe(1969);
    // what is left is only the deliberately deferred work: accessories, the 1:1s and rarities
    for (const v of cov.unmappedValues) expect(v).toMatch(/^(Accessory|Base=1:1|Head=Blue Laser)/);
  });
});
