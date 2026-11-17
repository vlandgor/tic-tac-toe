import { describe, expect, it } from 'vitest';
import { ALL_MODES, Classic, EVENT_BOARDS, MODES, Reverse, Vanish, modeById } from '../src/core/rules/modes';
import { geometry, stateKey, winLength } from '../src/core/rules/board';
import { challengeBoard } from '../src/core/events';
import { tactics } from '../src/core/tactics';
import { eloDelta, makeRivals, matchmake } from '../src/core/rating';
import { Shadow, SHADOW_LIMITS } from '../src/core/shadow/shadow';
import { AWAKE_STAGE, STAGES, spiritStage } from '../src/core/insight';
import { detectDiscoveries, foundFor } from '../src/core/discoveries';
import { pickReads, readVerdict, recordRead, READ_HISTORY, READ_ROUND } from '../src/core/reads';
import { newMatch, play, matchOver } from '../src/core/match';
import { simulateAway, awayMatchesFor } from '../src/core/away';
import { defaultProfile } from '../src/core/profile';
import { RivalModels } from '../src/core/agents';
import type { Player, RuleSet, State } from '../src/core/rules/types';

function playSeq(rules: RuleSet, moves: [number, Player][]): State {
  let s = rules.start();
  for (const [i, p] of moves) s = rules.apply(s, i, p);
  return s;
}

describe('rulesets', () => {
  it('classic: three in a row wins', () => {
    const s = playSeq(Classic, [[0, 'X'], [3, 'O'], [1, 'X'], [4, 'O'], [2, 'X']]);
    expect(Classic.terminal(s)).toMatchObject({ over: true, winner: 'X', line: [0, 1, 2] });
  });
  it('classic: full board without a line is a draw', () => {
    const s = playSeq(Classic, [[0,'X'],[1,'O'],[2,'X'],[4,'O'],[3,'X'],[5,'O'],[7,'X'],[6,'O'],[8,'X']]);
    expect(Classic.terminal(s)).toMatchObject({ over: true, winner: null });
  });
  it('reverse: making three loses', () => {
    const s = playSeq(Reverse, [[0, 'X'], [3, 'O'], [1, 'X'], [4, 'O'], [2, 'X']]);
    expect(Reverse.terminal(s)).toMatchObject({ over: true, winner: 'O', maker: 'X' });
  });
  it('vanish: the 4th mark removes the oldest', () => {
    const s = playSeq(Vanish, [[0, 'X'], [8, 'O'], [1, 'X'], [7, 'O'], [5, 'X'], [6, 'O'], [3, 'X']]);
    expect(s.cells[0]).toBeNull();
    expect(s.q.X).toEqual([1, 5, 3]);
    expect(Vanish.doomed(s, 'X')).toBe(1);
  });
  it('vanish: the vanished mark cannot complete a line', () => {
    // X: 0,1,_ then places 2 as its 4th mark -> 0 vanishes first, no win
    const s = playSeq(Vanish, [[0,'X'],[3,'O'],[1,'X'],[4,'O'],[8,'X'],[6,'O'],[2,'X']]);
    expect(Vanish.terminal(s).over).toBe(false);
  });
  it('every ruleset encodes to its declared length', () => {
    for (const r of MODES) expect(r.encode(r.start(), 'X', 1).length).toBe(r.encodeLen);
  });
});

describe('tactics', () => {
  it('finds wins and blocks; marks them forced', () => {
    const s = playSeq(Classic, [[0, 'X'], [4, 'O'], [1, 'X']]);
    const t = tactics(Classic, s, 'O');
    expect(t.blocks).toEqual([2]);
    expect(t.forced).toBe(true);
  });
  it('opening move is a free choice', () => {
    expect(tactics(Classic, Classic.start(), 'X').forced).toBe(false);
  });
  it('reverse: moves that complete your own line are losing', () => {
    const s = playSeq(Reverse, [[0, 'X'], [4, 'O'], [1, 'X'], [8, 'O']]);
    expect(tactics(Reverse, s, 'X').losing).toContain(2);
  });
});

describe('rating', () => {
  it('elo is symmetric and favours the underdog', () => {
    expect(eloDelta(1000, 1000, 1)).toBe(12);
    expect(eloDelta(1000, 1200, 1)).toBeGreaterThan(eloDelta(1200, 1000, 1));
  });
  it('matchmaking never repeats the last opponent', () => {
    const rivals = makeRivals();
    for (let i = 0; i < 50; i++) expect(matchmake(rivals, 'classic', 1100, 'KAZU').name).not.toBe('KAZU');
  });
});

