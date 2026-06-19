import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { UploadField } from './UploadField';
import { RANKS, POSITIONS } from '../lib/ranks';
import type { PlayerProfile } from '../types';

const isComplete = (p: PlayerProfile | null) =>
  !!(p && (p.epicUsername || p.steamUsername) && p.rank && p.screenshotUrl);

/**
 * Tarjeta "Perfil de jugador": los datos de juego (Epic/Steam, rango, captura)
 * que el reclutamiento usa como fuente única. Debe estar completo para
 * publicar ficha, postularse o crear equipo.
 */
export default function PlayerProfileCard({
  onSaved,
}: {
  onSaved?: (p: PlayerProfile) => void;
}) {
  const [epic, setEpic] = useState('');
  const [steam, setSteam] = useState('');
  const [rank, setRank] = useState('plat3');
  const [position, setPosition] = useState('flex');
  const [region, setRegion] = useState('');
  const [availability, setAvailability] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/recruitment/profile')
      .then((r) => {
        const p: PlayerProfile | null = r.data;
        if (p) {
          setEpic(p.epicUsername || '');
          setSteam(p.steamUsername || '');
          setRank(p.rank || 'plat3');
          setPosition(p.position || 'flex');
          setRegion(p.region || '');
          setAvailability(p.availability || '');
          setScreenshot(p.screenshotUrl || '');
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const save = async () => {
    setErr('');
    setMsg('');
    if (!epic && !steam) return setErr('Indica tu usuario de Epic o Steam.');
    if (!screenshot) return setErr('Sube la captura de tu rango.');
    setBusy(true);
    try {
      const { data } = await api.put('/recruitment/profile', {
        epicUsername: epic || undefined,
        steamUsername: steam || undefined,
        rank,
        screenshotUrl: screenshot,
        position,
        region: region || undefined,
        availability: availability || undefined,
      });
      setMsg('Perfil guardado.');
      onSaved?.(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'No se pudo guardar el perfil.');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;

  const complete = isComplete({
    userId: '',
    epicUsername: epic || null,
    steamUsername: steam || null,
    rank,
    screenshotUrl: screenshot || null,
    position: null,
    region: null,
    availability: null,
  });

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl">
          Perfil de jugador
        </h2>
        <span
          className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-sm border ${
            complete ? 'text-green border-green/40' : 'text-ignite border-ignite/40'
          }`}
        >
          {complete ? 'Completo' : 'Incompleto'}
        </span>
      </div>
      <p className="font-mono text-[11px] text-mute mb-4 leading-[1.7]">
        Estos datos se usan automáticamente al publicarte, postularte o formar equipo.
        Completa Epic/Steam, rango y captura para poder reclutar.
      </p>

      <div className="card p-5 flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Usuario Epic Games</label>
            <input className="input" value={epic} onChange={(e) => setEpic(e.target.value)} placeholder="Tu Epic ID" />
          </div>
          <div>
            <label className="label">Usuario Steam (opcional)</label>
            <input className="input" value={steam} onChange={(e) => setSteam(e.target.value)} placeholder="Tu Steam" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Rango <span className="text-ignite">*</span></label>
            <select className="input" value={rank} onChange={(e) => setRank(e.target.value)}>
              {RANKS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Posición preferida</label>
            <select className="input" value={position} onChange={(e) => setPosition(e.target.value)}>
              {POSITIONS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Región / horario</label>
            <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ej. LATAM, UTC-5" />
          </div>
          <div>
            <label className="label">Disponibilidad</label>
            <input className="input" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Ej. noches y fines de semana" />
          </div>
        </div>
        <UploadField
          label="Captura del rango"
          endpoint="screenshot"
          value={screenshot}
          onChange={setScreenshot}
          thumb
          required
        />

        {err && <div className="font-mono text-xs text-ignite">{err}</div>}
        {msg && <div className="font-mono text-xs text-green">{msg}</div>}

        <button type="button" className="btn btn-ignite self-start" onClick={save} disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar perfil'}
        </button>
      </div>
    </section>
  );
}
