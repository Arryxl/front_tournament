import { fileUrl, initials } from '../../lib/overlay';

export function Crest({
  team,
  size,
}: {
  team: { name: string; shieldUrl: string | null } | null;
  size: number;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.3) };
  const src = fileUrl(team?.shieldUrl);
  if (team && src) {
    return <img src={src} alt="" className="ov-crest" style={style} />;
  }
  return (
    <div className="ov-crest" style={style}>
      {team ? initials(team.name) : '?'}
    </div>
  );
}

/** Marca pequeña para esquina del overlay. */
export function OverlayMark() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/brand/logo.png" alt="" className="w-7 h-7 object-contain" />
      <span className="font-display font-black italic uppercase tracking-tight text-lg leading-none">
        GRAV<span className="text-ignite">I</span>TY
      </span>
    </div>
  );
}