describe('shadow', () => {
  it('records only choice moves into fidelity', () => {
    const sh = new Shadow();
    const s = playSeq(Classic, [[0, 'O'], [4, 'X'], [1, 'O']]); // X must block at 2
    sh.record(Classic, s, 'X', 1, 2);
    expect(sh.peek('classic')!.recent.length).toBe(0);
    expect(sh.peek('classic')!.moves).toBe(1);
    sh.record(Classic, Classic.start(), 'X', 1, 4);
    expect(sh.peek('classic')!.recent.length).toBe(1);
  });
  it('heads are separate per mode', () => {
    const sh = new Shadow();
    sh.record(Vanish, Vanish.start(), 'X', 1, 4);
    expect(sh.peek('vanish')!.net.nin).toBe(47);
    expect(sh.peek('classic')).toBeUndefined();
  });
});

describe('match + away', () => {
  it('a match ends at three round wins', () => {
    let m = newMatch(Classic);
    expect(m.locked).toBe(false);
    m = { ...m, score: { X: 2, O: 0 } };
    m = { ...m, turn: 'X' };
    for (const i of [0, 3, 1, 4, 2]) m = play(m, i);
    expect(matchOver(m)).toBe(true);
  });
  it('away matches move the shared rating and queue loss positions', () => {
    const sh = new Shadow(), prof = defaultProfile(), models = new RivalModels();
    const before = prof.rating.classic;
    const res = simulateAway(4, sh, prof, models, (r) => r.id === 'classic');
    expect(res.length).toBe(4);
    expect(prof.rating.classic).toBe(before + res.reduce((a, r) => a + r.delta, 0));
    expect(prof.lossQ.classic.length).toBeLessThanOrEqual(8);
  });
  it('no active shadow, no away matches', () => {
    const r = simulateAway(3, new Shadow(), defaultProfile(), new RivalModels(), () => false);
    expect(r).toEqual([]);
  });
  it('away cadence', () => {
    expect(awayMatchesFor(10)).toBe(0);
    expect(awayMatchesFor(90)).toBe(3);
    expect(awayMatchesFor(10000)).toBe(6);
  });
});

import { mulberry32, seeded } from '../src/core/rng';
import { dailyPuzzle, completeDaily, dayKey, weekKey, yesterday, runGauntlet, featuredMode } from '../src/core/events';
import { standings } from '../src/core/rating';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
    expect(seeded('x')()).toBe(seeded('x')());
    expect(seeded('x')()).not.toBe(seeded('y')());
  });
});

describe('events', () => {
  it('daily puzzle is the same for a day and is a real choice for X', () => {
    for (const day of ['2026-11-15', '2026-11-16', '2026-12-01', '2027-01-07']) {
      const a = dailyPuzzle(day), b = dailyPuzzle(day);
      expect(a.rules.id).toBe(b.rules.id);
      expect(a.s.cells).toEqual(b.s.cells);
      expect(a.rules.terminal(a.s).over).toBe(false);
      expect(tactics(a.rules, a.s, 'X').forced).toBe(false);
      // X to move: counts consistent with alternating play
      const x = a.s.cells.filter((c) => c === 'X').length, o = a.s.cells.filter((c) => c === 'O').length;
      if (a.rules.id !== 'vanish') expect(x === o || x === o - 1).toBe(true);
    }
  });
  it('streak grows on consecutive days and resets after a gap', () => {
    const p = defaultProfile();
    completeDaily(p, '2026-11-14'); completeDaily(p, '2026-11-15');
    expect(p.daily.streak).toBe(2);
    completeDaily(p, '2026-11-15');
    expect(p.daily.streak).toBe(2);
    completeDaily(p, '2026-11-18');
    expect(p.daily.streak).toBe(1);
    expect(p.daily.best).toBe(2);
  });
  it('calendar helpers', () => {
    expect(yesterday('2026-03-01')).toBe('2026-02-28');
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(weekKey(new Date(2026, 0, 1))).toBe('2026-W01');
  });
  it('gauntlet produces a consistent bracket', () => {
    const sh = new Shadow(), p = defaultProfile();
    const r = runGauntlet(sh, p, new RivalModels(), '2026-W46');
    expect(r.mode).toBe(featuredMode('2026-W46').id);
    expect(r.matches[0].stage).toBe('SEMIFINAL');
    if (r.placement === 3) expect(r.matches.length).toBe(1);
    else expect(r.matches[1].stage).toBe('FINAL');
    expect(p.trophies).toBe(r.placement === 1 ? 1 : 0);
  });
  it('standings are sorted and include the player', () => {
    const s = standings(makeRivals(), 'classic', { name: 'VLAD', rating: 5000 });
    expect(s[0]).toMatchObject({ name: 'VLAD', you: true });
    expect(s.length).toBe(13);
  });
});

