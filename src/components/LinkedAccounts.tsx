import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from './Toast';
import ConsoleIdHelp from './ConsoleIdHelp';
import type { LinkedPlatform, LinkStatus } from '../types';

const PLATFORM_LABEL: Record<LinkedPlatform, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  psn: 'PlayStation',
  xbox: 'Xbox',
  switch: 'Nintendo Switch',
};

/** Plataformas verificadas por OAuth (botón "Conectar"). Las demás = ID manual. */
const VERIFIED: LinkedPlatform[] = ['steam', 'epic'];
const isVerified = (p: LinkedPlatform) => VERIFIED.includes(p);

const CONSOLE_HINT: Partial<Record<LinkedPlatform, string>> = {
  psn: 'Tu Online ID de PSN',
  xbox: 'Tu Gamertag',
  switch: 'Tu nombre en RL (Switch)',
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

  const saveConsole = async (platform: LinkedPlatform, platformId: string) => {
    const id = platformId.trim();
    if (!id) return;
    setBusy(platform);
    try {
      await api.post(`/link/${platform}/console`, { platformId: id });
      toast.success(`${PLATFORM_LABEL[platform]} verificada`, 'Tu ID quedó registrado.');
      load();
    } catch (e: any) {
      toast.error('No se pudo guardar', e.response?.data?.message || undefined);
    } finally {
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
          Verifica tus cuentas para que tus estadísticas de los partidos privados se
          registren a tu nombre. Steam y Epic se verifican con un clic; en consola,
          verificar es escribir tu ID <b className="text-ink">exactamente</b> como
          aparece tu nombre en Rocket League.
        </p>
      )}

      {platforms.some((p) => !VERIFIED.includes(p)) && (
        <div className="mb-4">
          <ConsoleIdHelp />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {platforms.map((platform) => {
          const account = status.accounts.find((a) => a.platform === platform);
          return (
            <PlatformCard
              key={platform}
              platform={platform}
              account={account}
              busy={busy === platform}
              onConnect={() => connect(platform)}
              onSaveConsole={(id) => saveConsole(platform, id)}
              onUnlink={() => unlink(platform)}
            />
          );
        })}
      </div>
    </section>
  );
}

function PlatformCard({
  platform,
  account,
  busy,
  onConnect,
  onSaveConsole,
  onUnlink,
}: {
  platform: LinkedPlatform;
  account: LinkStatus['accounts'][number] | undefined;
  busy: boolean;
  onConnect: () => void;
  onSaveConsole: (id: string) => void;
  onUnlink: () => void;
}) {
  const oauth = isVerified(platform);
  const [value, setValue] = useState(account?.platformId ?? '');
  const [editing, setEditing] = useState(false);
  // En consola no hay OAuth: el ID que el jugador escribe ES su verificación.
  const showInput = !oauth && (!account || editing);

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display font-bold uppercase tracking-tight flex items-center gap-2">
            {PLATFORM_LABEL[platform]}
            {!oauth && (
              <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-mute border border-line rounded px-1 py-px">
                Consola
              </span>
            )}
          </div>
          {account ? (
            <div className="font-mono text-[11px] text-mute mt-1 truncate">
              {account.displayName || account.platformId}
              <span className="text-green"> · verificada</span>
            </div>
          ) : (
            <div className="font-mono text-[11px] text-ignite mt-1">Sin verificar</div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {account && !oauth && !editing && (
            <button
              type="button"
              onClick={() => {
                setValue(account.platformId);
                setEditing(true);
              }}
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute hover:text-ignite transition-colors"
            >
              Cambiar ID
            </button>
          )}
          {account ? (
            <button
              type="button"
              onClick={onUnlink}
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute hover:text-ignite transition-colors"
            >
              {oauth ? 'Desvincular' : 'Quitar'}
            </button>
          ) : oauth ? (
            <button
              type="button"
              disabled={busy}
              onClick={onConnect}
              className="font-mono text-[10px] tracking-[0.2em] uppercase border border-line rounded-sm px-3 py-2 hover:border-ignite hover:text-ignite transition-colors disabled:opacity-50"
            >
              {busy ? 'Abriendo…' : 'Verificar'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Consola: escribir (o corregir) el ID es la verificación. */}
      {showInput && (
        <div className="flex items-center gap-2">
          <input
            className="input flex-1 !py-2 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={CONSOLE_HINT[platform] || 'Tu ID'}
            onKeyDown={(e) => e.key === 'Enter' && onSaveConsole(value)}
          />
          <button
            type="button"
            disabled={busy || !value.trim()}
            onClick={() => {
              onSaveConsole(value);
              setEditing(false);
            }}
            className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase border border-line rounded-sm px-3 py-2 hover:border-ignite hover:text-ignite transition-colors disabled:opacity-50"
          >
            {busy ? '…' : 'Verificar'}
          </button>
        </div>
      )}
    </div>
  );
}
