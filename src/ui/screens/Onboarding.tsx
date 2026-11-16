import { useEffect, useRef, useState } from 'preact/hooks';
import { HeuristicAgent } from '../../core/agents';
import { Classic } from '../../core/rules/modes';
import { other, type Player, type State, type Terminal } from '../../core/rules/types';
import { SHADOW_LIMITS } from '../../core/shadow/shadow';
import { pickUnsure } from '../../core/shadow/coach';
import { cleanName, validName } from '../../core/profile';
import { commit, screen, shadow, store } from '../../state/app';
import { runCoach, runTraining } from '../../state/overlays';
import { Board } from '../components/Board';
import { COLORS, Glyph } from '../components/Glyph';
import { feel } from '../feel';
import { CountUp, useMounted } from '../feel/motion';

type Step = 'welcome' | 'name' | 'game' | 'learned' | 'coach' | 'ready';
const STEPS: Step[] = ['welcome', 'name', 'game', 'learned', 'coach', 'ready'];

/** gentle first opponent: blocks most threats, leaves the odd opening */
const GUIDE = new HeuristicAgent('GUIDE', { finish: .9, block: .7, center: .5, corner: .5, noise: .25 }, [650, 1100]);

function Dots({ step }: { step: Step }) {
  const i = STEPS.indexOf(step);
  return (
    <div class="abs ob-dots">
      {STEPS.map((s, k) => <i key={s} style={{ background: k === i ? COLORS.X : k < i ? 'rgba(255,90,30,.4)' : 'rgba(255,255,255,.18)' }} />)}
    </div>
  );
}

function Primary({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button class={'abs ob-btn' + (disabled ? ' off' : '')} onClick={() => !disabled && onClick()}>
      <span>{label}</span>
    </button>
  );
}

/* ---------------- step: the first game ---------------- */
type Feedback = 'start' | 'hit' | 'miss' | 'forced';
const FB: Record<Feedback, [string, string, string]> = {
  start:  ['YOU ARE ORANGE', 'TAP ANY CELL TO START', '#fff'],
  hit:    ['YOUR SHADOW SAW THAT COMING', 'IT PREDICTED YOUR MOVE BEFORE YOU MADE IT', COLORS.X],
  miss:   ['NEW TO YOUR SHADOW', "IT GUESSED SOMETHING ELSE · IT'S LEARNING", COLORS.O],
  forced: ['A FORCED MOVE', 'ANYONE WOULD PLAY THAT · NOT COUNTED', 'rgba(255,255,255,.66)'],
};

function FirstGame({ onDone }: { onDone: () => void }) {
  const [s, setS] = useState<State>(() => Classic.start());
  const [turn, setTurn] = useState<Player>('X');
  const [term, setTerm] = useState<Terminal | null>(null);
  const [last, setLast] = useState(-1);
  const [fb, setFb] = useState<Feedback>('start');
  const [pred, setPred] = useState(-1);
  const moveStart = useRef(Date.now());
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const place = (cur: State, i: number, p: Player) => {
    const n = Classic.apply(cur, i, p);
    const t = Classic.terminal(n);
    setS(n); setLast(i);
    feel.place(p);
    if (t.over) {
      setTerm(t);
      setTimeout(() => (t.winner === 'X' ? feel.win() : t.winner === 'O' ? feel.lose() : feel.draw()), 160);
      shadow.games++;
      commit();
      setTimeout(async () => { await runTraining(Classic); if (alive.current) onDone(); }, 1500);
    } else {
      setTurn(other(p));
      if (p === 'O') moveStart.current = Date.now();
    }
  };

  useEffect(() => {
    if (turn !== 'O' || term) return;
    const t = setTimeout(() => alive.current && place(s, GUIDE.pick(Classic, s, 'O'), 'O'), GUIDE.thinkMs());
    return () => clearTimeout(t);
  }, [turn, term, s]);

  const tap = (i: number) => {
    if (term || turn !== 'X' || s.cells[i]) return;
    const r = shadow.record(Classic, s, 'X', 1, i, Date.now() - moveStart.current);
    commit();
    setFb(r.forced ? 'forced' : r.hit ? 'hit' : 'miss');
    if (!r.forced) setTimeout(() => (r.hit ? feel.predicted() : feel.miss()), 110);
    if (r.hit && !r.forced) { setPred(i); setTimeout(() => alive.current && setPred(-1), 1000); }
    place(s, i, 'X');
  };

  const [title, sub, color] = term
    ? [term.winner === 'X' ? 'YOU WON' : term.winner === 'O' ? 'GUIDE WON' : 'DRAW', 'NOW WATCH IT LEARN', term.winner === 'X' ? COLORS.X : term.winner === 'O' ? COLORS.O : '#fff']
    : FB[fb];

  return (
    <>
      <div class="abs center ob-title" style={{ top: '96px', fontSize: '22px' }}>PLAY ONE GAME</div>
      <div class="abs center lbl2" style={{ top: '132px' }}>YOUR SHADOW IS WATCHING</div>
      <div class="abs center lbl" style={{ top: '186px' }}>
        <span class="o">{store.profile.name}</span>&nbsp;&nbsp;VS&nbsp;&nbsp;<span class="b">GUIDE</span>
      </div>
      <Board rules={Classic} s={s} cell={110} mark={64} overhang={16} left={45} top={250}
             newIdx={last} hint={!term && turn === 'X' ? 'X' : null} terminal={term} showWinLine onTap={tap}
             decorate={(i) => <i class={'pred' + (pred === i ? ' on' : '')} />} />
      <div class="abs center swap" key={title} style={{ top: '622px', fontSize: '16px', letterSpacing: '.16em', color }}>{title}</div>
      <div class="abs center lbl2 swap" key={sub} style={{ top: '656px' }}>{sub}</div>
    </>
  );
}