import { cleanName, validName, normalizeProfile } from '../src/core/profile';
import { HeuristicAgent } from '../src/core/agents';

describe('onboarding', () => {
  it('cleans and validates names', () => {
    expect(cleanName('vlad 99!')).toBe('VLAD99');
    expect(cleanName('abcdefghijklmnop')).toBe('ABCDEFGHIJ');
    expect(validName('A')).toBe(false);
    expect(validName('AB')).toBe(true);
  });
  it('new players need onboarding; old saves do not', () => {
    expect(normalizeProfile({}).onboarded).toBe(false);
    expect(normalizeProfile({ name: 'VLAD' }).onboarded).toBe(true);
    expect(normalizeProfile({ name: 'X', onboarded: false }).onboarded).toBe(false);
  });
  it('the guide only plays legal moves', () => {
    const g = new HeuristicAgent('GUIDE', { finish: .9, block: .7, center: .5, corner: .5, noise: .25 });
    let s = Classic.start();
    let p: Player = 'O';
    while (!Classic.terminal(s).over) { const mv = g.pick(Classic, s, p); expect(s.cells[mv]).toBeNull(); s = Classic.apply(s, mv, p); p = p === 'X' ? 'O' : 'X'; }
  });
});

/* ---------------- N x N boards and the Board Challenge ---------------- */
describe('big boards', () => {
  it('geometry: line counts and landmarks', () => {
    const g3 = geometry(3, 3);
    expect(g3.lines.length).toBe(8);
    expect(g3.center).toBe(4);
    expect(g3.corners).toEqual([0, 2, 6, 8]);

    const g5 = geometry(5, 4);
    expect(g5.size).toBe(25);
    expect(g5.center).toBe(12);
    // every line is exactly k long and stays on the board
    for (const l of g5.lines) {
      expect(l.length).toBe(4);
      for (const i of l) expect(i).toBeGreaterThanOrEqual(0), expect(i).toBeLessThan(25);
    }
  });

  it('win length scales with the board', () => {
    expect(winLength(3)).toBe(3);
    expect(winLength(5)).toBe(4);
    expect(winLength(7)).toBe(5);
  });

  it('5x5 classic: four in a row wins, three does not', () => {
    const c5 = modeById('classic5');
    expect(c5.n).toBe(5);
    const three = playSeq(c5, [[0, 'X'], [10, 'O'], [1, 'X'], [11, 'O'], [2, 'X']]);
    expect(c5.terminal(three).over).toBe(false);
    const four = c5.apply(playSeq(c5, [[0, 'X'], [10, 'O'], [1, 'X'], [11, 'O'], [2, 'X'], [12, 'O']]), 3, 'X');
    const t = c5.terminal(four);
    expect(t.over).toBe(true);
    expect(t.winner).toBe('X');
    expect(t.line).toEqual([0, 1, 2, 3]);
  });

  it('7x7 classic: a diagonal of five wins', () => {
    const c7 = modeById('classic7');
    let s = c7.start();
    for (let i = 0; i < 4; i++) { s = c7.apply(s, i * 8, 'X'); s = c7.apply(s, 42 + i, 'O'); }
    expect(c7.terminal(s).over).toBe(false);
    s = c7.apply(s, 32, 'X');
    expect(c7.terminal(s).winner).toBe('X');
  });

  it('vanish keeps k marks per side, scaled by board', () => {
    const v5 = modeById('vanish5');
    let s = v5.start();
    for (const i of [0, 1, 2, 3]) s = v5.apply(s, i, 'X');
    expect(s.q.X.length).toBe(4);     // 5x5 keeps 4
    s = v5.apply(s, 4, 'X');
    expect(s.q.X.length).toBe(4);
    expect(s.cells[0]).toBe(null);    // the oldest faded
    expect(v5.doomed(s, 'X')).toBe(1);
  });

  it('encoders match their declared length on every board', () => {
    for (const r of ALL_MODES) {
      expect(r.encode(r.start(), 'X', 1).length).toBe(r.encodeLen);
      expect(r.actions).toBe(r.n * r.n);
    }
  });

  it('regular play is 3x3 only; big boards are event boards', () => {
    expect(MODES.every((m) => m.n === 3)).toBe(true);
    expect(MODES.length).toBe(3);
    expect(EVENT_BOARDS.every((m) => m.n > 3)).toBe(true);
    expect(ALL_MODES.length).toBe(9);
  });

  it('the week board rotates and is always a big board', () => {
    const a = challengeBoard('2026-W46'), b = challengeBoard('2026-W47');
    expect(a.n).toBeGreaterThan(3);
    expect(b.n).toBeGreaterThan(3);
    expect(challengeBoard('2026-W46').id).toBe(a.id); // stable within a week
  });

  it('a save left on a big board comes back to 3x3', () => {
    const p = normalizeProfile({ mode: 'vanish7' } as any);
    expect(p.mode).toBe('vanish');
  });
});

