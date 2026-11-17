import type { JSX } from 'preact';
import type { SpiritId } from '../../core/spirits';

/**
 * Line-art animal heads for the spirit avatars. One viewBox (0 0 24 24), one
 * stroke weight, no fills — so they sit beside the nav glyphs without clashing.
 */

const eye = (cx: number, cy: number, c: string) => <circle cx={cx} cy={cy} r=".75" fill={c} stroke="none" />;

const ART: Record<SpiritId, (c: string) => JSX.Element> = {
  rabbit: (c) => <>
    <ellipse cx="9.3" cy="6.4" rx="1.6" ry="4.2" />
    <ellipse cx="14.7" cy="6.4" rx="1.6" ry="4.2" />
    <circle cx="12" cy="15.4" r="5.4" />
    {eye(10.1, 14.4, c)}{eye(13.9, 14.4, c)}
    <path d="M12 16.6v1.1M12 17.7l-1.3.9M12 17.7l1.3.9" />
  </>,
  owl: (c) => <>
    <path d="M6.8 7.6 4.9 5.2M17.2 7.6l1.9-2.4" />
    <path d="M12 20.4c-3.9 0-6.7-3-6.7-6.9S8.1 6.4 12 6.4s6.7 3.2 6.7 7.1-2.8 6.9-6.7 6.9Z" />
    <circle cx="9.5" cy="12.4" r="2.3" />
    <circle cx="14.5" cy="12.4" r="2.3" />
    {eye(9.5, 12.4, c)}{eye(14.5, 12.4, c)}
    <path d="M12 15.1l-1.1 1.8h2.2z" />
  </>,
  fox: (c) => <>
    <path d="M12 20.6 5.4 14.2 6.8 5.4l3.4 2.9h3.6l3.4-2.9 1.4 8.8z" />
    {eye(9.6, 12.4, c)}{eye(14.4, 12.4, c)}
    <path d="M12 16.1v1.3" />
  </>,
  wolf: (c) => <>
    <path d="M12 20.8 5.8 15.1V6.2l3.6 3h5.2l3.6-3v8.9z" />
    {eye(9.7, 12.2, c)}{eye(14.3, 12.2, c)}
    <path d="M10.6 16.4h2.8M12 16.4v1.6" />
  </>,
  cat: (c) => <>
    <path d="M6.6 9.4 5.9 4.6l4 2.6M17.4 9.4l.7-4.8-4 2.6" />
    <circle cx="12" cy="14.2" r="6" />
    {eye(9.8, 13.1, c)}{eye(14.2, 13.1, c)}
    <path d="M12 15.6v1.2M12 16.8l-1.4.8M12 16.8l1.4.8M3.6 15h3.2M17.2 15h3.2" />
  </>,
  bear: (c) => <>
    <circle cx="7.1" cy="7.2" r="2.3" />
    <circle cx="16.9" cy="7.2" r="2.3" />
    <circle cx="12" cy="14.3" r="6" />
    {eye(9.9, 13, c)}{eye(14.1, 13, c)}
    <ellipse cx="12" cy="16.6" rx="2.2" ry="1.7" />
  </>,
  raven: (c) => <>
    <path d="M14.6 18.6c-3.4 0-6.2-2.6-6.2-5.9 0-3.2 2.4-5.9 5.6-5.9 2 0 3.6.9 4.6 2.3" />
    <path d="M18.6 9.1 22.4 11l-3.9 1.7" />
    {eye(14.4, 11.1, c)}
    <path d="M8.6 14.3 2.3 17l5.1 1.1M10.4 17.9l1.2 3.3" />
  </>,
  viper: (c) => <>
    <path d="M4.3 19.4c3.4 0 4.3-2.3 4.3-4.1 0-2-1.8-2.9-3.2-2.3-1.2.5-1.3 2.2.2 2.6 2.5.7 5.4-.9 6.6-3.2" />
    <path d="M12.2 12.4c1-2 3-3.3 5.2-3.3 2 0 3.3 1.2 3.3 2.7s-1.3 2.6-3 2.6" />
    {eye(18.4, 10.8, c)}
    <path d="M11.2 13.6l-2.4 1.1M15.2 14.4l.6 1.4" />
  </>,
};

export function SpiritIcon({ id, color = '#fff', size = 24 }: { id: SpiritId; color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      {ART[id]?.(color) ?? ART.rabbit(color)}
    </svg>
  );
}

/** the nav tab needs the same art with the nav's own stroke/colour handling */
export const spiritArt = (id: SpiritId, c: string) => ART[id]?.(c) ?? ART.rabbit(c);
