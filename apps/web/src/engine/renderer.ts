import {
  ACESFilmicToneMapping,
  Color,
  FogExp2,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

export interface View {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Fits the canvas and camera to the stage element. */
  resize(): void;
}

/** `capture` keeps the drawing buffer so frames can be read back for recording. */
export function createView(stage: HTMLElement, capture: boolean, maxPixelRatio: number): View {
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: capture });
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxPixelRatio));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  stage.prepend(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(0xffd9b0);
  scene.fog = new FogExp2(0x2a1238, 0.018);
  const camera = new PerspectiveCamera(68, 16 / 9, 0.1, 400);

  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);
  return { renderer, scene, camera, resize };
}