/* ---------------- spirit growth stages ---------------- */
describe('spirit stages', () => {
  // a head-shaped stand-in: stages only read moves and the recent choice-move window
  const head = (moves: number, choices = moves) => ({ moves, recent: new Array(Math.min(choices, 40)).fill(1) }) as any;

  it('starts asleep, stirs on the first move', () => {
    expect(spiritStage(undefined).name).toBe('SLEEPING');
    expect(spiritStage(head(0)).name).toBe('SLEEPING');
    expect(spiritStage(head(1)).name).toBe('STIRRING');
  });

  it('AWAKE lands exactly on the matchmaking gate', () => {
    const gate = SHADOW_LIMITS.gateMoves;
    expect(spiritStage(head(gate - 1)).name).toBe('WAKING');
    expect(spiritStage(head(gate)).name).toBe('AWAKE');
    expect(spiritStage(head(gate)).idx).toBe(AWAKE_STAGE);
    // and agrees with the real eligibility rule
    const sh = new Shadow();
    expect(sh.eligible('classic')).toBe(false);
  });

  it('enough moves but too few real choices stays waking, bar full', () => {
    const s = spiritStage(head(SHADOW_LIMITS.gateMoves + 20, SHADOW_LIMITS.gateStyle - 1));
    expect(s.name).toBe('WAKING');
    expect(s.progress).toBe(1);
    expect(s.line).toContain('REAL CHOICES');
  });

  it('progress runs 0..1 within a stage', () => {
    const half = spiritStage(head(SHADOW_LIMITS.gateMoves / 2 + SHADOW_LIMITS.gateMoves / 4));
    expect(half.name).toBe('WAKING');
    expect(half.progress).toBeCloseTo(0.5, 5);
  });

  it('the last stage is final and full', () => {
    const s = spiritStage(head(5000));
    expect(s.name).toBe('MIRROR');
    expect(s.final).toBe(true);
    expect(s.progress).toBe(1);
  });

  it('stages are strictly increasing', () => {
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i].at).toBeGreaterThan(STAGES[i - 1].at);
  });
});