/* ---------------- the flow ---------------- */
export function Onboarding() {
  const p = store.profile;
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState(p.name && p.name !== 'PLAYER' ? p.name : '');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (step === 'name') setTimeout(() => inputRef.current?.focus(), 150); }, [step]);

  const finish = () => {
    p.onboarded = true;
    commit();
    screen.value = 'menu';
  };

  const h = shadow.head(Classic);
  const need = SHADOW_LIMITS.gateMoves;
  const mounted = useMounted(250);

  return (
    <div class="screen">
      <Dots step={step} />
      <div class="scr in-r" key={step}>

      {step === 'welcome' && <>
        <div class="abs ob-logo">
          <div class="sh"><Glyph p="X" stroke={7} color={COLORS.O} /></div>
          <div class="fg"><Glyph p="X" stroke={7} /></div>
        </div>
        <div class="abs center ob-title" style={{ top: '410px' }}>MEET YOUR SHADOW</div>
        <div class="abs center ob-body" style={{ top: '466px' }}>
          IT LEARNS HOW YOU PLAY.<br />
          IT PLAYS RANKED MATCHES AS YOU<br />
          WHILE YOU'RE AWAY.
        </div>
        <Primary label="BEGIN" onClick={() => setStep('name')} />
      </>}

      {step === 'name' && <>
        <div class="abs center ob-title" style={{ top: '220px', fontSize: '22px' }}>WHAT SHOULD WE CALL YOU?</div>
        <input ref={inputRef} class="abs ob-input" value={name} placeholder="PLAYER" maxLength={10}
               autocomplete="off" autocapitalize="characters" spellcheck={false}
               onInput={(e) => { const el = e.target as HTMLInputElement; const v = cleanName(el.value); el.value = v; setName(v); }}
               onKeyDown={(e) => { if (e.key === 'Enter' && validName(name)) { p.name = name; commit(); setStep('game'); } }} />
        <div class="abs center lbl2" style={{ top: '410px' }}>2–10 LETTERS OR NUMBERS</div>
        <Primary label="CONTINUE" disabled={!validName(name)} onClick={() => { p.name = name; commit(); setStep('game'); }} />
      </>}

      {step === 'game' && <FirstGame onDone={() => setStep('learned')} />}

      {step === 'learned' && <>
        <div class="abs center ob-title" style={{ top: '150px' }}>IT LEARNED FROM YOU</div>
        <div class="abs center" style={{ top: '214px', fontSize: '84px', lineHeight: '84px', color: COLORS.X }}><CountUp to={h.moves} ms={900} /></div>
        <div class="abs center lbl" style={{ top: '312px' }}>MOVES LEARNED</div>
        <div class="abs ob-prog">
          <div class="top"><span>UNLOCKS AT {need} MOVES</span><span>{Math.min(h.moves, need)} / {need}</span></div>
          <div class="track"><div class="fill" style={{ width: (mounted ? Math.min(100, (h.moves / need) * 100) : 0) + '%' }} /></div>
        </div>
        <div class="abs center ob-body" style={{ top: '462px' }}>
          ONCE UNLOCKED, IT ENTERS RANKED<br />
          AND PLAYS FOR YOU WHILE YOU'RE AWAY.<br />
          <span style={{ color: '#fff' }}>ITS RESULTS MOVE YOUR RATING.</span>
        </div>
        <div class="abs center lbl2" style={{ top: '590px', fontSize: '11px' }}>FIDELITY = HOW OFTEN IT PREDICTS YOU</div>
        <Primary label="CONTINUE" onClick={() => setStep('coach')} />
      </>}

      {step === 'coach' && <>
        <div class="abs center ob-title" style={{ top: '170px' }}>TEACH IT DIRECTLY</div>
        <div class="abs center ob-body" style={{ top: '226px' }}>
          WHEN YOUR SHADOW ISN'T SURE<br />
          WHAT YOU'D DO, IT ASKS.<br />
          ONE TAP. THAT'S IT.
        </div>
        <Board rules={Classic} s={(() => { let st = Classic.start(); for (const [i, pl] of [[4, 'O'], [0, 'X'], [8, 'O']] as [number, Player][]) st = Classic.apply(st, i, pl); return st; })()}
               cell={60} mark={36} overhang={6} left={120} top={370} lineColor="rgba(255,255,255,.3)" lineWidth={1}
               decorate={(i) => (i === 2 || i === 6 ? <i class="guess" style={{ inset: '10px' }} /> : null)} />
        <div class="abs center lbl2" style={{ top: '580px', fontSize: '11px' }}>IT ALSO ASKS ABOUT GAMES IT LOSES</div>
        <Primary label={busy ? 'TRAINING…' : 'TRY IT'} disabled={busy} onClick={async () => {
          setBusy(true);
          const r = await runCoach(pickUnsure(shadow, Classic, 1));
          if (r.answered) await runTraining(Classic);
          setBusy(false);
          setStep('ready');
        }} />
      </>}

      {step === 'ready' && <>
        <div class="abs center ob-title" style={{ top: '170px' }}>YOU'RE READY, {p.name}</div>
        <div class="abs ob-verbs">
          <div><b>PLAY</b><span>RANKED MATCHES AGAINST OTHER SHADOWS</span></div>
          <div><b>COACH</b><span>FIX THE POSITIONS YOUR SHADOW LOSES</span></div>
          <div><b>RETURN</b><span>SEE WHAT IT DID WHILE YOU WERE AWAY</span></div>
        </div>
        <div class="abs center lbl2" style={{ top: '590px', fontSize: '11px' }}>A NEW PUZZLE EVERY DAY IN EVENTS</div>
        <Primary label="START" onClick={finish} />
      </>}
      </div>
    </div>
  );
}
