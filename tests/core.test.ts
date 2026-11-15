import { describe, expect, it } from 'vitest';
import { Classic, Reverse, Vanish, MODES } from '../src/core/rules/modes';
import { tactics } from '../src/core/tactics';
import { eloDelta, makeRivals, matchmake } from '../src/core/rating';
import { Shadow } from '../src/core/shadow/shadow';
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
