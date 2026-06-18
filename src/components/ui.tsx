import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileBase } from '../lib/api';
import { matchLabel, matchFormatLabel } from '../lib/tournament';
import type { Match, Team } from '../types';

export function Kicker({ children }: { children: ReactNode }) {
  return <span className="kicker">{children}</span>;
}

/** Moneda de la economía Gravity: el "grat" (pixel-art con la G). */
export function Coin({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/coin.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, display: 'inline-block', imageRendering: 'auto' }}
    />
  );
}

/** Etiqueta de moneda: "grat" / "grats" según cantidad. */
export function gratsLabel(n: number) {
  return Math.abs(n) === 1 ? 'grat' : 'grats';
}

/**
 * Importe en grats: moneda + número tabular + unidad.
 * `tone="ignite"` resalta el número en brasa (saldos, premios).
 */
export function Grats({
  amount,
  size = 18,
  tone = 'ink',
  showUnit = true,
  className = '',
}: {
  amount: number;
  size?: number;
  tone?: 'ink' | 'ignite' | 'mute';
  showUnit?: boolean;
  className?: string;
}) {
  const toneClass = tone === 'ignite' ? 'text-ignite' : tone === 'mute' ? 'text-mute' : 'text-ink';
  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
      <Coin size={size} />
      <span className={`font-bold ${toneClass}`}>{amount.toLocaleString('es')}</span>
      {showUnit && (
        <span className="text-mute font-mono text-[0.7em] tracking-[0.12em] uppercase">
          {gratsLabel(amount)}
        </span>
      )}
    </span>
  );
}

/** Botón "volver": navega a la pantalla anterior (o a `to` si se indica). */
export function BackButton({
  to,
  label = 'Volver',
  className = '',
}: {
  to?: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ignite transition-colors group ${className}`}
    >
      <span className="text-base leading-none transition-transform group-hover:-translate-x-1">←</span>
      {label}
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'text-mute border-line',
    approved: 'text-green border-green/40',
    rejected: 'text-ignite border-ignite/40',
    scheduled: 'text-mute border-line',
    live: 'text-ignite border-ignite/50 bg-ignite/10',
    finished: 'text-ink border-line',
    delivered: 'text-green border-green/40',
    cancelled: 'text-ignite border-ignite/40',
  };
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    scheduled: 'Programado',
    live: 'EN VIVO',
    finished: 'Finalizado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };
  return (
    <span
      className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-sm border ${
        map[status] || 'text-mute border-line'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export function TeamBadge({ team, fallback }: { team: Team | null; fallback?: string }) {
  if (!team) {
    return <span className="font-mono text-sm text-mute">{fallback || 'TBD'}</span>;
  }
  return (
    <div className="flex items-center gap-3">
      {team.shieldUrl ? (
        <img
          src={team.shieldUrl.startsWith('http') ? team.shieldUrl : `${fileBase}${team.shieldUrl}`}
          alt={team.name}
          className="w-8 h-8 rounded-sm object-cover border border-line"
        />
      ) : (
        <div className="w-8 h-8 rounded-sm bg-void border border-line flex items-center justify-center font-display font-black italic text-xs">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="font-display font-semibold">{team.name}</span>
    </div>
  );
}

export function CoinBalance({ coins }: { coins: number }) {
  return (
    <div className="flex items-center gap-2.5 bg-void border border-line rounded-md px-3 py-2">
      <Coin size={20} />
      <div className="leading-none">
        <div className="font-display font-black italic text-ink text-lg tabular-nums">
          {coins.toLocaleString('es')}
        </div>
        <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-mute mt-0.5">
          {gratsLabel(coins)}
        </div>
      </div>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const date = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('es', {
        day: '2-digit',
        month: 'short',
      })
    : '—';
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-mute tracking-[0.15em] truncate">
          {matchLabel(match)}
        </span>
        <StatusBadge status={match.status} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <TeamBadge team={match.teamHome} fallback="Por definir" />
        <span className="font-display font-black italic text-xl tabular-nums">
          {match.homeScore ?? '-'}
          <span className="text-mute mx-1">:</span>
          {match.awayScore ?? '-'}
        </span>
        <div className="flex-row-reverse flex">
          <TeamBadge team={match.teamAway} fallback="Por definir" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-mute tracking-[0.15em] uppercase">
        <span className="truncate">{matchFormatLabel(match)}</span>
        <span className="shrink-0">{date}</span>
      </div>
    </div>
  );
}

export function Section({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-16">
      {kicker && <Kicker>{kicker}</Kicker>}
      {title && (
        <h2 className="font-display font-black italic uppercase tracking-tight text-3xl md:text-5xl mt-3 mb-8 leading-none">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="font-mono text-mute text-sm tracking-[0.2em] animate-pulse">CARGANDO…</div>
    </div>
  );
}
