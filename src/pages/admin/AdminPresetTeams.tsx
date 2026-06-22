import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { fileUrl } from '../../lib/overlay';
import { Spinner } from '../../components/ui';
import { UploadField } from '../../components/UploadField';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/Confirm';
import { useSettings } from '../../lib/useSettings';
import type { PresetTeam } from '../../types';

/* ---------------- Modal genérico ---------------- */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-void/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="card p-6 w-full max-w-[460px] max-h-[90vh] overflow-y-auto flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-display font-black italic uppercase tracking-tight text-2xl">{title}</div>
          <button className="font-mono text-mute hover:text-ink text-lg leading-none" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Editor (crear / editar) ---------------- */
function PresetEditor({
  preset,
  onClose,
  onSaved,
}: {
  preset: PresetTeam | null; // null = crear
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(preset?.name ?? '');
  const [region, setRegion] = useState(preset?.region ?? '');
  const [placementLabel, setPlacementLabel] = useState(preset?.placementLabel ?? '');
  const [logo, setLogo] = useState(preset?.logo ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Falta el nombre', 'Ponle un nombre al equipo.');
    setBusy(true);
    try {
      const body = { name: name.trim(), region: region.trim(), placementLabel: placementLabel.trim(), logo };
      if (preset) await api.patch(`/teams/presets/${preset.id}`, body);
      else await api.post('/teams/presets', body);
      toast.success(preset ? 'Equipo actualizado' : 'Equipo creado', name.trim());
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error('No se pudo guardar', e.response?.data?.message || 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={preset ? 'Editar equipo' : 'Nuevo equipo'} onClose={onClose}>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 grid place-items-center rounded-lg border border-line bg-white/[0.02]">
          {logo ? (
            <img src={fileUrl(logo)} alt="" className="max-h-[78%] max-w-[78%] object-contain" />
          ) : (
            <span className="font-display font-black italic text-mute text-xl">{(name || '??').slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1">
          <UploadField label="Escudo" endpoint="preset-team" value={logo} onChange={setLogo} />
          <p className="font-mono text-[10px] text-mute mt-2 leading-[1.6]">PNG con fondo transparente. Se centra sin estirar.</p>
        </div>
      </div>

      <div>
        <label className="label">Nombre <span className="text-ignite">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Ej. Karmine Corp" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Región</label>
          <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} maxLength={80} placeholder="Ej. Europa" />
        </div>
        <div>
          <label className="label">Subtítulo</label>
          <input className="input" value={placementLabel} onChange={(e) => setPlacementLabel(e.target.value)} maxLength={120} placeholder="Ej. Europa · 1º" />
        </div>
      </div>

      <button className="btn btn-ignite" disabled={busy} onClick={save}>
        {busy ? 'Guardando…' : preset ? 'Guardar cambios' : 'Crear equipo'}
      </button>
    </Modal>
  );
}

/* ---------------- Página ---------------- */
export default function AdminPresetTeams() {
  const toast = useToast();
  const confirm = useConfirm();
  const settings = useSettings();
  const [presets, setPresets] = useState<PresetTeam[] | null>(null);
  const [editing, setEditing] = useState<PresetTeam | null | undefined>(undefined); // undefined = cerrado, null = crear

  const load = () => {
    api
      .get<PresetTeam[]>('/teams/presets')
      .then((r) => setPresets(r.data))
      .catch(() => toast.error('No se pudo cargar', 'Revisa tu sesión.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const remove = async (p: PresetTeam) => {
    if (p.taken) return toast.error('No se puede eliminar', 'Este equipo ya fue tomado por una inscripción.');
    const ok = await confirm({ title: `Eliminar ${p.name}`, body: 'Se quitará del catálogo de equipos disponibles.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await api.delete(`/teams/presets/${p.id}`);
      toast.success('Equipo eliminado', p.name);
      load();
    } catch (e: any) {
      toast.error('No se pudo eliminar', e.response?.data?.message || 'Inténtalo de nuevo.');
    }
  };

  if (!presets) return <Spinner />;

  return (
    <div className="max-w-[900px]">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="kicker">Administración</span>
          <h1 className="font-display font-black italic uppercase text-4xl tracking-tight mt-3">
            Equipos predefinidos
          </h1>
        </div>
        <button className="btn btn-ignite self-center" onClick={() => setEditing(null)}>+ Nuevo equipo</button>
      </div>
      <p className="font-mono text-[11px] text-mute mb-6 max-w-[64ch] leading-relaxed">
        Catálogo que ven los capitanes al inscribirse cuando el{' '}
        <Link to="/admin/settings" className="text-ignite">modo equipos predefinidos</Link> está activo
        {settings.predefinedTeamsMode ? ' (ahora ACTIVO)' : ' (ahora inactivo)'}. No tienen por qué ser los de la RLCS:
        edita, añade o elimina los que quieras. Los marcados «tomado» ya fueron reclamados y no se pueden borrar.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {presets.map((p) => (
          <div key={p.id} className="card p-3 flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 grid place-items-center rounded-md border border-line bg-white/[0.02]">
              {p.logo ? (
                <img src={fileUrl(p.logo)} alt={p.name} className="max-h-[80%] max-w-[80%] object-contain" />
              ) : (
                <span className="font-display font-black italic text-mute">{p.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-black italic uppercase tracking-tight truncate flex items-center gap-2">
                {p.name}
                {p.taken && (
                  <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-mute border border-line rounded px-1 py-px">Tomado</span>
                )}
              </div>
              <div className="font-mono text-[10px] text-mute truncate">{p.placementLabel || p.region || '—'}</div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button className="btn !py-1 !px-3 text-xs" onClick={() => setEditing(p)}>Editar</button>
              <button
                className={`btn !py-1 !px-3 text-xs ${p.taken ? 'opacity-40 cursor-not-allowed' : 'hover:border-ignite hover:text-ignite'}`}
                onClick={() => remove(p)}
                disabled={p.taken}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing !== undefined && (
        <PresetEditor preset={editing} onClose={() => setEditing(undefined)} onSaved={load} />
      )}
    </div>
  );
}
