import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useSettings } from '../../lib/useSettings';

export default function AdminDashboard() {
  const settings = useSettings();
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  // Estado legible del torneo a partir de la configuración guardada.
  const statePill = (on: boolean) =>
    `font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 rounded ${
      on ? 'bg-ignite text-void' : 'border border-line text-mute'
    }`;

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

      {/* Estado del torneo — solo lectura. Se edita en Configuración. */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-display font-black uppercase tracking-tight text-xl">Estado del torneo</h2>
        <Link to="/admin/settings" className="btn btn-ignite">
          Configurar torneo →
        </Link>
      </div>
      <div className="card p-6 mb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-2">Inscripciones</div>
            <span className={statePill(settings.registrationsOpen)}>
              {settings.registrationsOpen ? 'ABIERTAS' : 'CERRADAS'}
            </span>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-2">Torneo</div>
            <span className={statePill(settings.tournamentStarted)}>
              {settings.tournamentStarted ? 'EN CURSO' : 'SIN COMENZAR'}
            </span>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-2">Formato</div>
            <div className="font-display font-black uppercase tracking-tight text-2xl text-ink">
              {settings.formatLabel}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-2">Equipos · Grupos</div>
            <div className="font-display font-black uppercase tracking-tight text-2xl text-ink">
              {settings.teamCount} <span className="text-mute text-base">/ {settings.groups}g</span>
            </div>
          </div>
        </div>
        <div className="font-mono text-[10px] text-mute mt-5 leading-relaxed">
          {settings.matchesTotal} partidos esperados ({settings.formatLabel},{' '}
          {settings.playersPerSide}+{settings.substitutes} por equipo). Cambia estos valores en{' '}
          <Link to="/admin/settings" className="text-ignite hover:underline">Configuración</Link>.
        </div>
      </div>

      <h2 className="font-display font-black uppercase tracking-tight text-xl mb-4">Acciones rápidas</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="card p-5 lift flex flex-col gap-2 group">
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
