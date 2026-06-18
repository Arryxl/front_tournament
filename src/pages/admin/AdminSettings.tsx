import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import { useSettings } from '../../lib/useSettings';
import { expectedMatchCount, formatLabel, groupCountFor } from '../../lib/tournament';
import type { TournamentSettings } from '../../types';

/** Campos editables de la configuración del torneo (borrador local). */
interface Draft {
  registrationsOpen: boolean;
  tournamentStarted: boolean;
  playersPerSide: number;
  substitutes: number;
  teamCapacity: number;
  registrationDeadline: string | null;
}

const toDraft = (s: TournamentSettings): Draft => ({
  registrationsOpen: s.registrationsOpen,
  tournamentStarted: s.tournamentStarted,
  playersPerSide: s.playersPerSide,
  substitutes: s.substitutes,
  teamCapacity: s.teamCapacity,
  registrationDeadline: s.registrationDeadline,
});

/** ISO → valor para <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AdminSettings() {
  const toast = useToast();
  const confirm = useConfirm();
  const globalSettings = useSettings();
  const [saved, setSaved] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get('/settings')
      .then((r) => {
        const d = toDraft(r.data);
        setSaved(d);
        setDraft(d);
      })
      .catch(() => toast.error('No se pudo cargar', 'Revisa tu sesión e inténtalo de nuevo.'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  // Diferencias entre el borrador y lo guardado.
  const changedKeys = useMemo(() => {
    if (!draft || !saved) return [] as (keyof Draft)[];
    return (Object.keys(draft) as (keyof Draft)[]).filter((k) => draft[k] !== saved[k]);
  }, [draft, saved]);
  const dirty = changedKeys.length > 0;

  if (loading || !draft || !saved) return <Spinner />;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = async () => {
    if (!dirty) return;
    // El cambio de nº de equipos altera la estructura (grupos + llave).
    if (changedKeys.includes('teamCapacity')) {
      const ok = await confirm({
        title: `Cambiar a ${draft.teamCapacity} equipos`,
        body:
          `Pasará a ${groupCountFor(draft.teamCapacity)} grupos y ${expectedMatchCount(
            draft.teamCapacity,
          )} partidos.\n\n` +
          'Después de guardar, ve a «Partidos» y pulsa «Generar partidos» para recrear la estructura.',
        confirmLabel: 'Guardar cambio',
        danger: true,
      });
      if (!ok) return;
    }
    const patch: Partial<Draft> = {};
    for (const k of changedKeys) (patch as any)[k] = draft[k];

    setSaving(true);
    try {
      const r = await api.patch('/settings', patch);
      const next = toDraft(r.data);
      setSaved(next);
      setDraft(next);
      globalSettings.reload(); // propaga al resto de la app (dashboard, landing…)
      toast.success('Configuración guardada', `${changedKeys.length} cambio(s) aplicados en la base de datos.`);
    } catch (e: any) {
      toast.error('No se pudo guardar', e.response?.data?.message || 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setDraft(saved);
    toast.info('Cambios descartados', 'El borrador volvió al último estado guardado.');
  };

  return (
    <div className="max-w-[900px]">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="kicker">Administración</span>
          <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3">
            Configuración del torneo
          </h1>
        </div>
        {dirty && (
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite border border-ignite/40 rounded px-2.5 py-1 self-center">
            ● {changedKeys.length} cambio(s) sin guardar
          </span>
        )}
      </div>
      <p className="font-mono text-[11px] text-mute mb-8 max-w-[64ch] leading-relaxed">
        Estos ajustes definen cómo se comporta todo el sistema (landing, inscripción, grupos y
        llave). <b className="text-ink">Nada se guarda hasta que pulses «Guardar cambios»</b>: se
        escriben de una sola vez en la base de datos (tabla <span className="text-ignite">tournament_settings</span>).
      </p>

      {/* ===== Estado del torneo ===== */}
      <SectionTitle>Estado</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <ToggleRow
          label="Inscripciones"
          on={draft.registrationsOpen}
          onText="Abiertas — los equipos pueden registrarse"
          offText="Cerradas — no se aceptan nuevos equipos"
          changed={draft.registrationsOpen !== saved.registrationsOpen}
          onToggle={() => set('registrationsOpen', !draft.registrationsOpen)}
        />
        <ToggleRow
          label="Torneo"
          on={draft.tournamentStarted}
          onText="En curso — la fase de grupos arrancó"
          offText="Sin comenzar — todavía en pretemporada"
          changed={draft.tournamentStarted !== saved.tournamentStarted}
          onToggle={() => set('tournamentStarted', !draft.tournamentStarted)}
        />
        <div
          className={`card p-5 sm:col-span-2 ${
            draft.registrationDeadline !== saved.registrationDeadline ? 'border-ignite/50' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-display font-black uppercase tracking-tight text-lg">
              Cierre de inscripciones (countdown)
            </span>
            {draft.registrationDeadline !== saved.registrationDeadline && (
              <span className="font-mono text-[9px] text-ignite">●</span>
            )}
          </div>
          <div className="font-mono text-[11px] text-mute mt-1.5 mb-4 leading-snug">
            Alimenta el contador de la landing. Déjalo vacío para ocultar el contador.
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="datetime-local"
              className="input max-w-[260px]"
              value={toLocalInput(draft.registrationDeadline)}
              onChange={(e) =>
                set(
                  'registrationDeadline',
                  e.target.value ? new Date(e.target.value).toISOString() : null,
                )
              }
            />
            {draft.registrationDeadline && (
              <button className="btn" onClick={() => set('registrationDeadline', null)}>
                Quitar fecha
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Formato ===== */}
      <SectionTitle>Formato</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4 mb-2">
        <PickerRow
          label="Formato en cancha"
          hint="Jugadores por lado (titulares)."
          value={draft.playersPerSide}
          changed={draft.playersPerSide !== saved.playersPerSide}
          options={[
            { value: 1, label: '1v1' },
            { value: 2, label: '2v2' },
            { value: 3, label: '3v3' },
          ]}
          onPick={(v) => set('playersPerSide', v)}
        />
        <PickerRow
          label="Suplentes"
          hint="Suplentes por equipo (se suman a los titulares)."
          value={draft.substitutes}
          changed={draft.substitutes !== saved.substitutes}
          options={[
            { value: 0, label: '0' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
          ]}
          onPick={(v) => set('substitutes', v)}
        />
        <PickerRow
          label="Nº de equipos"
          hint="16 ⇒ 4 grupos (cuartos). 32 ⇒ 8 grupos (octavos)."
          value={draft.teamCapacity}
          changed={draft.teamCapacity !== saved.teamCapacity}
          options={[
            { value: 16, label: '16' },
            { value: 32, label: '32' },
          ]}
          onPick={(v) => set('teamCapacity', v)}
        />
        <div className="card p-5 bg-void/40">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-3">
            Resumen (borrador)
          </div>
          <ul className="font-mono text-xs text-mute space-y-1.5">
            <li>Formato: <b className="text-ink">{formatLabel(draft.playersPerSide)}</b></li>
            <li>Roster por equipo: <b className="text-ink">{draft.playersPerSide + draft.substitutes}</b> ({draft.playersPerSide}+{draft.substitutes})</li>
            <li>Grupos: <b className="text-ink">{groupCountFor(draft.teamCapacity)}</b></li>
            <li>Partidos totales: <b className="text-ignite">{expectedMatchCount(draft.teamCapacity)}</b></li>
          </ul>
        </div>
      </div>

      <p className="font-mono text-[10px] text-mute mt-4 mb-8 leading-relaxed max-w-[64ch]">
        Tras guardar un cambio de nº de equipos, ve a{' '}
        <Link to="/admin/matches" className="text-ignite hover:underline">Partidos</Link> y pulsa
        «Generar partidos» para recrear la estructura.
      </p>

      {/* ===== Barra de guardado ===== */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-void/85 backdrop-blur-md border-t border-line flex items-center gap-3 flex-wrap">
        <button className="btn btn-ignite" onClick={save} disabled={!dirty || saving}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button className="btn" onClick={discard} disabled={!dirty || saving}>
          Descartar
        </button>
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-mute ml-auto">
          {dirty ? `${changedKeys.length} cambio(s) pendientes` : 'Todo guardado'}
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="font-display font-black uppercase tracking-tight text-xl mb-4">{children}</h2>
  );
}

function ToggleRow({
  label,
  on,
  onText,
  offText,
  changed,
  onToggle,
}: {
  label: string;
  on: boolean;
  onText: string;
  offText: string;
  changed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`card p-5 flex items-center justify-between gap-4 ${
        changed ? 'border-ignite/50' : on ? 'border-ignite/30' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display font-black uppercase tracking-tight text-lg">{label}</span>
          <span
            className={`font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded ${
              on ? 'bg-ignite text-void' : 'border border-line text-mute'
            }`}
          >
            {on ? 'ON' : 'OFF'}
          </span>
          {changed && <span className="font-mono text-[9px] text-ignite">●</span>}
        </div>
        <div className="font-mono text-[11px] text-mute mt-2 leading-snug">{on ? onText : offText}</div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        className={`relative w-14 h-8 rounded-full shrink-0 transition-colors ${
          on ? 'bg-ignite' : 'bg-void-2 border border-line'
        }`}
      >
        <span
          className={`absolute top-1 w-6 h-6 rounded-full transition-all ${
            on ? 'left-7 bg-void' : 'left-1 bg-mute'
          }`}
        />
      </button>
    </div>
  );
}

function PickerRow({
  label,
  hint,
  value,
  options,
  changed,
  onPick,
}: {
  label: string;
  hint: string;
  value: number;
  options: { value: number; label: string }[];
  changed: boolean;
  onPick: (v: number) => void;
}) {
  return (
    <div className={`card p-5 ${changed ? 'border-ignite/50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="font-display font-black uppercase tracking-tight text-lg">{label}</span>
        {changed && <span className="font-mono text-[9px] text-ignite">●</span>}
      </div>
      <div className="font-mono text-[11px] text-mute mt-1.5 mb-4 leading-snug">{hint}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            className={`btn ${value === o.value ? 'btn-ignite' : ''}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
