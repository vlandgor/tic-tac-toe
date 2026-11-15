# Tic Tac Toe — Shadow

Your shadow is a small neural net that learns how *you* play. It represents you in
ranked matchmaking while you're away, its results move your rating, and its losses come
back to you as coaching positions.

## Run

```bash
npm install
npm run dev      # local dev server
npm test         # core engine tests
npm run build    # production build -> dist/
```

## Architecture

```
src/
  core/                 pure TypeScript, no DOM — portable to a server later
    rules/              RuleSet seam: types, board helpers, Classic / Vanish / Reverse
    tactics.ts          generic win/block/forced detection by simulation (any ruleset)
    nn/mlp.ts           tiny MLP, masked softmax over legal moves
    nn/train.ts         training epoch shared by the worker and the inline fallback
    heuristic.ts        style configs, archetypes, self-play corpus generation
    shadow/shadow.ts    the player's model: shared core + one head per mode
    shadow/coach.ts     picks positions where the shadow is least sure about you
    agents.ts           Agent interface; ShadowAgent, RivalAgent, rival model cache
    rating.ts           Elo, rival pool, matchmaking
    away.ts             your shadow plays for you; results move your rating
    match.ts            pure match state machine
    profile.ts          ratings, rivals, away log, loss positions
    insight.ts          human-readable trait lines, unlock progress
  train/                Web Worker training (+ main-thread fallback)
  storage/              IndexedDB KV (localStorage fallback), save/load, legacy migration
  state/                signals: app state, promise-based overlays, flows
  ui/                   Preact: Stage (fixed 420x910 frame), screens, overlays, components
public/                 PWA manifest, service worker, icons
tests/                  vitest on the core engine
```

### Key rules
- **Fidelity is prequential and choice-only**: the shadow predicts before each of your
  moves; forced moves (wins, blocks, only-safe-move) don't count.
- **One rating per mode**, shared by you and your shadow.
- **Gate**: a shadow enters matchmaking in a mode after 60 moves and 10 choice moves.
- **Adding a mode** = implement `RuleSet` (and register it in `core/rules/modes.ts`).
  The shadow, tactics, coaching and training need no changes.
