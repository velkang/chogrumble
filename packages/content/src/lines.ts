// The battle feed's line bank. Placeholders: {a} attacker, {b} target, {c} third fighter,
// {all} a list of names, {round} drawstring round, {place} finishing place.
// Plain English, cheeky and a little crude. No pidgin.

export const LINES = {
  drop: [
    'The giant Chog scoops up the whole lobby and stuffs it in the sack. IN THE BAG.',
    'In they go. The giant Chog pulls the drawstring and grins.',
    'The giant Chog shakes the sack like a bag of chips. Let the rumble begin.',
    'A dozen tiny screams, one big sack. Fight!',
  ],
  zone: [
    'Round {round}. The drawstring tightens and the sack gets smaller.',
    'Round {round}. The giant Chog yanks the rope. Everyone shuffles inward.',
    'Round {round}. The walls close in. Personal space is cancelled.',
    'Round {round}. The sack shrinks. Somebody is about to get squished.',
  ],
  zoneHit: [
    '{b} gets crushed against the rope.',
    '{b} is squeezed like the last bit of toothpaste.',
    '{b} gets rope burn in places that should not have rope burn.',
    'The burlap folds over {b}. Muffled complaining.',
  ],
  brawl: [
    '{a}, {b} and {c} pile into a three-way brawl.',
    'It is a three-Chog pileup: {a}, {b} and {c}.',
    '{a}, {b} and {c} forget who they were mad at and just swing.',
  ],
  jab: [
    '{a} slaps {b} twice with a damp paw.',
    '{a} throws a lazy one-two. Both land somehow.',
    '{a} pokes {b} in the eye. Very unsporting.',
    '{a} gives {b} two dirty slaps. Rude.',
    '{a} flicks {b} on the forehead. Disrespect, measured in decibels.',
    '{a} jabs {b} right in the snoot.',
  ],
  kick: [
    '{a} kicks {b} right in the nuts. Ouch.',
    '{a} punts {b} where it hurts. The whole sack winces.',
    '{a} delivers a nut shot. {b} is now singing soprano.',
    '{a} launches a kick that {b} will feel next week.',
    '{a} drop-kicks {b} like a bad meme coin.',
  ],
  headbutt: [
    '{a} headbutts {b}. Both of them regret it.',
    '{a} uses the forehead. {b} uses the floor.',
    '{a} butts {b} like an angry goat.',
    '{a} leads with the skull. {b} hears bells.',
  ],
  recoil: [
    '{a} headbutted too hard and is now seeing stars.',
    '{a} forgot their own head is also a head.',
    'That headbutt hurt {a} almost as much. Almost.',
  ],
  dive: [
    '{a} climbs the bucket hat and elbow-drops {b}. Wrestling is real.',
    "{a} jumps off the hat onto {b}'s head. Pure disrespect.",
    '{a} leaps from the hat brim. {b} becomes a landing pad.',
    '{a} does a flying splash off the bucket hat. {b} is flatter now.',
  ],
  laser: [
    '{a} fires both laser eyes. {b} smells like toast.',
    "{a} lasers {b}'s eyebrows clean off.",
    '{a} burns a smiley face into {b}.',
    '{a} locks on and beams {b}. Pew pew.',
    '{a} laser-eyes {b} into next block.',
  ],
  bubble: [
    '{a} blows a bubble and spits it at {b}. It pops all over their face.',
    '{a} gums up {b} with a giant bubble. Sticky.',
    '{a} hits {b} with a bubblegum cannonball.',
    "{a} pops a bubble right on {b}'s nose. Now they're glued to the floor.",
  ],
  puke: [
    '{a} unleashes the rainbow puke on {b}. Beautiful and disgusting.',
    "{a} throws up a rainbow. It lands on {b}. Nobody's okay.",
    '{a} pukes rainbows at {b}. The sack will never smell the same.',
    '{b} takes a full rainbow to the face, courtesy of {a}.',
  ],
  coin: [
    '{a} spits a coin at {b}. It bonks them right between the eyes.',
    '{a} pays {b} back in full, at high velocity.',
    '{a} flings a coin at {b}. Number go up, {b} go down.',
    '{a} airdrops a coin onto {b}. It hurts.',
  ],
  counter: [
    '{a} slaps back immediately. Petty.',
    '{a} answers with a quick jab to the snout.',
    '{a} counters before {b} can even gloat.',
    '{a} hits back. Revenge served lukewarm.',
  ],
  dodge: [
    '{b} ducks. {a} punches air and looks embarrassed.',
    '{b} sidesteps. {a} nearly falls over.',
    '{a} swings and misses. The giant Chog laughs.',
    '{b} slips out of the way like a greased Chog.',
    '{a} whiffs so hard they spin around twice.',
  ],
  crit: ['Critical hit!', 'Massive damage!', 'That one left a mark!'],
  clinging: [
    '{b} is hanging on by a single hair.',
    '{b} refuses to go down. Barely.',
    '{b} is one sneeze away from elimination.',
  ],
  gumSlip: [
    '{b} slips in the gum puddle and gets stuck.',
    '{b} steps in the gum. Both feet. Stuck.',
    '{b} trips into the gum and becomes a decoration.',
  ],
  hatFall: [
    '{b} falls off the bucket hat. Graceful, for a sack of potatoes.',
    '{b} tries to pose on the hat brim and eats the floor.',
    '{b} tumbles off the bucket hat. The crowd boos.',
  ],
  ropeBurn: [
    '{b} leans on the drawstring and gets rope burn.',
    '{b} gets tangled in the rope. Classic.',
    '{b} tries to climb out. The rope says no.',
  ],
  trip: [
    '{b} trips over absolutely nothing.',
    '{b} stubs a toe on a burlap fold. Pain.',
    '{b} tries to look cool and falls flat on their face.',
  ],
  meddleHeart: [
    "The giant Chog's heart eyes overload a love pad. {b} gets launched.",
    'Heart beams hit the floor and {b} goes flying.',
    'The giant Chog falls in love with violence. {b} is blasted off a heart pad.',
  ],
  meddleGum: [
    'The giant Chog spits its gum into the sack. {all} get splattered.',
    'A giant gum bubble drops in and bursts on {all}.',
    'The giant Chog blows, the bubble pops, and {all} are glued in place.',
  ],
  meddleFlick: [
    'The giant Chog reaches in and flicks {b} across the sack.',
    'A huge paw comes down and boops {b} into the wall.',
    'The giant Chog gets bored and flicks {b} like a booger.',
  ],
  meddlePluck: [
    "Time's up. The giant Chog plucks {all} out of the sack.",
    'The giant Chog has seen enough. {all}: plucked.',
    'Out of patience, the giant Chog grabs {all} and tosses them.',
  ],
  koFight: [
    '{a} knocks {b} out cold. {b} finishes {place}.',
    '{b} is done. Flat as a pancake. {a} gets the kill. {b} finishes {place}.',
    '{a} sends {b} home in {place} place.',
    '{b} has left the chat, courtesy of {a}. {place} place.',
  ],
  koSelf: [
    '{b} knocked themselves out. {place} place, and a lesson learned.',
    '{b} beat {b}. Nobody else involved. {place} place.',
    '{b} headbutts their way out of the rumble. {place} place.',
  ],
  koGiant: [
    'The giant Chog plucks {b} out of the sack. {place} place.',
    'A giant paw pinches {b} by the scruff and yanks them out. {place} place.',
    '{b} is plucked. The giant Chog does not do refunds. {place} place.',
  ],
  koZone: [
    'The drawstring squeezes {b} right out of the sack. {place} place.',
    '{b} gets popped out by the shrinking sack. {place} place.',
    'Squished out. {b} finishes {place}.',
  ],
  koMishap: [
    '{b} took the L all by themselves. {place} place.',
    "{b}'s own clumsiness finishes the job. {place} place.",
    '{b} trips, falls, and the paw plucks them out. {place} place.',
  ],
  revive: [
    'Plot twist: the giant Chog drops {b} back into the sack.',
    "The giant Chog wasn't done playing with {b}. They're back.",
    '{b} returns from the plucked pile, angrier than ever.',
  ],
  winner: [
    '{a} is the last Chog standing. Winner winner, Chog dinner.',
    '{a} climbs the bucket hat and wins the rumble.',
    '{a} wins. The giant Chog nods approvingly and blows a bubble.',
    'Nobody saw it coming except {a}. Champion of the sack.',
  ],
} as const satisfies Record<string, readonly string[]>;

export type LineKey = keyof typeof LINES;
