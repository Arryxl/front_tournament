import type {
  LinkedPlatform,
  PlayerLinkStatus,
  PlayerPlatformLink,
  TeamLinkSummary,
} from '../../types';

export const PLATFORM_LABEL: Record<LinkedPlatform, string> = {
  steam: 'Steam',
  epic: 'Epic',
  psn: 'PlayStation',
  xbox: 'Xbox',
  switch: 'Switch',
};

/**
 * Cómo se lee cada estado en el panel. Un ID de consola cuenta como verificado
 * (en consola no hay OAuth: verificar es declarar el nick tal cual aparece en
 * el juego), pero se marca con `(ID)` para no perder de vista que esa identidad
 * no la confirmó ningún proveedor.
 */
const STATE_UI: Record<
  Exclude<PlayerLinkStatus, 'none'> | 'none',
  { label: string; icon: string; cls: string }
> = {
  verified: { label: 'Verificado', icon: '✓', cls: 'text-green border-green/50 bg-green/10' },
  declared: { label: 'Verificado (ID)', icon: '✓', cls: 'text-green border-green/40' },
  partial: { label: 'Incompleto', icon: '!', cls: 'text-ignite border-ignite/50 bg-ignite/10' },
  missing: { label: 'Sin verificar', icon: '○', cls: 'text-ignite border-ignite/50 bg-ignite/10' },
  none: { label: 'Sin plataformas', icon: '–', cls: 'text-mute border-line' },
};

/** Estado global de un jugador: lo que se lee de un vistazo en el roster. */
export function PlayerLinkBadge({ status }: { status: PlayerLinkStatus }) {
  const ui = STATE_UI[status];
  return (
    <span
      className={`font-mono text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border whitespace-nowrap ${ui.cls}`}
    >
      {ui.icon} {ui.label}
    </span>
  );
}

/** Una plataforma del jugador, con la cuenta real detrás (nombre o ID). */
export function PlatformChip({ link }: { link: PlayerPlatformLink }) {
  const ui = STATE_UI[link.state];
  const account = link.displayName || link.platformId;
  return (
    <span
      className={`font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-sm border whitespace-nowrap ${ui.cls}`}
      title={
        link.state === 'verified'
          ? `Verificada con login de ${PLATFORM_LABEL[link.platform]}${
              link.verifiedAt ? ` el ${new Date(link.verifiedAt).toLocaleDateString('es-MX')}` : ''
            }`
          : link.state === 'declared'
            ? 'Verificada por ID: el jugador escribió su nick de consola (no hay login que lo confirme)'
            : `El jugador aún no verifica su cuenta de ${PLATFORM_LABEL[link.platform]}`
      }
    >
      {ui.icon} {PLATFORM_LABEL[link.platform]}
      {account && <span className="opacity-70 normal-case tracking-normal"> · {account}</span>}
    </span>
  );
}

/** Badge de equipo para la lista: "3/4 verificados". */
export function TeamLinkBadge({ summary }: { summary: TeamLinkSummary | undefined }) {
  if (!summary || summary.expected === 0) {
    return (
      <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-mute border border-line px-1.5 py-0.5 rounded-sm whitespace-nowrap">
        – sin cuentas
      </span>
    );
  }
  const ok = summary.verified + summary.declared;
  const done = summary.pending === 0;
  return (
    <span
      className={`font-mono text-[9px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm border whitespace-nowrap ${
        done
          ? 'text-green border-green/50 bg-green/10'
          : ok === 0
            ? 'text-ignite border-ignite/50 bg-ignite/10'
            : 'text-ignite border-ignite/40'
      }`}
      title={
        done
          ? 'Todos los jugadores vincularon sus cuentas'
          : `${summary.pending} jugador(es) sin vincular todas sus cuentas`
      }
    >
      {done ? '✓' : '○'} {ok}/{summary.expected} verificados
    </span>
  );
}

/** Leyenda que explica qué significa cada estado. */
export function VerificationLegend() {
  return (
    <p className="font-mono text-[10px] text-mute leading-relaxed mb-3">
      <span className="text-green">✓ Verificado</span> — el jugador inició sesión con Steam/Epic y su
      identidad quedó probada. <span className="text-green">✓ Verificado (ID)</span> — consola
      (PSN/Xbox/Switch): no hay login que lo confirme, así que verificar es declarar el nick tal cual
      aparece en Rocket League. <span className="text-ignite">○ Sin verificar</span> — no ha
      verificado la cuenta que puso en su inscripción, así que sus stats de replays no se le podrán
      asignar.
    </p>
  );
}
