import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { TWITCH_CHANNEL } from '../../config';
import { useMatchPoll, useTransparentBody } from '../../lib/overlay';
import { connectTwitchChat, type ChatStatus } from '../../lib/twitchChat';
import { Crest, OverlayMark } from './parts';

type Side = 'A' | 'B';

export default function OverlayPredictions() {
  const { id } = useParams();
  const [params] = useSearchParams();
  useTransparentBody();
  const { match } = useMatchPoll(id);
  const channel = (params.get('channel') || TWITCH_CHANNEL).toLowerCase();

  const home = match?.teamHome ?? null;
  const away = match?.teamAway ?? null;
  const open = !!match?.predictionsOpen;
  const finished = match?.status === 'finished';

  const votes = useRef<Map<string, Side>>(new Map());
  const openRef = useRef(open);
  const [tally, setTally] = useState({ a: 0, b: 0 });
  const [recent, setRecent] = useState<{ user: string; side: Side }[]>([]);
  const [status, setStatus] = useState<ChatStatus>('connecting');

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // reinicia la votación al cambiar de partido
  useEffect(() => {
    votes.current = new Map();
    setTally({ a: 0, b: 0 });
    setRecent([]);
  }, [id]);

  // conexión anónima al chat de Twitch
  useEffect(() => {
    const recompute = () => {
      let a = 0;
      let b = 0;
      votes.current.forEach((v) => (v === 'A' ? a++ : b++));
      setTally({ a, b });
    };
    const conn = connectTwitchChat(
      channel,
      ({ user, text }) => {
        if (!openRef.current) return;
        const t = text.trim().toLowerCase();
        let v: Side | null = null;
        if (t === '!1' || t === '1' || t === '!a') v = 'A';
        else if (t === '!2' || t === '2' || t === '!b') v = 'B';
        if (!v) return;
        if (votes.current.get(user) === v) return;
        votes.current.set(user, v);
        recompute();
        setRecent((r) => [{ user, side: v! }, ...r].slice(0, 7));
      },
      setStatus,
    );
    return () => conn.close();
  }, [channel, id]);

  const total = tally.a + tally.b;
  const pctA = total ? Math.round((tally.a / total) * 100) : 50;
  const pctB = total ? 100 - pctA : 50;

  const chatPick: Side | null = tally.a > tally.b ? 'A' : tally.b > tally.a ? 'B' : null;
  const winnerSide: Side | null =
    finished && match?.winnerId
      ? match.winnerId === match.teamHomeId
        ? 'A'
        : match.winnerId === match.teamAwayId
          ? 'B'
          : null
      : null;
  const chatRight = chatPick && winnerSide && chatPick === winnerSide;

  const statusText =
    status === 'open' ? 'Chat conectado' : status === 'connecting' ? 'Conectando al chat…' : 'Chat desconectado';

  return (
    <div className="ov-root flex flex-col justify-end" style={{ padding: 'clamp(24px,4vw,64px)' }}>
      <span className="ov-slash thin" style={{ top: '10%', left: '-4%', width: '20%' }} />

      <div className="ov-panel p-[clamp(20px,2.4vw,40px)] ov-in">
        {/* encabezado */}
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-4">
            <OverlayMark />
            <span className="font-display font-black italic uppercase tracking-tight text-[clamp(18px,2vw,30px)] leading-none">
              ¿Quién gana?
            </span>
          </div>
          <div className="flex items-center gap-3">
            {open ? (
              <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-ignite">
                <span className="ov-live-dot" /> Votación abierta
              </span>
            ) : (
              <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute">
                {finished ? 'Resultado' : 'Votación cerrada'}
              </span>
            )}
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute border-l border-line pl-3">
              {statusText}
            </span>
          </div>
        </div>

        {/* opciones */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[clamp(12px,2vw,32px)] mb-4">
          <Option side="A" team={home} cmd="!1" pct={pctA} votes={tally.a} highlight={winnerSide === 'A'} />
          <span className="font-display font-black italic text-ignite text-[clamp(20px,2.4vw,34px)]">VS</span>
          <Option side="B" team={away} cmd="!2" pct={pctB} votes={tally.b} right highlight={winnerSide === 'B'} />
        </div>

        {/* barra de votación */}
        <div className="ov-vote-bar">
          <div
            className="ov-vote-fill ov-vote-a px-4 font-display font-black italic tabular-nums text-[clamp(16px,1.8vw,24px)]"
            style={{ flexGrow: Math.max(total ? pctA : 50, 0.001) }}
          >
            {total > 0 && `${pctA}%`}
          </div>
          <div
            className="ov-vote-fill ov-vote-b px-4 justify-end font-display font-black italic tabular-nums text-[clamp(16px,1.8vw,24px)]"
            style={{ flexGrow: Math.max(total ? pctB : 50, 0.001) }}
          >
            {total > 0 && `${pctB}%`}
          </div>
        </div>

        {/* pie: instrucción + votantes recientes */}
        <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
          <div className="font-mono text-[clamp(11px,1.2vw,14px)] tracking-[0.14em] uppercase text-mute">
            Vota en el chat:{' '}
            <span className="text-ignite">!1</span> = {home?.name || 'Local'} ·{' '}
            <span className="text-ignite">!2</span> = {away?.name || 'Visita'}
            <span className="text-mute"> · {total} votos</span>
          </div>

          <div className="flex items-center gap-2 min-h-[24px]">
            {recent.length === 0 ? (
              <span className="font-mono text-[11px] text-mute tracking-[0.16em] uppercase">
                {open ? 'Esperando votos…' : '—'}
              </span>
            ) : (
              recent.slice(0, 5).map((v, i) => (
                <span
                  key={`${v.user}-${i}`}
                  className="ov-voter font-mono text-[11px] tracking-[0.06em] px-2 py-1 rounded border border-line bg-void"
                >
                  <span className={v.side === 'A' ? 'text-ignite' : 'text-mute'}>
                    {v.side === 'A' ? '①' : '②'}
                  </span>{' '}
                  <span className="text-ink">{v.user}</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* veredicto al terminar */}
        {finished && winnerSide && (
          <div className="mt-4 pt-4 border-t border-line-2 text-center font-mono text-[clamp(11px,1.3vw,15px)] tracking-[0.18em] uppercase ov-pop">
            <span className="text-mute">Ganó </span>
            <span className="text-ignite font-bold">
              {winnerSide === 'A' ? home?.name : away?.name}
            </span>
            {chatPick && (
              <span className="text-mute">
                {' '}· el chat {chatRight ? 'acertó ✓' : 'falló ✗'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Option({
  side,
  team,
  cmd,
  pct,
  votes,
  right,
  highlight,
}: {
  side: Side;
  team: { name: string; shieldUrl: string | null } | null;
  cmd: string;
  pct: number;
  votes: number;
  right?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 min-w-0 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <Crest team={team} size={64} />
      <div className="min-w-0">
        <div className={`flex items-center gap-2 ${right ? 'justify-end' : ''}`}>
          <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-ignite border border-ignite/50 rounded px-1.5 py-0.5">
            {cmd}
          </span>
          {highlight && <span className="font-mono text-[10px] uppercase text-ignite">ganador</span>}
        </div>
        <div className="font-display font-black italic uppercase tracking-tight text-[clamp(18px,2.2vw,34px)] leading-[0.95] truncate mt-1">
          {team?.name || (side === 'A' ? 'Local' : 'Visita')}
        </div>
        <div className="font-display font-black italic tabular-nums text-[clamp(20px,2.6vw,40px)] leading-none text-ignite mt-0.5">
          {pct}
          <span className="text-mute text-[0.5em] font-mono not-italic"> · {votes} votos</span>
        </div>
      </div>
    </div>
  );
}
