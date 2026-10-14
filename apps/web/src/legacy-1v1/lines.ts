// Battle feed lines. {a} is the attacker, {b} the target.
export const LINES = {
  jab: [
    '{a} slaps {b} twice with a damp paw.',
    '{a} throws a lazy one-two. Both land somehow.',
    '{a} pokes {b} in the eye. Very unsporting.',
    '{a} gives {b} two dirty slaps. Rude.',
  ],
  uppercut: [
    '{a} finishes the combo with an uppercut. {b} sees stars.',
    '{a} uppercuts {b} straight into next week.',
  ],
  kick: [
    '{a} kicks {b} right in the nuts. Ouch.',
    '{a} punts {b} where it hurts. The whole sack winces.',
    '{a} delivers a nut shot. {b} is now singing soprano.',
  ],
  headbutt: [
    '{a} headbutts {b}. Both of them regret it.',
    '{a} uses the forehead. {b} uses the floor.',
    '{a} butts {b} like an angry goat.',
  ],
  laser: [
    '{a} fires both laser eyes. {b} smells like toast.',
    "{a} lasers {b}'s eyebrows clean off.",
    '{a} burns a smiley face into {b}.',
  ],
  bubble: [
    '{a} blows a bubble and spits it at {b}. It pops all over their face.',
    '{a} gums up {b} with a giant bubble. Sticky.',
    '{a} hits {b} with a bubblegum cannonball.',
  ],
  dive: [
    '{a} climbs the bucket hat and elbow-drops {b}. Wrestling is real.',
    "{a} jumps off the hat onto {b}'s head. Pure disrespect.",
  ],
  dodge: [
    '{b} ducks. {a} punches air and looks embarrassed.',
    '{b} sidesteps. {a} nearly falls over.',
    '{a} swings and misses. The giant Chog laughs.',
  ],
  counter: ['{b} slaps back immediately. Petty.', '{b} answers with a quick jab to the snout.'],
  stuck: [
    '{a} is stuck in the gum puddle and can only wave angrily.',
    '{a} is glued to the floor. Embarrassing.',
  ],
  unstick: ['{a} peels free of the gum. Squelch.'],
  heart: [
    "The Chog's heart eyes overload a love pad. {b} gets launched into its face.",
    'Heart beams hit the floor and {b} goes flying.',
  ],
  gum: [
    'The Chog spits its gum into the sack. Everybody gets splattered.',
    'A giant gum bubble drops in and bursts. Chaos.',
  ],
  flick: [
    'The Chog reaches in and flicks {b} across the sack.',
    'A huge paw comes down and boops {b} into the wall.',
  ],
  ko: ['{b} is done. Flat as a pancake.', '{b} has left the chat.', '{b} took the L. Lights out.'],
} as const satisfies Record<string, readonly string[]>;
