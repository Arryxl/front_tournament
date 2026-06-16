import { useState } from 'react';
import { api } from '../lib/api';
import { Section } from '../components/ui';

const RANKS = [
  ['plat3', 'Platino 3'],
  ['plat4', 'Platino 4'],
  ['dia1', 'Diamante 1'],
  ['dia2', 'Diamante 2'],
  ['dia3', 'Diamante 3'],
  ['champ1', 'Champion 1'],
  ['champ2', 'Champion 2'],
  ['champ3', 'Champion 3'],
];

interface PlayerData {
  epic: string;
  steam: string;
  rank: string;
  screenshot: string;
}

const emptyPlayer = (): PlayerData => ({ epic: '', steam: '', rank: 'plat3', screenshot: '' });

function UploadField({
  label,
  endpoint,
  value,
  onChange,
}: {
  label: string;
  endpoint: 'shield' | 'screenshot';
  value: string;
  onChange: (url: string) => void;
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
      <label className="label">{label}</label>
      <input
        type="file"
        accept="image/*"
        className="font-mono text-xs text-mute file:btn file:mr-3"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {busy && <span className="font-mono text-xs text-ignite ml-2">subiendo…</span>}
      {value && <span className="font-mono text-xs text-green ml-2">✓ listo</span>}
    </div>
  );
}

function PlayerForm({
  index,
  data,
  update,
}: {
  index: number;
  data: PlayerData;
  update: (d: Partial<PlayerData>) => void;
}) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="font-display font-extrabold uppercase tracking-tight text-xl">
        Jugador {index + 1}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Usuario Epic Games</label>
          <input className="input" value={data.epic} onChange={(e) => update({ epic: e.target.value })} />
        </div>
        <div>
          <label className="label">Usuario Steam (opcional)</label>
          <input className="input" value={data.steam} onChange={(e) => update({ steam: e.target.value })} />
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
          label="Captura de rango"
          endpoint="screenshot"
          value={data.screenshot}
          onChange={(url) => update({ screenshot: url })}
        />
      </div>
    </div>
  );
}

export default function Register() {
  const [teamName, setTeamName] = useState('');
  const [shieldUrl, setShieldUrl] = useState('');
  const [players, setPlayers] = useState<PlayerData[]>([emptyPlayer(), emptyPlayer(), emptyPlayer()]);
  const [captain, setCaptain] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updatePlayer = (i: number, d: Partial<PlayerData>) =>
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...d } : p)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!accepted) return setError('Debes aceptar las bases del torneo.');
    if (players.some((p) => !p.epic && !p.steam))
      return setError('Cada jugador necesita al menos un usuario (Epic o Steam).');
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

  if (done) {
    return (
      <div className="py-24 text-center">
        <span className="kicker">Recibido</span>
        <h1 className="font-display font-extrabold uppercase text-5xl tracking-tight mt-4">
          ¡Inscripción enviada!
        </h1>
        <p className="font-serif italic text-xl text-mute mt-4">
          El admin revisará tu equipo y las capturas de rango. Te contactarán con tus credenciales.
        </p>
      </div>
    );
  }

  return (
    <Section kicker="Únete" title="Inscribe tu equipo">
      <form onSubmit={submit} className="flex flex-col gap-6 max-w-3xl">
        <div className="card p-5 flex flex-col gap-4">
          <div className="font-display font-extrabold uppercase tracking-tight text-xl">Equipo</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre del equipo</label>
              <input
                className="input"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <UploadField label="Escudo del equipo" endpoint="shield" value={shieldUrl} onChange={setShieldUrl} />
          </div>
        </div>

        {players.map((p, i) => (
          <PlayerForm key={i} index={i} data={p} update={(d) => updatePlayer(i, d)} />
        ))}

        <div className="card p-5">
          <label className="label">¿Quién es el capitán?</label>
          <div className="flex gap-4 mt-2">
            {[1, 2, 3].map((n) => (
              <label key={n} className="flex items-center gap-2 font-mono text-sm cursor-pointer">
                <input
                  type="radio"
                  name="captain"
                  checked={captain === n}
                  onChange={() => setCaptain(n)}
                  className="accent-[#FF4D17]"
                />
                Jugador {n}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 font-mono text-xs text-mute cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="accent-[#FF4D17]" />
          Acepto las bases del torneo Gravity.
        </label>

        {error && <div className="font-mono text-xs text-ignite">{error}</div>}

        <button className="btn btn-ignite self-start" disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar inscripción'}
        </button>
      </form>
    </Section>
  );
}
