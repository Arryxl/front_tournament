import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import ReplayResolve from '../../components/admin/ReplayResolve';
import type { Replay, ReplayStatus } from '../../types';

const STATUS_META: Record<ReplayStatus, { label: string; cls: string }> = {
  imported: { label: 'Importado', cls: 'text-green border-green/40' },
  needs_review: { label: 'Revisión', cls: 'text-ignite border-ignite/50 bg-ignite/10' },
  processing: { label: 'Procesando', cls: 'text-cyan border-cyan/40' },
  failed: { label: 'Fallido', cls: 'text-ignite border-ignite/40' },
};

export default function AdminReplays() {
  const toast = useToast();
  const confirm = useConfirm();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = () =>
    api
      .get<Replay[]>('/replays')
      .then((r) => setReplays(r.data))
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  const reprocess = async (id: string) => {
    setBusy(id);
    try {
      await api.post(`/replays/${id}/reprocess`);
      toast.success('Replay reprocesado');
      load();
    } catch (err: any) {
      toast.error('No se pudo reprocesar', err.response?.data?.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Eliminar replay',
      body: 'Se borra el registro del replay (no revierte stats ya importadas). ¿Continuar?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/replays/${id}`);
      toast.success('Replay eliminado');
      load();
    } catch (err: any) {
      toast.error('No se pudo eliminar', err.response?.data?.message);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <span className="kicker">Ingesta</span>
      <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3 mb-6">
        Replays
      </h1>

      <div className="card divide-y divide-line-2">
        {replays.length === 0 && (
          <div className="p-4 font-mono text-xs text-mute">
            Aún no se han subido replays.
          </div>
        )}
        {replays.map((r) => {
          const meta = STATUS_META[r.status];
          return (
            <div key={r.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-sm border ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  <span className="font-display font-bold">
                    {r.match?.matchCode || 'sin partido'}
                  </span>
                  {r.status === 'imported' && r.homeScore != null && (
                    <span className="font-mono text-sm tabular-nums text-mute">
                      {r.homeScore}–{r.awayScore}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!!r.rawStats?.players?.length && (
                    <button
                      className="btn text-[10px] px-2.5 py-1.5"
                      onClick={() => setEditing(editing === r.id ? null : r.id)}
                    >
                      {editing === r.id ? 'Cerrar' : 'Corregir'}
                    </button>
                  )}
                  {(r.status === 'needs_review' || r.status === 'processing' || r.status === 'failed') && (
                    <button
                      className="btn text-[10px] px-2.5 py-1.5"
                      disabled={busy === r.id}
                      onClick={() => reprocess(r.id)}
                    >
                      {busy === r.id ? 'Reprocesando…' : 'Reprocesar'}
                    </button>
                  )}
                  <button
                    className="btn text-[10px] px-2.5 py-1.5"
                    onClick={() => remove(r.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="font-mono text-[10px] text-mute flex items-center gap-3 flex-wrap">
                <span>{new Date(r.createdAt).toLocaleString('es')}</span>
                {r.uploadedBy?.username && <span>· por {r.uploadedBy.username}</span>}
                {r.originalName && <span className="truncate">· {r.originalName}</span>}
              </div>
              {r.reviewReason && (
                <div className="font-mono text-[11px] text-ignite leading-snug">
                  {r.reviewReason}
                </div>
              )}
              {editing === r.id && (
                <ReplayResolve
                  replay={r}
                  onDone={() => {
                    setEditing(null);
                    load();
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
