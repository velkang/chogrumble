# Chog Sack Rumble

A browser-based 1v1 Chog fighter. Pick a borrowed Genesis Chog or connect a wallet to use your own, then fight a seeded AI opponent inside the giant's sack.

## Run

Requires Node.js 22+ and pnpm (the version is pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

Open http://localhost:5180. Wallet login is optional; to enable it, copy `apps/web/.env.example` to `apps/web/.env.local` and set `VITE_REOWN_PROJECT_ID`.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm deploy
```

`deploy` publishes the web build using Cloudflare Wrangler.

## Fight

- WASD or arrows: move, jump, crouch.
- J: light; K: heavy; L: trait special; hold Space: block.
- Escape: pause. Resume explicitly after switching tabs or rotating your phone.
- Landscape touch controls support movement and actions simultaneously.

First to two round wins takes the match. Each round lasts 60 seconds; timeout favors the healthier fighter. Drawn rounds replay. All Chogs have 100 HP and equal basic attacks. Their traits choose their appearance and special.

Standing block stops normal and jumping attacks. Crouching block stops normal attacks and sweeps. Jumping attacks beat crouch block; sweeps beat standing block. Blocking works only on the ground and from the front. Whiffs leave you vulnerable during recovery.

Confirm a light hit, press light again, then heavy for a three-hit combo. Attack input buffers last seven frames (about 117 ms); failed or blocked hits cannot cancel recovery. Specials cost 50 meter; basic hits grant 10 to the attacker and 5 to the defender. Meter resets every round.
