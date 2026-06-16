import type { ReactNode } from 'react';
import { fileBase } from '../lib/api';
import type { Match, Team } from '../types';

export function Kicker({ children }: { children: ReactNode }) {
  return <span className="kicker">{children}</span>;
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
        <div className="w-8 h-8 rounded-sm bg-void border border-line flex items-center justify-center font-display font-extrabold text-xs">
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="font-display font-semibold">{team.name}</span>
    </div>
  );
}

export function CoinBalance({ coins }: { coins: number }) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className="w-4 h-4 rounded-full bg-ignite inline-block" />
      <span className="text-ink font-bold">{coins}</span>
      <span className="text-mute text-xs">GRV</span>
    </div>
  );
}

const FORMAT_LABEL: Record<string, string> = { bo3: 'BO3', bo5: 'BO5', bo7: 'BO7' };

export function MatchCard({ match }: { match: Match }) {
  const date = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleDateString('es', {
        day: '2-digit',
        month: 'short',
      })
    : '—';
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-mute tracking-[0.2em]">
          {match.matchCode} · {FORMAT_LABEL[match.format]}
        </span>
        <StatusBadge status={match.status} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <TeamBadge team={match.teamHome} fallback="Por definir" />
        <span className="font-display font-extrabold text-xl tabular-nums">
          {match.homeScore ?? '-'}
          <span className="text-mute mx-1">:</span>
          {match.awayScore ?? '-'}
        </span>
        <div className="flex-row-reverse flex">
          <TeamBadge team={match.teamAway} fallback="Por definir" />
        </div>
      </div>
      <div className="font-mono text-[10px] text-mute tracking-[0.2em] uppercase">{date}</div>
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
        <h2 className="font-display font-extrabold uppercase tracking-tight text-3xl md:text-5xl mt-3 mb-8 leading-none">
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
