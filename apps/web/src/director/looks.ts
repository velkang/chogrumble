// Dresses a fighter from its NFT traits: faces, fur, shirt and headwear.
import type { FighterSpec } from '@chog/sim';
import type { Models } from '../engine/assets';
import { makeChog } from '../chog/chog';
import type { Chog } from '../chog/chog';
import { createFaceSet, disposeFaceSet } from '../chog/face-set';
import { buildHeadwear, disposeHeadwear } from '../chog/headwear';
import type { Faces } from '../chog/faces';
import { lookOf } from '../looks/look-of';

export interface Dressed {
  chog: Chog;
  /** Frees everything made for this fighter (shared models stay). */
  dispose(): void;
}

export function dressFighter(spec: FighterSpec, models: Models, scale: number): Dressed {
  const look = lookOf(spec.traits);
  const faces: Faces = createFaceSet(look);
  const chog = makeChog(models.chogLod, faces, {
    name: spec.name,
    scale,
    fighter: true,
    face: 'normal',
    furFinish: look.fur.finish,
    ...(look.fur.color !== null ? { fur: look.fur.color } : {}),
    ...(look.shirt ? { shirt: look.shirt.color, shirt2: look.shirt.color2, shirtPattern: look.shirt.pattern } : {}),
  });
  const hat = buildHeadwear(look.head, models, true);
  if (hat) {
    chog.B.head.add(hat);
    chog.hat = hat;
  }
  return {
    chog,
    dispose() {
      disposeFaceSet(faces);
      if (hat) disposeHeadwear(hat);
    },
  };
}
