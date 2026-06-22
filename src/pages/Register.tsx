import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fileBase } from '../lib/api';
import { useSettings } from '../lib/useSettings';
import { rankLabel } from '../lib/ranks';
import { TeamPicker } from '../components/TeamPicker';
import ConsoleIdHelp from '../components/ConsoleIdHelp';
import type { PresetTeam } from '../types';

interface PlayerData {
  epic: string;
  steam: string;
  psn: string;
  xbox: string;
  nswitch: string;
  rank: string;
  screenshot: string;
}
const emptyPlayer = (): PlayerData => ({
  epic: '',
  steam: '',
  psn: '',
  xbox: '',
  nswitch: '',
  rank: 'plat3',
  screenshot: '',
});

// La entidad de inscripción soporta hasta 5 jugadores (player1..player5).
const MAX_PLAYERS = 5;

const fileUrl = (u: string) => (u.startsWith('http') ? u : `${fileBase}${u}`);

const numberWord = (n: number) =>
  ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco'][n] ?? String(n);

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
  ranks,
}: {
  index: number;
  data: PlayerData;
  update: (d: Partial<PlayerData>) => void;
  substitute?: boolean;
  ranks: [string, string][];
}) {
  // Si el rango actual quedó fuera del rango permitido (admin lo cambió), lo
  // ajusta al primero disponible.
  useEffect(() => {
    if (ranks.length && !ranks.some(([k]) => k === data.rank)) {
      update({ rank: ranks[0][0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranks]);
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="font-display font-black italic uppercase tracking-tight text-xl">
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
      <div>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-2">
          ¿Juegas en consola? Añade tu ID — tal como aparece tu nombre en Rocket League
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">PlayStation (PSN ID)</label>
            <input className="input" value={data.psn} onChange={(e) => update({ psn: e.target.value })} placeholder="Online ID de PSN" />
          </div>
          <div>
            <label className="label">Xbox (Gamertag)</label>
            <input className="input" value={data.xbox} onChange={(e) => update({ xbox: e.target.value })} placeholder="Tu Gamertag" />
          </div>
          <div>
            <label className="label">Nintendo Switch</label>
            <input className="input" value={data.nswitch} onChange={(e) => update({ nswitch: e.target.value })} placeholder="Tu nombre en RL (Switch)" />
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Rango en Rocket League</label>
          <select className="input" value={data.rank} onChange={(e) => update({ rank: e.target.value })}>
            {ranks.map(([v, l]) => (
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
          required={!substitute}
        />
      </div>
    </div>
  );
}

/* ---------------- Página ---------------- */
export default function Register() {
  const settings = useSettings();
  // Titulares = jugadores por lado (1v1/2v2/3v3); + suplentes. Tope de 5 por
  // las columnas de la inscripción.
  const STARTERS = settings.playersPerSide;
  const TOTAL_PLAYERS = Math.min(MAX_PLAYERS, settings.playersPerSide + settings.substitutes);
  const SUBS = TOTAL_PLAYERS - STARTERS;
  const regOpen = settings.loading ? null : settings.registrationsOpen;

  const predefined = settings.predefinedTeamsMode;

  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState('');
  const [shieldUrl, setShieldUrl] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PresetTeam | null>(null);
  const [contactMethod, setContactMethod] = useState<'discord' | 'email'>('discord');
  const [contactValue, setContactValue] = useState('');
  const [players, setPlayers] = useState<PlayerData[]>(
    Array.from({ length: MAX_PLAYERS }, emptyPlayer),
  );
  const [captain, setCaptain] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Ajusta el array de jugadores al total requerido por el formato actual.
  useEffect(() => {
    setPlayers((prev) => {
      const next = prev.slice(0, TOTAL_PLAYERS);
      while (next.length < TOTAL_PLAYERS) next.push(emptyPlayer());
      return next;
    });
    setCaptain((c) => Math.min(c, STARTERS));
  }, [TOTAL_PLAYERS, STARTERS]);

  const updatePlayer = (i: number, d: Partial<PlayerData>) =>
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...d } : p)));

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!teamName.trim()) {
        setError(predefined ? 'Elige un equipo del catálogo.' : 'Ponle un nombre a tu equipo.');
        return false;
      }
      if (!contactValue.trim()) {
        setError(
          contactMethod === 'discord'
            ? 'Déjanos tu usuario de Discord para enviarte la respuesta y las credenciales.'
            : 'Déjanos un correo para enviarte la respuesta y las credenciales.',
        );
        return false;
      }
      if (contactMethod === 'email' && !/^\S+@\S+\.\S+$/.test(contactValue.trim())) {
        setError('Escribe un correo válido.');
        return false;
      }
    }
    if (step === 1) {
      // Titulares: obligatorios (usuario + captura). Los 3 (o los que indique el
      // formato) deben estar completos.
      const starters = players.slice(0, STARTERS);
      if (starters.some((p) => !p.epic && !p.steam)) {
        setError(`Cada titular necesita al menos un usuario (Epic o Steam). Faltan datos en los ${STARTERS} titulares.`);
        return false;
      }
      if (starters.some((p) => !p.screenshot)) {
        setError(`La captura de pantalla principal es obligatoria para los ${STARTERS} titulares.`);
        return false;
      }
      // Suplentes: opcionales. Pero si empiezas a llenar uno, debe quedar
      // completo (usuario + captura) para que sea válido.
      const subs = players.slice(STARTERS, TOTAL_PLAYERS);
      for (let i = 0; i < subs.length; i++) {
        const p = subs[i];
        const started = p.epic || p.steam || p.psn || p.xbox || p.nswitch || p.screenshot;
        if (!started) continue; // suplente vacío → se ignora
        if (!p.epic && !p.steam) {
          setError(`El suplente ${i + 1} necesita un usuario (Epic o Steam) o déjalo vacío.`);
          return false;
        }
        if (!p.screenshot) {
          setError(`Falta la captura del suplente ${i + 1}, o déjalo vacío si no lo vas a inscribir.`);
          return false;
        }
      }
      // Regla GC1: solo 1 Grand Champion 1 por equipo.
      const gc1 = players
        .slice(0, TOTAL_PLAYERS)
        .filter((p) => (p.epic || p.steam) && p.rank === 'gc1').length;
      if (gc1 > 1) {
        setError('Solo se permite 1 Grand Champion 1 (GC1) por equipo. Ajusta los rangos.');
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
      contactMethod,
      contactValue: contactValue.trim(),
      ...players.reduce(
        (acc, p, i) => ({
          ...acc,
          [`player${i + 1}Epic`]: p.epic,
          [`player${i + 1}Steam`]: p.steam,
          [`player${i + 1}Psn`]: p.psn,
          [`player${i + 1}Xbox`]: p.xbox,
          [`player${i + 1}Switch`]: p.nswitch,
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
          {settings.seasonLabel}
        </span>
        <h1 className="font-display font-black italic uppercase text-5xl md:text-7xl tracking-tight mt-5 leading-[0.9]">
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
        <h1 className="font-display font-black italic uppercase text-5xl md:text-7xl tracking-tight mt-5 leading-[0.9]">
          ¡Equipo<br />en órbita!
        </h1>
        <p className="font-display text-mute text-lg mt-6 max-w-[46ch] mx-auto leading-[1.5]">
          Recibimos la inscripción de <b className="text-ink">{teamName}</b>. El admin revisará las
          capturas y te enviará la respuesta junto con las credenciales de cada jugador
          {contactMethod === 'discord' ? ' por Discord' : ' por correo'} a{' '}
          <b className="text-ink">{contactValue}</b>.
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
      <span className="kicker">Únete · {settings.seasonLabel}</span>
      <h1 className="font-display font-black italic uppercase text-[clamp(40px,8vw,96px)] tracking-tight leading-[0.88] mt-3 mb-3">
        Inscribe<br />tu equipo
      </h1>
      <p className="font-display text-mute text-base max-w-[58ch] mb-10 leading-[1.6]">
        {numberWord(STARTERS)} {STARTERS === 1 ? 'titular' : 'titulares'} obligatorios
        {SUBS > 0 && (
          <>
            {' '}+ hasta {numberWord(SUBS)} {SUBS === 1 ? 'suplente' : 'suplentes'}{' '}
            <b className="text-ink">(opcionales)</b>
          </>
        )}
        , {predefined ? 'tu equipo' : 'un escudo'} y la captura de pantalla principal de cada titular. Formato{' '}
        <b className="text-ink">{settings.formatLabel}</b> · rango elegible:{' '}
        <b className="text-ink">{settings.rankRangeLabel}</b>.
      </p>

      {/* ¿sin equipo? → reclutamiento */}
      <div className="card p-4 mb-8 flex items-center justify-between gap-3 max-w-2xl">
        <span className="font-mono text-xs text-mute leading-[1.6]">
          ¿Todavía no tienes equipo o te falta gente? Encuéntralos o forma tu equipo en{' '}
          <b className="text-ink">Reclutamiento</b>.
        </span>
        <Link to="/reclutamiento" className="btn btn-ignite !py-2 shrink-0">
          Ir a reclutamiento
        </Link>
      </div>

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
              <div className="font-display font-black italic uppercase tracking-tight text-2xl">El equipo</div>
              {predefined ? (
                <div>
                  <label className="label">Elige tu equipo</label>
                  <p className="font-mono text-[11px] text-mute mt-1 mb-3 leading-[1.7]">
                    Selecciona uno de los equipos disponibles. Cada equipo solo puede ser tomado
                    por una inscripción.
                  </p>
                  <TeamPicker
                    value={selectedPreset?.slug ?? null}
                    onSelect={(p) => {
                      setSelectedPreset(p);
                      setTeamName(p.name);
                      setShieldUrl(p.logo ?? '');
                    }}
                  />
                </div>
              ) : (
                <>
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
                </>
              )}

              {/* Medio de contacto: por aquí llega la respuesta y las credenciales */}
              <div className="border-t border-line-2 pt-5 flex flex-col gap-4">
                <div>
                  <div className="font-display font-black italic uppercase tracking-tight text-lg">
                    ¿Cómo te contactamos?
                  </div>
                  <p className="font-mono text-[11px] text-mute mt-1.5 leading-[1.7]">
                    Aquí te enviaremos la respuesta de tu inscripción y las credenciales de
                    ingreso de cada jugador al torneo. Asegúrate de que sea un medio activo.
                  </p>
                </div>

                <div>
                  <label className="label">Medio de contacto <span className="text-ignite">*</span></label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {([['discord', 'Discord'], ['email', 'Correo']] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setContactMethod(v)}
                        className={`btn ${contactMethod === v ? 'btn-ignite' : ''}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">
                    {contactMethod === 'discord' ? 'Usuario de Discord' : 'Correo electrónico'}{' '}
                    <span className="text-ignite">*</span>
                  </label>
                  <input
                    className="input"
                    type={contactMethod === 'email' ? 'email' : 'text'}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    maxLength={150}
                    placeholder={contactMethod === 'discord' ? 'Ej. nova_boost' : 'tu@correo.com'}
                  />
                  <div className="font-mono text-[10px] text-mute mt-1.5">
                    Será el contacto del capitán para todo el torneo.
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              {settings.maxRank === 'gc1' && (
                <div className="font-mono text-[11px] text-ignite border border-ignite/40 rounded-md px-4 py-3 leading-[1.6]">
                  ⚠ Regla de rangos: solo se permite <b>1 Grand Champion 1 (GC1)</b> por equipo.
                  Si registras dos o más jugadores GC1, la inscripción será rechazada.
                </div>
              )}
              <ConsoleIdHelp />
              <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute">
                Titulares
              </div>
              {players.slice(0, STARTERS).map((p, i) => (
                <PlayerForm key={i} index={i} data={p} update={(d) => updatePlayer(i, d)} ranks={settings.allowedRanks} />
              ))}
              <div className="font-mono text-[11px] tracking-[0.25em] uppercase text-mute mt-2">
                Suplentes <span className="text-mute/70 normal-case tracking-normal">· opcionales</span>
              </div>
              {players.slice(STARTERS).map((p, i) => (
                <PlayerForm
                  key={STARTERS + i}
                  index={i}
                  data={p}
                  update={(d) => updatePlayer(STARTERS + i, d)}
                  substitute
                  ranks={settings.allowedRanks}
                />
              ))}
            </>
          )}

          {step === 2 && (
            <div className="card p-6 flex flex-col gap-6">
              <div className="font-display font-black italic uppercase tracking-tight text-2xl">Capitán y bases</div>
              <div>
                <label className="label">¿Quién es el capitán? (titulares)</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {Array.from({ length: STARTERS }, (_, i) => i + 1).map((n) => (
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
                  className="accent-[#EC571E] mt-0.5"
                />
                <span>
                  Confirmo que los datos son correctos, que cada jugador está dentro del rango permitido
                  y acepto las bases del torneo {settings.tournamentName}.
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
              <img src={shieldSrc} alt="" className="w-14 h-14 rounded-lg object-contain bg-void border border-line p-1" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-void border border-line grid place-items-center font-display font-black italic text-lg text-mute">
                {teamName ? teamName.slice(0, 2).toUpperCase() : '??'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display font-black italic uppercase text-lg tracking-tight truncate">
                {teamName || 'Tu equipo'}
              </div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">
                {selectedPreset ? selectedPreset.placementLabel : `${settings.formatLabel} · RL`}
              </div>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-line-2 border-t border-line-2">
            {players.slice(0, TOTAL_PLAYERS).map((p, i) => {
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
              <span>{predefined ? 'Equipo' : 'Escudo'}</span>
              <span className={shieldUrl ? 'text-green' : ''}>{shieldUrl ? '✓' : 'pendiente'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Contacto</span>
              <span className={`truncate ${contactValue ? 'text-green normal-case' : ''}`}>
                {contactValue ? `${contactMethod === 'discord' ? 'DC' : '@'} ${contactValue}` : 'pendiente'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Capturas titulares</span>
              <span className={players.slice(0, STARTERS).every((p) => p.screenshot) ? 'text-green' : 'text-ink'}>
                {players.slice(0, STARTERS).filter((p) => p.screenshot).length}/{STARTERS}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
