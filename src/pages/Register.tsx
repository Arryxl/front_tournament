import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fileBase } from '../lib/api';

// Rango elegible: Platino 3 → Champion 3 (sin Platino 4).
const RANKS = [
  ['plat3', 'Platino 3'],
  ['dia1', 'Diamante 1'],
  ['dia2', 'Diamante 2'],
  ['dia3', 'Diamante 3'],
  ['champ1', 'Champion 1'],
  ['champ2', 'Champion 2'],
  ['champ3', 'Champion 3'],
];
const rankLabel = (v: string) => RANKS.find(([k]) => k === v)?.[1] || v;

interface PlayerData {
  epic: string;
  steam: string;
  rank: string;
  screenshot: string;
}
const emptyPlayer = (): PlayerData => ({ epic: '', steam: '', rank: 'plat3', screenshot: '' });

// 3 titulares + 2 suplentes (mismos requisitos).
const STARTERS = 3;
const TOTAL_PLAYERS = 5;

const fileUrl = (u: string) => (u.startsWith('http') ? u : `${fileBase}${u}`);

const STEPS = ['Equipo', 'Jugadores', 'Confirmar'];

/* ---------------- Upload con preview ---------------- */
function UploadField({
  label,
  endpoint,
  value,
  onChange,
  thumb,
  required,
}: {
  label: string;
  endpoint: 'shield' | 'screenshot';
  value: string;
  onChange: (url: string) => void;
  thumb?: boolean;
  required?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post(`/uploads/${endpoint}`, fd);
      onChange(data.url);
    } catch {
      alert('Error al subir la imagen');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-ignite">*</span>}
      </label>
      <div className="flex items-center gap-3">
        {thumb && value && (
          <img src={fileUrl(value)} alt="" className="w-12 h-12 rounded-md object-cover border border-line" />
        )}
        <label className="btn cursor-pointer">
          {value ? 'Cambiar' : 'Subir imagen'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
        {busy && <span className="font-mono text-xs text-ignite">subiendo…</span>}
        {value && !busy && <span className="font-mono text-xs text-green">✓ listo</span>}
        {!value && !busy && required && (
          <span className="font-mono text-xs text-mute">obligatoria</span>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tarjeta de jugador ---------------- */
function PlayerForm({
  index,
  data,
  update,
  substitute,
}: {
  index: number;
  data: PlayerData;
  update: (d: Partial<PlayerData>) => void;
  substitute?: boolean;
}) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="font-display font-black uppercase tracking-tight text-xl">
          {substitute ? 'Suplente' : 'Jugador'} <span className="text-ignite">{index + 1}</span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
          {substitute ? 'Suplente' : 'Titular'} · {rankLabel(data.rank)}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Usuario Epic Games</label>
          <input className="input" value={data.epic} onChange={(e) => update({ epic: e.target.value })} placeholder="Tu Epic ID" />
        </div>
        <div>
          <label className="label">Usuario Steam (opcional)</label>
          <input className="input" value={data.steam} onChange={(e) => update({ steam: e.target.value })} placeholder="Tu Steam" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Rango en Rocket League</label>
          <select className="input" value={data.rank} onChange={(e) => update({ rank: e.target.value })}>
            {RANKS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <UploadField
          label="Captura de pantalla principal (nivel y usuario)"
          endpoint="screenshot"
          value={data.screenshot}
          onChange={(url) => update({ screenshot: url })}
          thumb
          required
        />
      </div>
    </div>
  );
}

/* ---------------- Página ---------------- */
export default function Register() {
  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [shieldUrl, setShieldUrl] = useState('');
  const [players, setPlayers] = useState<PlayerData[]>(
    Array.from({ length: TOTAL_PLAYERS }, emptyPlayer),
  );
  const [captain, setCaptain] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [regOpen, setRegOpen] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .get('/settings')
      .then((r) => setRegOpen(!!r.data?.registrationsOpen))
      .catch(() => setRegOpen(true)); // ante la duda, no bloqueamos
  }, []);

  const updatePlayer = (i: number, d: Partial<PlayerData>) =>
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...d } : p)));

  const validateStep = () => {
    setError('');
    if (step === 0 && !teamName.trim()) {
      setError('Ponle un nombre a tu equipo.');
      return false;
    }
    if (step === 1) {
      if (players.some((p) => !p.epic && !p.steam)) {
        setError('Cada jugador (titulares y suplentes) necesita al menos un usuario (Epic o Steam).');
        return false;
      }
      if (players.some((p) => !p.screenshot)) {
        setError('La captura de pantalla principal es obligatoria para los 5 jugadores.');
        return false;
      }
    }
    return true;
  };

  const next = () => validateStep() && setStep((s) => Math.min(2, s + 1));
  const back = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = async () => {
    setError('');
    if (!accepted) return setError('Debes aceptar las bases del torneo.');
    setBusy(true);
    const payload = {
      teamName,
      shieldUrl,
      captainPlayer: captain,
      ...players.reduce(
        (acc, p, i) => ({
          ...acc,
          [`player${i + 1}Epic`]: p.epic,
          [`player${i + 1}Steam`]: p.steam,
          [`player${i + 1}Rank`]: p.rank,
          [`player${i + 1}Screenshot`]: p.screenshot,
        }),
        {},
      ),
    };
    try {
      await api.post('/teams/register', payload);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al enviar la inscripción.');
    } finally {
      setBusy(false);
    }
  };

  /* ----- inscripciones cerradas ----- */
  if (regOpen === false && !done) {
    return (
      <div className="max-w-[760px] mx-auto px-[var(--pad)] py-24 text-center">
        <div className="cover-halo" />
        <span className="kicker justify-center" style={{ display: 'inline-flex' }}>
          Temporada 01
        </span>
        <h1 className="font-display font-black uppercase text-5xl md:text-7xl tracking-tight mt-5 leading-[0.9]">
          Inscripciones<br />cerradas
        </h1>
        <p className="font-display text-mute text-lg mt-6 max-w-[46ch] mx-auto leading-[1.5]">
          El registro de equipos está cerrado por ahora. Sigue la competencia en la llave y vuelve
          para la próxima temporada.
        </p>
        <div className="flex justify-center gap-3 mt-10">
          <Link to="/" className="btn">Volver al inicio</Link>
          <Link to="/bracket" className="btn btn-ignite">Ver la llave</Link>
        </div>
      </div>
    );
  }

  /* ----- pantalla de éxito ----- */
  if (done) {
    return (
      <div className="max-w-[760px] mx-auto px-[var(--pad)] py-24 text-center">
        <div className="cover-halo" />
        <span className="kicker justify-center" style={{ display: 'inline-flex' }}>
          Recibido
        </span>
        <h1 className="font-display font-black uppercase text-5xl md:text-7xl tracking-tight mt-5 leading-[0.9]">
          ¡Equipo<br />en órbita!
        </h1>
        <p className="font-display text-mute text-lg mt-6 max-w-[46ch] mx-auto leading-[1.5]">
          Recibimos la inscripción de <b className="text-ink">{teamName}</b>. El admin revisará las
          capturas y te enviará las credenciales de cada jugador por Discord.
        </p>
        <div className="flex justify-center gap-3 mt-10">
          <Link to="/" className="btn">Volver al inicio</Link>
          <Link to="/bracket" className="btn btn-ignite">Ver la llave</Link>
        </div>
      </div>
    );
  }

  const shieldSrc = shieldUrl ? fileUrl(shieldUrl) : null;

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      {/* encabezado */}
      <span className="kicker">Únete · Temporada 01</span>
      <h1 className="font-display font-black uppercase text-[clamp(40px,8vw,96px)] tracking-tight leading-[0.88] mt-3 mb-3">
        Inscribe<br />tu equipo
      </h1>
      <p className="font-display text-mute text-base max-w-[58ch] mb-10 leading-[1.6]">
        Cinco jugadores (3 titulares + 2 suplentes), un escudo y la captura de pantalla principal de
        cada uno. Rango elegible: <b className="text-ink">Platino 3 a Champion 3</b>.
      </p>

      {/* stepper */}
      <div className="flex items-center gap-2 mb-10 max-w-2xl">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full grid place-items-center font-mono text-xs font-bold border transition-colors ${
                  i <= step ? 'bg-ignite text-void border-ignite' : 'text-mute border-line'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`font-mono text-[11px] tracking-[0.18em] uppercase ${
                  i <= step ? 'text-ink' : 'text-mute'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? 'bg-ignite' : 'bg-line'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* ----- columna de formulario ----- */}
        <div className="flex flex-col gap-6">
          {step === 0 && (
            <div className="card p-6 flex flex-col gap-5">
              <div className="font-display font-black uppercase tracking-tight text-2xl">El equipo</div>
              <div>
                <label className="label">Nombre del equipo</label>
                <input
                  className="input text-lg"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  maxLength={50}
                  placeholder="Ej. Nova Boost"
                  autoFocus
                />
                <div className="font-mono text-[10px] text-mute mt-1.5">{teamName.length}/50 · debe ser único</div>
              </div>
              <UploadField label="Escudo del equipo (opcional)" endpoint="shield" value={shieldUrl} onChange={setShieldUrl} thumb />
            </div>
          )}

          {step === 1 && (
            <>
              <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute">
                Titulares
              </div>
              {players.slice(0, STARTERS).map((p, i) => (
                <PlayerForm key={i} index={i} data={p} update={(d) => updatePlayer(i, d)} />
              ))}
              <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute mt-2">
                Suplentes
              </div>
              {players.slice(STARTERS).map((p, i) => (
                <PlayerForm
                  key={STARTERS + i}
                  index={i}
                  data={p}
                  update={(d) => updatePlayer(STARTERS + i, d)}
                  substitute
                />
              ))}
            </>
          )}

          {step === 2 && (
            <div className="card p-6 flex flex-col gap-6">
              <div className="font-display font-black uppercase tracking-tight text-2xl">Capitán y bases</div>
              <div>
                <label className="label">¿Quién es el capitán? (titulares)</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCaptain(n)}
                      className={`btn ${captain === n ? 'btn-ignite' : ''}`}
                    >
                      Jugador {n}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 font-mono text-xs text-mute cursor-pointer leading-[1.7]">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="accent-[#CCFF33] mt-0.5"
                />
                <span>
                  Confirmo que los datos son correctos, que cada jugador está dentro del rango permitido
                  y acepto las bases del torneo Gravity.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="font-mono text-xs text-ignite border border-ignite/40 rounded-md px-4 py-3">
              {error}
            </div>
          )}

          {/* navegación */}
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn" onClick={back} disabled={step === 0}>
              ← Atrás
            </button>
            {step < 2 ? (
              <button type="button" className="btn btn-ignite" onClick={next}>
                Siguiente →
              </button>
            ) : (
              <button type="button" className="btn btn-ignite" onClick={submit} disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar inscripción'}
              </button>
            )}
          </div>
        </div>

        {/* ----- resumen en vivo ----- */}
        <aside className="card p-6 lg:sticky lg:top-24">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-mute mb-4">Resumen</div>
          <div className="flex items-center gap-3 mb-5">
            {shieldSrc ? (
              <img src={shieldSrc} alt="" className="w-14 h-14 rounded-lg object-cover border border-line" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-void border border-line grid place-items-center font-display font-black text-lg text-mute">
                {teamName ? teamName.slice(0, 2).toUpperCase() : '??'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display font-black uppercase text-lg tracking-tight truncate">
                {teamName || 'Tu equipo'}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">3v3 · RL</div>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-line-2 border-t border-line-2">
            {players.map((p, i) => {
              const named = p.epic || p.steam;
              const sub = i >= STARTERS;
              return (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <span className={`font-display text-sm ${named ? '' : 'text-mute'}`}>
                    {captain === i + 1 && <span className="text-ignite">★ </span>}
                    {named || (sub ? `Suplente ${i - STARTERS + 1}` : `Jugador ${i + 1}`)}
                    {sub && <span className="font-mono text-[9px] text-mute"> · SUP</span>}
                  </span>
                  <span className="font-mono text-[10px] text-mute">{rankLabel(p.rank)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 font-mono text-[10px] tracking-[0.15em] uppercase text-mute leading-[2]">
            <div className="flex justify-between">
              <span>Escudo</span>
              <span className={shieldUrl ? 'text-green' : ''}>{shieldUrl ? '✓' : 'pendiente'}</span>
            </div>
            <div className="flex justify-between">
              <span>Capturas principales</span>
              <span className={players.every((p) => p.screenshot) ? 'text-green' : 'text-ink'}>
                {players.filter((p) => p.screenshot).length}/{TOTAL_PLAYERS}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
