// Debug aid for comparing builds: with ?capture&seed=N, Math.random becomes a seeded
// generator, and window.__reseed(n) restarts it (e.g. right before a fight starts).
import { mulberry32 } from './mulberry32';

const params = new URLSearchParams(location.search);
const seed = params.get('seed');

if (params.has('capture') && seed !== null) {
  const reseed = (n: number) => {
    Math.random = mulberry32(n);
  };
  reseed(Number(seed) || 1);
  (window as Window & { __reseed?: (n: number) => void }).__reseed = reseed;
}
