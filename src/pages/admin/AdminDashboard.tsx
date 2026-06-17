import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import type { TournamentSettings } from '../../types';

export default function AdminDashboard() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TournamentSettings | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadSettings = () =>
    api
      .get('/settings')
      .then((r) => setSettings(r.data))
      .catch(() => {});

  const toggle = async (key: 'registrationsOpen' | 'tournamentStarted', value: boolean) => {
    setSavingKey(key);
    try {
      const r = await api.patch('/settings', { [key]: value });
      setSettings(r.data);
    } finally {
      setSavingKey(null);
    }
  };

  useEffect(() => {
    loadSettings();
    Promise.all([
      api.get('/teams'),
      api.get('/matches'),
      api.get('/users'),
      api.get('/teams/registrations?status=pending'),
    ])
      .then(([t, m, u, r]) => {
        const today = new Date().toISOString().slice(0, 10);
        const matches = m.data as any[];
        setData({
          teams: t.data.filter((x: any) => x.status === 'approved').length,
          matches: matches.length,
          played: matches.filter((x) => x.status === 'finished').length,
          live: matches.filter((x) => x.status === 'live').length,
          today: matches.filter((x) => x.scheduledAt?.slice(0, 10) === today).length,
          predsOpen: matches.filter((x) => x.predictionsOpen).length,
          users: u.data.length,
          pending: r.data.length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const cards = [
    { label: 'Equipos', value: data.teams },
    { label: 'Usuarios', value: data.users },
    { label: 'Partidos', value: data.matches },
    { label: 'Jugados', value: data.played },
    { label: 'En vivo', value: data.live, hot: data.live > 0 },
    { label: 'Partidos hoy', value: data.today, hot: data.today > 0 },
    { label: 'Predicciones abiertas', value: data.predsOpen },
    { label: 'Inscripciones pendientes', value: data.pending, alert: data.pending > 0 },
  ];

  const actions = [
    { to: '/admin/registrations', label: 'Revisar inscripciones', hint: 'Aprobar / rechazar equipos' },
    { to: '/admin/matches', label: 'Cargar resultados', hint: 'Marcadores + en vivo' },
    { to: '/admin/stats', label: 'Cargar estadísticas', hint: 'Goles, asistencias, MVP' },
    { to: '/admin/predictions', label: 'Abrir predicciones', hint: 'Ventanas por partido' },
  ];

  return (
    <div>
      <span className="kicker">Administración</span>
      <h1 className="font-display font-black uppercase text-4xl tracking-tight mt-3 mb-8">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`card p-5 ${c.alert ? 'border-ignite/50' : ''} ${c.hot ? 'border-cyan/40' : ''}`}
          >
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute">{c.label}</div>
            <div
              className={`stat-num text-4xl mt-2 ${c.alert ? 'text-ignite' : ''} ${c.hot ? 'text-cyan' : ''}`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Estado del torneo — se propaga por todo el sistema (landing, llave, etc.) */}
      <h2 className="font-display font-black uppercase tracking-tight text-xl mb-4">Estado del torneo</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <StateToggle
          label="Inscripciones"
          on={!!settings?.registrationsOpen}
          onText="Abiertas — los equipos pueden registrarse"
          offText="Cerradas — no se aceptan nuevos equipos"
          busy={savingKey === 'registrationsOpen'}
          disabled={!settings}
          onToggle={() => toggle('registrationsOpen', !settings?.registrationsOpen)}
        />
        <StateToggle
          label="Torneo"
          on={!!settings?.tournamentStarted}
          onText="En curso — la fase de grupos arrancó"
          offText="Sin comenzar — todavía en pretemporada"
          busy={savingKey === 'tournamentStarted'}
          disabled={!settings}
          onToggle={() => toggle('tournamentStarted', !settings?.tournamentStarted)}
        />
      </div>

      <h2 className="font-display font-black uppercase tracking-tight text-xl mb-4">Acciones rápidas</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="card p-5 lift flex flex-col gap-2 group"
          >
            <span className="font-display font-bold text-base group-hover:text-ignite transition-colors">
              {a.label}
            </span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-mute">{a.hint}</span>
            <span className="font-mono text-ignite text-xs mt-2">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StateToggle({
  label,
  on,
  onText,
  offText,
  busy,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  onText: string;
  offText: string;
  busy: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`card p-5 flex items-center justify-between gap-4 ${on ? 'border-ignite/40' : ''}`}>
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
        </div>
        <div className="font-mono text-[11px] text-mute mt-2 leading-snug">{on ? onText : offText}</div>
      </div>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={onToggle}
        aria-pressed={on}
        className={`relative w-14 h-8 rounded-full shrink-0 transition-colors disabled:opacity-40 ${
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