/* ---------------- discoveries ---------------- */
describe('discoveries', () => {
  // build a spirit whose classic head has exactly the traits we want
  const spirit = (traits: Partial<Record<'centerOpen' | 'corner' | 'block' | 'finish', [number, number]>>, extra: any = {}) => {
    const sh = new Shadow();
    const h = sh.head(Classic);
    Object.assign(h.traits, traits);
    Object.assign(h, extra);
    return sh;
  };

  it('finds nothing without enough evidence', () => {
    const sh = spirit({ centerOpen: [4, 4] });   // 100% — but only 4 openings, needs 5
    expect(detectDiscoveries(sh, defaultProfile())).toEqual([]);
  });

  it('finds a habit once the evidence is there', () => {
    const sh = spirit({ centerOpen: [5, 5] });
    const found = detectDiscoveries(sh, defaultProfile());
    expect(found.map((f) => f.def.name)).toEqual(['CENTRE FIRST']);
    expect(found[0].key).toBe('classic:centre');
    expect(found[0].seen).toBe(false);
  });

  it('opposite habits are mutually exclusive', () => {
    const corners = detectDiscoveries(spirit({ corner: [12, 15] }), defaultProfile()).map((f) => f.def.id);
    const edges   = detectDiscoveries(spirit({ corner: [2, 15] }),  defaultProfile()).map((f) => f.def.id);
    expect(corners).toContain('corners'); expect(corners).not.toContain('edges');
    expect(edges).toContain('edges');     expect(edges).not.toContain('corners');
  });

  it('is announced once, then stays in the collection', () => {
    const sh = spirit({ block: [6, 6] }), p = defaultProfile();
    expect(detectDiscoveries(sh, p).map((f) => f.def.id)).toEqual(['wall']);
    expect(detectDiscoveries(sh, p)).toEqual([]);           // not announced twice
    sh.peek('classic')!.traits.block = [0, 50];              // habit changes later...
    expect(foundFor(p, 'classic').map((f) => f.def.id)).toContain('wall'); // ...the entry stays
  });

  it('global discoveries are found once and show on every mode page', () => {
    const sh = new Shadow();
    sh.latency = new Array(25).fill(800);                    // 0.8s average, enough samples
    const p = defaultProfile();
    const found = detectDiscoveries(sh, p);
    expect(found.filter((f) => f.def.id === 'quick').length).toBe(1);
    expect(p.discoveries['*:quick']).toBeTruthy();
    for (const m of MODES) expect(foundFor(p, m.id).map((f) => f.def.id)).toContain('quick');
  });

  it('fidelity traits wait for a full window', () => {
    const short = spirit({}, { recent: new Array(10).fill(1) });
    expect(detectDiscoveries(short, defaultProfile()).map((f) => f.def.id)).not.toContain('openbook');
    const full = spirit({}, { recent: new Array(20).fill(1) });
    expect(detectDiscoveries(full, defaultProfile()).map((f) => f.def.id)).toContain('openbook');
  });

  it('old saves get an empty collection', () => {
    const p = normalizeProfile({ name: 'OLD' } as any);
    expect(p.discoveries).toEqual({});
  });
});

/* ---------------- can it read you? ---------------- */
describe('reads', () => {
  for (const rules of MODES) {
    it(`${rules.name}: five fair positions, each a real choice with a sealed legal guess`, () => {
      const sh = new Shadow();
      const items = pickReads(sh, rules);
      expect(items.length).toBe(READ_ROUND);
      const keys = new Set(items.map((x) => stateKey(x.s)));
      expect(keys.size).toBe(items.length);                         // no repeats in a round
      for (const x of items) {
        expect(rules.terminal(x.s).over).toBe(false);
        const t = tactics(rules, x.s, 'X');
        expect(t.forced).toBe(false);                               // no "obvious" moves
        expect(t.legal.length).toBeGreaterThanOrEqual(2);
        expect(rules.legal(x.s)).toContain(x.guess);                // the guess is a real move
      }
    });
  }

  it('the guess is made before the answer can teach it', () => {
    const sh = new Shadow();
    const [item] = pickReads(sh, Classic, 1);
    const before = item.guess;
    // teach it the opposite of its guess, many times
    const other = Classic.legal(item.s).find((m) => m !== before)!;
    for (let i = 0; i < 30; i++) sh.coach(Classic, item.s, other);
    expect(item.guess).toBe(before);                                // the sealed guess never changes
  });

  it('verdicts', () => {
    expect(readVerdict(5)).toBe('IT READ YOU PERFECTLY');
    expect(readVerdict(4)).toBe('IT KNOWS YOU WELL');
    expect(readVerdict(3)).toBe("IT'S GETTING THERE");
    expect(readVerdict(2)).toBe('STILL LEARNING YOU');
    expect(readVerdict(0)).toBe('YOU KEPT IT GUESSING');
  });

  it('history: returns the previous score and keeps only the recent ones', () => {
    const reads: any = {};
    expect(recordRead(reads, 'classic', 2)).toBe(null);
    expect(recordRead(reads, 'classic', 4)).toBe(2);
    for (let i = 0; i < 20; i++) recordRead(reads, 'classic', 3);
    expect(reads.classic.length).toBe(READ_HISTORY);
    expect(reads.vanish).toBeUndefined();                           // per mode
  });
});
