import { MLP, type NetJSON } from '../core/nn/mlp';
import { MODES, isModeId } from '../core/rules/modes';
import type { ModeId } from '../core/rules/types';
import { newHead, newTraits, Shadow, type Traits } from '../core/shadow/shadow';
import { normalizeProfile, type Profile } from '../core/profile';
import { kvDel, kvGet, kvSet } from './kv';

/* ---------------- shadow (de)serialisation ---------------- */
interface SampleJSON { x: number[]; y: number; legal: number[]; age: number; w?: number; }
interface HeadJSON {
  net: NetJSON; moves: number; recent: number[]; traits: Traits;
  coached: number; coachedKeys: string[]; samples: SampleJSON[];
}
interface ShadowJSON { v: 3; games: number; latency: number[]; heads: Partial<Record<ModeId, HeadJSON>>; }

export function shadowToJSON(sh: Shadow): ShadowJSON {
  const heads: ShadowJSON['heads'] = {};
  for (const [id, h] of sh.heads) {
    heads[id] = {
      net: h.net.toJSON(), moves: h.moves, recent: h.recent, traits: h.traits,
      coached: h.coached, coachedKeys: h.coachedKeys,
      samples: h.samples.map((s) => ({ x: Array.from(s.x), y: s.y, legal: s.legal, age: s.age, w: s.w })),
    };
  }
  return { v: 3, games: sh.games, latency: sh.latency, heads };
}

export function shadowFromJSON(d: Partial<ShadowJSON> & { lat?: number[] }, sh = new Shadow()): Shadow {
  sh.reset();
  sh.games = d.games ?? 0;
  sh.latency = d.latency ?? d.lat ?? [];
  for (const rules of MODES) {
    const o = d.heads?.[rules.id];
    if (!o) continue;
    const h = newHead(rules);
    h.net = MLP.fromJSON(o.net, rules.encodeLen);
    h.moves = o.moves ?? 0;
    h.recent = o.recent ?? [];
    h.traits = o.traits ?? newTraits();
    h.coached = o.coached ?? 0;
    h.coachedKeys = o.coachedKeys ?? [];
    h.samples = (o.samples ?? []).map((s) => ({ x: Float32Array.from(s.x), y: s.y, legal: s.legal, age: s.age, w: s.w ?? 1 }));
    sh.heads.set(rules.id, h);
  }
  return sh;
}

/* ---------------- save / load ---------------- */
const K_SHADOW = 'shadow', K_PROFILE = 'profile';

export async function saveAll(sh: Shadow, p: Profile): Promise<void> {
  await Promise.all([kvSet(K_SHADOW, shadowToJSON(sh)), kvSet(K_PROFILE, p)]);
}

export async function loadAll(sh: Shadow): Promise<Profile> {
  const [s, p] = await Promise.all([kvGet<ShadowJSON>(K_SHADOW), kvGet<Profile>(K_PROFILE)]);
  if (s || p) {
    if (s) shadowFromJSON(s, sh);
    return normalizeProfile(p ?? {});
  }
  // first run on the new build: bring over the single-file prototype's data
  const migrated = migrateLegacy(sh);
  await saveAll(sh, migrated);
  return migrated;
}

export async function wipeShadow(sh: Shadow): Promise<void> {
  sh.reset();
  await kvDel(K_SHADOW);
}

/** every key the prototype wrote — a full reset must clear these too, or the
 *  legacy migration below restores the old save on the next load */
const LEGACY_KEYS = ['ttt_shadow_v2', 'ttt_shadow_v1', 'ttt_profile_v1', 'ttt_mode', 'ttt_mini_score_v1'];

/** wipe everything: the spirit, the profile and any prototype leftovers */
export async function wipeAll(sh: Shadow): Promise<void> {
  sh.reset();
  await Promise.all([kvDel(K_SHADOW), kvDel(K_PROFILE)]);
  for (const k of LEGACY_KEYS) {
    try { localStorage.removeItem(k); } catch { /* storage may be unavailable */ }
  }
}

/* ---------------- legacy localStorage (prototype) ---------------- */
function readLS<T>(k: string): T | null {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : null; } catch { return null; }
}

function migrateLegacy(sh: Shadow): Profile {
  const v2 = readLS<{ games: number; lat: number[]; heads: Record<string, any> }>('ttt_shadow_v2');
  const v1 = readLS<any>('ttt_shadow_v1');
  if (v2) {
    // prototype nets had no shape info: fill from the mode
    const heads: ShadowJSON['heads'] = {};
    for (const m of MODES) {
      const o = v2.heads?.[m.id];
      if (o) heads[m.id] = { ...o, net: { nin: m.encodeLen, h1: 64, h2: 64, nout: 9, ...o.net } };
    }
    shadowFromJSON({ games: v2.games, latency: v2.lat, heads }, sh);
  } else if (v1?.net) {
    shadowFromJSON({ games: v1.games, latency: v1.lat, heads: { classic: {
      net: { nin: 29, h1: 64, h2: 64, nout: 9, ...v1.net }, moves: v1.moves ?? 0, recent: [],
      traits: v1.traits ?? newTraits(), coached: 0, coachedKeys: [], samples: v1.samples ?? [] } } }, sh);
  }
  const prof = readLS<Partial<Profile>>('ttt_profile_v1') ?? {};
  const mode = readLS<string>('ttt_mode') ?? (() => { try { return localStorage.getItem('ttt_mode'); } catch { return null; } })();
  const mini = readLS<Profile['mini']>('ttt_mini_score_v1');
  const out = normalizeProfile({ ...prof, ...(mini ? { mini } : {}) });
  if (mode && isModeId(mode)) out.mode = mode;
  return out;
}
