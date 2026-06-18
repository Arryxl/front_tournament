import { fileUrl, initials } from '../../lib/overlay';

export function Crest({
  team,
  size,
  win,
}: {
  team: { name: string; shieldUrl: string | null } | null;
  size: number;
  /** Resalta el escudo del ganador / equipo al frente con halo brasa. */
  win?: boolean;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.3),
    ...(win
      ? { borderColor: 'rgba(236,87,30,.6)', boxShadow: '0 0 26px rgba(236,87,30,.4)' }
      : null),
  };
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
export function OverlayMark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/brand/logo.png" alt="" className="w-7 h-7 object-contain" />
      <span className="font-display font-black italic uppercase tracking-tight text-lg leading-none">
        GRAV<span className="text-ignite">I</span>TY
      </span>
    </div>
  );
}

/** Cuatro trazos racing de atmósfera para las escenas a pantalla completa. */
export function SceneSlashes() {
  return (
    <>
      <span className="ov-slash" style={{ top: '17%', left: '-5%', width: '32%' }} />
      <span className="ov-slash thin" style={{ top: '22%', left: '-5%', width: '19%' }} />
      <span className="ov-slash" style={{ bottom: '18%', right: '-5%', width: '30%' }} />
      <span className="ov-slash thin ivory" style={{ bottom: '23%', right: '-5%', width: '17%' }} />
    </>
  );
}
