// Debug aid (capture mode only): stands chosen Chogs in a row facing the camera to inspect looks.
import type { Scene } from 'three';
import type { Models } from '../engine/assets';
import type { CameraRig } from '../camera/camera-rig';
import { updateChog } from '../chog/animate';
import type { Chog } from '../chog/chog';
import { dressFighter } from '../director/looks';
import type { Dressed } from '../director/looks';

const SCALE = 1.3;
const GAP = 1.15;

export function createLineup(scene: Scene, models: Models, cam: CameraRig) {
  let shown: Dressed[] = [];
  const clear = () => {
    shown.forEach((d) => {
      scene.remove(d.chog.g);
      d.dispose();
    });
    shown = [];
  };
  return {
    async show(tokenIds: readonly number[]): Promise<Chog[]> {
      const { chogByToken, toFighter } = await import('@chog/content/chogs');
      clear();
      shown = tokenIds.flatMap((id) => {
        const c = chogByToken(id);
        return c ? [dressFighter(toFighter(c), models, SCALE)] : [];
      });
      const width = (shown.length - 1) * GAP;
      shown.forEach((d, i) => {
        d.chog.g.position.set(1 - width / 2 + i * GAP, 0, 2.5);
        d.chog.setPose('guard', 8);
        updateChog(d.chog, 1);
        scene.add(d.chog.g);
      });
      void cam.shot([1, 1.6, 2.5 + 1.2 + width * 0.45], [1, 1.05, 2.5]);
      return shown.map((d) => d.chog);
    },
    clear,
  };
}
