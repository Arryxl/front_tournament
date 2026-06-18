import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from './Toast';
import type { LinkedPlatform, LinkStatus } from '../types';

const PLATFORM_LABEL: Record<LinkedPlatform, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
};

/**
 * Vinculación de cuentas de plataforma (Steam/Epic) verificadas por OAuth.
 * El ID verificado es el ancla para asociar las estadísticas de los replays a
 * cada jugador, así que se pide en cuanto el jugador entra al sistema.
 */
export default function LinkedAccounts() {
  const toast = useToast();
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<LinkedPlatform | null>(null);

  const load = () =>
    api
      .get<LinkStatus>('/link/me')
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Resultado del callback: la API redirige a /me?link=...&status=ok|error.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const link = params.get('link') as LinkedPlatform | null;
    const result = params.get('status');
    if (!link || !result) return;
    if (result === 'ok') {
      toast.success(`${PLATFORM_LABEL[link] ?? link} vinculada`, 'Tu cuenta quedó verificada.');
    } else {
      toast.error(
        `No se pudo vincular ${PLATFORM_LABEL[link] ?? link}`,
        params.get('reason') || undefined,
      );
    }
    // Limpiar la query para no repetir el toast al refrescar.
    window.history.replaceState({}, '', window.location.pathname);
  }, [toast]);

  const connect = async (platform: LinkedPlatform) => {
    setBusy(platform);
    try {
      const { data } = await api.get<{ url: string }>(`/link/${platform}/start`);
      window.location.href = data.url;
    } catch {
      toast.error('No se pudo iniciar la vinculación');
      setBusy(null);
    }
  };

  const unlink = async (platform: LinkedPlatform) => {
    try {
      await api.delete(`/link/${platform}`);
      toast.info(`${PLATFORM_LABEL[platform]} desvinculada`);
      load();
    } catch {
      toast.error('No se pudo desvincular');
    }
  };

  if (loading || !status || !status.isPlayer) return null;

  // Plataformas a mostrar: las esperadas según la inscripción + las ya vinculadas.
  const platforms = Array.from(
    new Set<LinkedPlatform>([
      ...status.expected,
      ...status.accounts.map((a) => a.platform),
    ]),
  );
  if (platforms.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl">
          Cuentas de juego
        </h2>
        {status.complete ? (
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-green border border-green/40 rounded-sm px-2.5 py-1">
            Verificadas ✓
          </span>
        ) : (
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite border border-ignite/50 bg-ignite/10 rounded-sm px-2.5 py-1">
            Acción requerida
          </span>
        )}
      </div>

      {!status.complete && (
        <p className="font-mono text-xs text-mute mb-4 leading-relaxed">
          Conecta tu cuenta para que tus estadísticas de los partidos privados se
          registren a tu nombre. La verificación es obligatoria antes de jugar.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {platforms.map((platform) => {
          const account = status.accounts.find((a) => a.platform === platform);
          return (
            <div key={platform} className="card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display font-bold uppercase tracking-tight">
                  {PLATFORM_LABEL[platform]}
                </div>
                {account ? (
                  <div className="font-mono text-[11px] text-mute mt-1 truncate">
                    {account.displayName || account.platformId}
                  </div>
                ) : (
                  <div className="font-mono text-[11px] text-ignite mt-1">
                    Sin vincular
                  </div>
                )}
              </div>
              {account ? (
                <button
                  type="button"
                  onClick={() => unlink(platform)}
                  className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase text-mute hover:text-ignite transition-colors"
                >
                  Desvincular
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy === platform}
                  onClick={() => connect(platform)}
                  className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase border border-line rounded-sm px-3 py-2 hover:border-ignite hover:text-ignite transition-colors disabled:opacity-50"
                >
                  {busy === platform ? 'Abriendo…' : 'Conectar'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
