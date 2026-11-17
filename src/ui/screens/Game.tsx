import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { RivalAgent, ShadowAgent, type Agent } from '../../core/agents';
import { insight, gateProgress } from '../../core/insight';
import { pick } from '../../core/heuristic';
import { MATCH, matchOver, matchScore, newMatch, play, startRound, type MatchState } from '../../core/match';
import { eloDelta } from '../../core/rating';
import { pickUnsure } from '../../core/shadow/coach';
import { commit, isActive, rivalModels, rules, screen, shadow, startSession, store, type Session } from '../../state/app';
import { closeOverlay, overlay, runCoach, runTraining, type SummaryRow } from '../../state/overlays';
import { Board } from '../components/Board';
import { COLORS } from '../components/Glyph';
import { feel } from '../feel';
import { CountUp } from '../feel/motion';

const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

export function Game({ sess }: { sess: Session }) {
  const r = rules.value, p = store.profile;
  const rated = sess.kind === 'rival';
  const agent: Agent = useMemo(
    () => (rated ? new RivalAgent(sess.rival!, rivalModels) : new ShadowAgent(shadow)), [sess.id]);

  const [m, setM] = useState<MatchState>(() => newMatch(r));
  const [left, setLeft] = useState<number>(MATCH.turnSeconds);
  const [paused, setPaused] = useState(false);
  const [predCell, setPredCell] = useState(-1);
  const mRef = useRef(m); mRef.current = m;
  const moveStart = useRef(Date.now());
  const style = useRef({ hits: 0, moves: 0 });
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  /* ---------- feel: every placed mark, last-seconds ticks ---------- */
  useEffect(() => {
    if (m.lastMove < 0) return;
    const who = m.s.cells[m.lastMove];
    if (who) feel.place(who);
  }, [m.s.ply, m.round]);

  useEffect(() => {
    if (MATCH.timed && !m.locked && !paused && left > 0 && left <= 5) feel.warn();
  }, [left]);

  /* ---------- turn clock (only when MATCH.timed) ---------- */
  useEffect(() => {
    setLeft(MATCH.turnSeconds);
    if (m.locked || paused) return;
    if (m.turn === 'X') moveStart.current = Date.now();
    if (!MATCH.timed) return;
    const iv = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(iv);
  }, [m.turn, m.lastMove, m.round, m.locked, paused]);

  useEffect(() => {
    if (!MATCH.timed || left > 0 || m.locked || paused) return;
    const legal = r.legal(m.s);
    if (!legal.length) return;
    // timeout: the move is made for you and is NOT learned
    setM(play(m, m.turn === 'X' ? pick(legal) : agent.pick(r, m.s, 'O', 0)));
  }, [left]);

  /* ---------- opponent ---------- */
  useEffect(() => {
    if (m.locked || paused || m.turn !== 'O') return;
    const t = setTimeout(() => {
      const cur = mRef.current;
      if (!alive.current || cur.locked || cur.turn !== 'O') return;
      const mv = agent.pick(r, cur.s, 'O', MATCH.timed ? left / MATCH.turnSeconds : 1);
      if (mv >= 0) setM(play(cur, mv));
    }, m.round === 1 && m.lastMove < 0 ? 600 : agent.thinkMs());
    return () => clearTimeout(t);
  }, [m.turn, m.lastMove, m.round, paused]);

  /* ---------- round end ---------- */
  useEffect(() => {
    if (!m.terminal) return;
    const w = m.terminal.winner;
    setTimeout(() => (w === 'X' ? feel.win() : w === 'O' ? feel.lose() : feel.draw()), 160);
    shadow.games++;
    commit();
    const over = matchOver(m);
    let delta: number | null = null;
    if (over && rated) {
      const rv = sess.rival!;
      delta = eloDelta(p.rating[r.id], rv.rating[r.id], matchScore(m));
      p.rating[r.id] += delta;
      rv.rating[r.id] -= delta;
      commit();
    }
    const t = setTimeout(async () => {
      let coached = 0;
      if (over) coached = (await runCoach(pickUnsure(shadow, r, 2))).answered;
      await runTraining(r);
      if (alive.current) showSummary(over, delta, coached);
    }, 700);
    return () => clearTimeout(t);
  }, [m.terminal]);

  function showSummary(over: boolean, delta: number | null, coached: number) {
    const cur = mRef.current, t = cur.terminal!;
    const youWon = over ? cur.score.X > cur.score.O : t.winner === 'X';
    const drawn = over ? cur.score.X === cur.score.O : !t.winner;
    const fid = shadow.fidelity(r.id), h = shadow.head(r);
    const rows: SummaryRow[] = [];
    if (over && delta !== null) {
      rows.push({ k: `RATING · ${r.name}`, v: <><CountUp from={p.rating[r.id] - delta} to={p.rating[r.id]} ms={900} /> <span style={{ color: delta > 0 ? COLORS.X : delta < 0 ? COLORS.O : '#fff' }}>{signed(delta)}</span></> });
    }
    rows.push({ k: 'STYLE MOVES PREDICTED', v: style.current.moves ? `${style.current.hits} / ${style.current.moves}` : 'NONE THIS ROUND' });
    rows.push({ k: 'STYLE FIDELITY', v: fid === null ? 'CALIBRATING' : fid + '%' });
    rows.push({ k: 'MOVES LEARNED', v: String(h.moves) });
    if (over && coached) rows.push({ k: 'COACHED', v: `${coached} POSITIONS` });
    const how = r.id === 'reverse' && t.winner && !over ? (youWon ? ' · THEY MADE THREE' : ' · YOU MADE THREE') : '';
    const g = gateProgress(h);
    overlay.value = { kind: 'summary', data: {
      title: over ? (drawn ? 'MATCH DRAWN' : youWon ? 'MATCH WON' : 'MATCH LOST') : (drawn ? 'ROUND DRAWN' : youWon ? 'ROUND WON' : 'ROUND LOST'),
      color: drawn ? '#fff' : youWon ? COLORS.X : COLORS.O,
      sub: over ? `${r.name} VS ${agent.name}   ${cur.score.X} — ${cur.score.O}` : `${r.name} · SERIES ${cur.score.X} — ${cur.score.O}${how}`,
      rows,
      learned: isActive(r) ? insight(h, r)
        : `SPIRIT UNLOCKS FOR MATCHMAKING AT ${g.need} MOVES  ·  ${g.moves} / ${g.need}${g.needsStyle ? '  ·  NEEDS MORE CHOICE MOVES' : ''}`,
      primary: over
        ? { label: 'PLAY AGAIN', run: () => { closeOverlay(); if (rated) screen.value = 'search'; else startSession('mirror'); } }
        : { label: 'NEXT ROUND', run: () => { closeOverlay(); style.current = { hits: 0, moves: 0 }; setM(startRound(mRef.current)); } },
      secondary: { label: 'MENU', run: () => { closeOverlay(); screen.value = 'menu'; } },
    } };
  }

  /* ---------- player input ---------- */
  const tap = (i: number) => {
    if (m.locked || paused || m.turn !== 'X' || m.s.cells[i]) return;
    const rec = shadow.record(r, m.s, 'X', MATCH.timed ? left / MATCH.turnSeconds : 1, i, Date.now() - moveStart.current);
    if (!rec.forced) { style.current.moves++; style.current.hits += rec.hit; }
    commit();
    setM(play(m, i));
    if (rec.hit && !rec.forced) {
      setPredCell(i);
      setTimeout(() => feel.predicted(), 110);
      setTimeout(() => alive.current && setPredCell(-1), 900);
    }
  };

  const isX = m.turn === 'X';
  const live = !m.locked;
  const nameX = p.name, nameO = agent.name;
  const tagO = rated ? `RATING ${sess.rival!.rating[r.id]}` : 'UNRATED';
  const color = isX ? COLORS.X : COLORS.O;

  return (
    <div class="screen">
      <button class="ico" style={{ left: '14px' }} aria-label="Back" onClick={() => (screen.value = 'menu')}>
        <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 9H2M9 2 2 9l7 7" /></svg>
      </button>
      <div class="abs center g-tag lbl2">{r.name} · ROUND {m.round} · {rated ? 'RANKED' : 'UNRATED'}</div>
      <button class="ico" style={{ right: '14px' }} aria-label="Pause" onClick={() => live && setPaused((v) => !v)}>
        <svg width="14" height="16" viewBox="0 0 14 16" fill="#fff"><rect width="4" height="16" /><rect x="10" width="4" height="16" /></svg>
      </button>

      <div class="abs g-score">
        <div class="pl">
          <div class="nm" style={{ color: !live ? '#fff' : isX ? COLORS.X : 'var(--idle)' }}>{nameX}</div>
          <div class="tag">{rated ? `RATING ${p.rating[r.id]}` : 'YOU'}</div>
          <div class="pips">{[0, 1, 2].map((i) => <i key={i} class={'pip' + (i < m.score.X ? ' on' : '')} style={{ background: i < m.score.X ? COLORS.X : 'var(--dim)' }} />)}</div>
        </div>
        {MATCH.timed
          ? <div class="g-clock" style={{ color: live && left <= 5 ? color : 'var(--ink)' }}>0:{String(Math.max(0, left)).padStart(2, '0')}</div>
          : <div class="g-clock" style={{ color: 'var(--dim)', fontSize: '13px', letterSpacing: '.18em' }}>·</div>}
        <div class="pl r">
          <div class="nm" style={{ color: !live ? '#fff' : !isX ? COLORS.O : 'var(--idle)' }}>{nameO}</div>
          <div class="tag">{tagO}</div>
          <div class="pips">{[0, 1, 2].map((i) => <i key={i} class={'pip' + (i < m.score.O ? ' on' : '')} style={{ background: i < m.score.O ? COLORS.O : 'var(--dim)' }} />)}</div>
        </div>
      </div>

      <div class="hair" style={{ left: '28px', top: '214px', width: '364px', height: '2px' }} />
      <div class={'abs g-bar' + (MATCH.timed && live && !paused && left <= 5 ? ' warn' : '')}
           style={{ width: (MATCH.timed && live ? (Math.max(0, left) / MATCH.turnSeconds) * 364 : 364) + 'px', background: color }} />
      <div class="abs center g-turn swap" key={`${m.turn}-${m.round}-${live}-${paused}`}>
        {!live ? '' : paused ? <b style={{ fontWeight: 400, color: '#fff' }}>PAUSED</b>
          : <><b style={{ fontWeight: 400, color }}>{isX ? nameX : nameO}</b>&nbsp;&nbsp;TO MOVE</>}
      </div>

      <Board rules={r} s={m.s} cell={110} mark={64} overhang={16} left={45} top={320}
             newIdx={m.lastMove} hint={live && isX && !paused ? 'X' : null} terminal={m.terminal} showWinLine
             onTap={tap} decorate={(i) => <i class={'pred' + (predCell === i ? ' on' : '')} />} />

      {live && <div class="abs center g-hint lbl2">{r.blurb}</div>}
    </div>
  );
}
