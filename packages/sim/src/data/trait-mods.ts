// How Chog Genesis traits change a fighter. Values are whole-number deltas on top of BASE_STATS.
// Every bonus comes with a cost, so rare traits are sidegrades, not raw power.
import type { SpecialKey, StatKey } from '../stats';

export type TraitMod = Partial<Record<StatKey, number>> & { special?: SpecialKey };
type Table = Readonly<Record<string, Readonly<Record<string, TraitMod>>>>;

const many = (values: readonly string[], mod: TraitMod) =>
  Object.fromEntries(values.map((v) => [v, mod]));

const LASERS = ['Purple laser', 'fire laser', 'Green laser', 'cyan laser'];
const SHADES = [
  'Gradient visor',
  'Sunset visor',
  'Plasma visor',
  'Modern VR',
  'Classic VR',
  'Anime Glass',
  'Retro Glass',
  '3D Glass',
  'BTC Glass',
  'Chog Viper',
  'Thug',
];
const SLEEPY = ['Dead', 'Tired', 'Closed Eye Crying', 'Round Crying', 'Teary', 'Round Tear', 'XD'];
const MEAN = ['Angry', 'MOG', 'Smirk', 'Side Eye'];
const HORNS = ['Red Horn', 'Demon Horn', 'Purple Horn', 'Void Horn', 'devil horn'];
const BANDS = ['Durag', 'Red Headband', 'Japan Headband', 'Red Bandana', 'Head Wrap'];
const WIZARD = ['Wizard Hat', 'Wizard Beanie'];
const SILLY_SUITS = [
  'Banana suit',
  'Duck Float',
  'Shark Suit',
  'Dragon suit',
  'toad blue suit',
  'Toad pink suit',
  'Toad green Suit',
];
const JAILBIRDS = ['Inmate', 'Prisoner', 'Squid Game Guard', 'Gangster suit', 'Blue Mafia'];

export const TRAIT_MODS: Table = {
  // eyes come first: an eye special beats a mouth special
  Eyes: {
    ...many(LASERS, { special: 'laser', maxHp: -4 }),
    ...many(SHADES, { crit: 20, dodge: -10 }),
    ...many(SLEEPY, { dodge: 20, power: -1 }),
    ...many(MEAN, { power: 1, dodge: -20 }),
    Heart: { speed: 1, maxHp: -4 },
  },
  Mouth: {
    Bubblegum: { special: 'bubble', maxHp: -4 },
    'Rainbow Puke': { special: 'puke', maxHp: -4 },
    'BTC Coin': { special: 'coin', maxHp: -4 },
    'Mon coin': { special: 'coin', maxHp: -4 },
    'Gold Tooth': { defense: 1, speed: -1 },
    Grit: { power: 1, dodge: -20 },
  },
  Head: {
    Crown: { maxHp: 10, speed: -2 },
    'Spartan Helmet': { defense: 2, speed: -2 },
    ...many(WIZARD, { crit: 25, maxHp: -5 }),
    ...many(BANDS, { speed: 1, maxHp: -5 }),
    ...many(HORNS, { power: 1, maxHp: -6 }),
  },
  Body: {
    'Golden Armor': { defense: 2, speed: -2 },
    'Kings Robe': { maxHp: 10, speed: -2 },
    'Astro Suit': { defense: 1, speed: -1 },
    ...many(SILLY_SUITS, { dodge: 25, power: -1 }),
    ...many(JAILBIRDS, { power: 1, maxHp: -6 }),
  },
  Accessory: {
    Knife: { crit: 40, dodge: -15 },
    Cigar: { maxHp: 5, speed: -1 },
    Coin: { crit: 15, maxHp: -3 },
  },
  Base: {
    Skull: { defense: 1, maxHp: -6 },
    Radioactive: { power: 1, maxHp: -6 },
  },
  Tier: {
    Rare: { crit: 15, maxHp: -3 },
    Epic: { dodge: 15, maxHp: -5 },
    Legendary: { power: 1, maxHp: -8 },
  },
};

/** Trait types checked in this order; the first special found wins. */
export const TRAIT_ORDER = ['Eyes', 'Mouth', 'Head', 'Body', 'Accessory', 'Base', 'Tier'] as const;
