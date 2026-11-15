import type { SummaryData } from '../../state/overlays';

export function Summary({ data }: { data: SummaryData }) {
  return (
    <div class="ov">
      <div class="abs center u-title" style={{ color: data.color }}>{data.title}</div>
      <div class="abs center u-sub">{data.sub}</div>
      <div class="abs rows" style={{ top: '280px' }}>
        {data.rows.map((r) => <div class="srow" key={r.k}><div class="k">{r.k}</div><div class="v">{r.v}</div></div>)}
      </div>
      <div class="abs u-learned">{data.learned}</div>
      <div class="acts" style={{ top: '716px' }}>
        <button class="primary" onClick={data.primary.run}>{data.primary.label}</button>
        <div class="sep" />
        <button onClick={data.secondary.run}>{data.secondary.label}</button>
      </div>
    </div>
  );
}
