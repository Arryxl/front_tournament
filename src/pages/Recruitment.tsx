import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, fileBase } from '../lib/api';
import { useAuth } from '../store/auth';
import { useSettings } from '../lib/useSettings';
import { Spinner } from '../components/ui';
import { UploadField } from '../components/UploadField';
import { TeamPicker } from '../components/TeamPicker';
import { RANKS, rankLabel, POSITIONS, positionLabel } from '../lib/ranks';
import type {
  PlayerProfile,
  PresetTeam,
  RecruitmentPost,
  RecruitmentType,
  Team,
  TeamDraft,
} from '../types';

const fileUrl = (u: string) => (u.startsWith('http') ? u : `${fileBase}${u}`);
const profileComplete = (p: PlayerProfile | null) =>
  !!(p && (p.epicUsername || p.steamUsername) && p.rank && p.screenshotUrl);

/* ---------------- Modal genérico ---------------- */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-void/80 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="card p-6 w-full max-w-[560px] max-h-[90vh] overflow-y-auto flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-display font-black italic uppercase tracking-tight text-2xl">{title}</div>
          <button type="button" onClick={onClose} className="text-mute hover:text-ignite text-lg leading-none px-1" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Página ---------------- */
export default function Recruitment() {
  const { user } = useAuth();
  const settings = useSettings();

  const [tab, setTab] = useState<RecruitmentType>('player_lft');
  const [rankFilter, setRankFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myDraft, setMyDraft] = useState<TeamDraft | null>(null);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadPosts = () => {
    setLoading(true);
    const params = new URLSearchParams({ type: tab });
    if (rankFilter) params.set('rank', rankFilter);
    if (posFilter) params.set('position', posFilter);
    api
      .get(`/recruitment?${params.toString()}`)
      .then((r) => setPosts(r.data))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(loadPosts, [tab, rankFilter, posFilter]);

  const loadMe = () => {
    if (!user) {
      setProfile(null);
      setMyTeam(null);
      setMyDraft(null);
      return;
    }
    api.get('/recruitment/profile').then((r) => setProfile(r.data)).catch(() => setProfile(null));
    api.get('/recruitment/drafts/mine').then((r) => setMyDraft(r.data?.asCaptain ?? null)).catch(() => setMyDraft(null));
    if (user.role === 'candidate' || user.role === 'admin') {
      api.get('/teams/mine').then((r) => setMyTeam(r.data)).catch(() => setMyTeam(null));
    } else {
      setMyTeam(null);
    }
  };

  useEffect(loadMe, [user]);

  const hasTeam = !!myTeam;
  const isCaptain = !!(myTeam && user && myTeam.captainId === user.id);
  const rosterCount = myTeam?.members?.length ?? 0;
  const hasVacancy = isCaptain && rosterCount < settings.playersPerTeam;
  const hasDraft = !!myDraft;
  const complete = profileComplete(profile);
  const committed = hasTeam || hasDraft;
  const regClosed = !settings.loading && !settings.registrationsOpen;

  const flash = (m: string) => {
    setMsg(m);
    setErr('');
    setTimeout(() => setMsg(''), 4500);
  };
  const flashErr = (e: any) => {
    setErr(e?.response?.data?.message || 'Algo salió mal');
    setMsg('');
    setTimeout(() => setErr(''), 5000);
  };

  const invitePlayer = async (post: RecruitmentPost) => {
    if (!myTeam) return;
    try {
      await api.post('/recruitment/requests', {
        teamId: myTeam.id,
        direction: 'team_to_player',
        applicantId: post.authorId,
        sourcePostId: post.id,
      });
      flash('Invitación enviada. El jugador debe aceptarla.');
    } catch (e) {
      flashErr(e);
    }
  };

  const applyToTeam = async (post: RecruitmentPost) => {
    if (!post.teamId) return;
    try {
      await api.post('/recruitment/requests', {
        teamId: post.teamId,
        direction: 'player_to_team',
        sourcePostId: post.id,
      });
      flash('Postulación enviada. El capitán la revisará.');
    } catch (e) {
      flashErr(e);
    }
  };

  const publishFicha = async (message: string) => {
    try {
      await api.post('/recruitment', { type: 'player_lft', message: message || undefined });
      setShowPublish(false);
      flash('Ficha publicada en el tablón.');
      loadPosts();
    } catch (e) {
      flashErr(e);
    }
  };

  const createTeam = async (
    teamName: string,
    shieldUrl: string,
    contactMethod: string,
    contactValue: string,
    inviteUserIds: string[],
  ) => {
    try {
      await api.post('/recruitment/drafts', {
        teamName,
        shieldUrl: shieldUrl || undefined,
        contactMethod,
        contactValue,
        inviteUserIds,
      });
      setShowCreate(false);
      flash('Equipo en formación creado. Se enviaron las invitaciones.');
      loadMe();
    } catch (e) {
      flashErr(e);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-[var(--pad)] py-16">
      <span className="kicker">Mercado de fichajes · {settings.seasonLabel}</span>
      <h1 className="font-display font-black italic uppercase text-[clamp(40px,8vw,96px)] tracking-tight leading-[0.88] mt-3 mb-3">
        Reclutamiento
      </h1>
      <p className="font-display text-mute text-base max-w-[60ch] mb-8 leading-[1.6]">
        ¿Juegas solo o te falta gente? Publícate, postúlate a un equipo, o crea el tuyo invitando
        jugadores del tablón. Necesitas tu perfil de jugador completo para participar.
      </p>

      {regClosed && (
        <div className="font-mono text-xs text-ignite border border-ignite/40 rounded-md px-4 py-3 mb-6">
          Las inscripciones están cerradas: el tablón es solo de lectura.
        </div>
      )}
      {user && !complete && !regClosed && (
        <div className="card p-4 mb-6 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-mute">
            Completa tu <b className="text-ink">perfil de jugador</b> (usuario, rango y captura) para reclutar.
          </span>
          <Link to="/me" className="btn btn-ignite !py-2 shrink-0">Completar perfil</Link>
        </div>
      )}
      {hasDraft && myDraft && (
        <div className="card p-4 mb-6 flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-mute">
            Estás formando <b className="text-ink">{myDraft.teamName}</b> — pendiente de que acepten.
          </span>
          <Link to="/me" className="btn !py-2 shrink-0">Ver estado</Link>
        </div>
      )}
      {msg && <div className="font-mono text-xs text-green border border-green/40 rounded-md px-4 py-3 mb-6">{msg}</div>}
      {err && <div className="font-mono text-xs text-ignite border border-ignite/40 rounded-md px-4 py-3 mb-6">{err}</div>}

      {/* barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {([['player_lft', 'Jugadores libres'], ['team_lfp', 'Equipos buscando']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setTab(v)} className={`btn ${tab === v ? 'btn-ignite' : ''}`}>
              {l}
            </button>
          ))}
        </div>
        {!user ? (
          <Link to="/login" className="btn btn-ignite">Inicia sesión para participar</Link>
        ) : regClosed ? null : committed ? (
          <span className="font-mono text-[11px] tracking-[0.1em] text-mute">
            {hasTeam ? '✓ Ya estás en un equipo' : '⏳ Estás formando un equipo'}
          </span>
        ) : !complete ? (
          <Link to="/me" className="font-mono text-[11px] tracking-[0.1em] uppercase text-ignite hover:underline">
            Completa tu perfil para participar →
          </Link>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => setShowPublish(true)}>
              + Publicar mi ficha
            </button>
            <button type="button" className="btn btn-ignite" onClick={() => setShowCreate(true)}>
              + Crear equipo
            </button>
          </div>
        )}
      </div>

      {/* filtros */}
      <div className="flex flex-wrap gap-3 mb-8">
        <select className="input max-w-[180px]" value={rankFilter} onChange={(e) => setRankFilter(e.target.value)}>
          <option value="">Todos los rangos</option>
          {RANKS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
        <select className="input max-w-[180px]" value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
          <option value="">Todas las posiciones</option>
          {POSITIONS.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
      </div>

      {/* listado */}
      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <p className="font-mono text-xs text-mute py-12">No hay anuncios todavía en esta sección.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) =>
            tab === 'player_lft' ? (
              <div key={post.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-black italic uppercase tracking-tight text-lg truncate">
                      {post.epicUsername || post.steamUsername || post.author?.username}
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite mt-1">
                      {rankLabel(post.rank)} · {positionLabel(post.position)}
                    </div>
                  </div>
                  {post.screenshotUrl && (
                    <a href={fileUrl(post.screenshotUrl)} target="_blank" rel="noreferrer">
                      <img src={fileUrl(post.screenshotUrl)} alt="Rango" className="w-12 h-12 rounded-md object-cover border border-line shrink-0" />
                    </a>
                  )}
                </div>
                {(post.region || post.availability) && (
                  <div className="font-mono text-[10px] text-mute tracking-[0.1em]">
                    {[post.region, post.availability].filter(Boolean).join(' · ')}
                  </div>
                )}
                {post.message && <p className="font-display text-sm text-mute leading-[1.5]">{post.message}</p>}
                {isCaptain && hasVacancy && post.authorId !== user?.id && (
                  <button type="button" className="btn btn-ignite !py-2 mt-auto" onClick={() => invitePlayer(post)}>
                    Invitar a mi equipo
                  </button>
                )}
              </div>
            ) : (
              <div key={post.id} className="card p-5 flex flex-col gap-3">
                <div className="font-display font-black italic uppercase tracking-tight text-lg truncate">
                  {post.team?.name || post.teamName || 'Equipo'}
                </div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite">
                  Busca {post.slotsNeeded} {post.slotsNeeded === 1 ? 'jugador' : 'jugadores'}
                  {post.lookingForRank ? ` · ${rankLabel(post.lookingForRank)}+` : ''}
                  {post.lookingForPosition ? ` · ${positionLabel(post.lookingForPosition)}` : ''}
                </div>
                {post.message && <p className="font-display text-sm text-mute leading-[1.5]">{post.message}</p>}
                <div className="mt-auto pt-2">
                  {!post.teamId ? (
                    <span className="font-mono text-[10px] text-mute">Equipo en formación · contáctalos por la comunidad</span>
                  ) : !user ? (
                    <Link to="/login" className="font-mono text-[10px] text-ignite hover:underline">Inicia sesión para postularte</Link>
                  ) : committed ? (
                    <span className="font-mono text-[10px] text-mute">{hasTeam ? 'Ya estás en un equipo' : 'Estás formando un equipo'}</span>
                  ) : !complete ? (
                    <Link to="/me" className="font-mono text-[10px] text-ignite hover:underline">Completa tu perfil para postularte →</Link>
                  ) : post.authorId !== user?.id ? (
                    <button type="button" className="btn btn-ignite !py-2" disabled={regClosed} onClick={() => applyToTeam(post)}>
                      Postularme
                    </button>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {showPublish && <PublishFichaModal onClose={() => setShowPublish(false)} onSubmit={publishFicha} />}
      {showCreate && (
        <CreateTeamModal
          requiredStarters={settings.playersPerSide}
          maxRoster={settings.playersPerTeam}
          meId={user?.id}
          predefined={settings.predefinedTeamsMode}
          onClose={() => setShowCreate(false)}
          onSubmit={createTeam}
        />
      )}
    </div>
  );
}

/* ---------------- Modal: publicar ficha ---------------- */
function PublishFichaModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (message: string) => void }) {
  const [message, setMessage] = useState('');
  return (
    <Modal title="Publicar mi ficha" onClose={onClose}>
      <p className="font-mono text-[11px] text-mute leading-[1.7]">
        Tu rango, posición y captura se toman de tu perfil de jugador. Añade un mensaje para los capitanes.
      </p>
      <div>
        <label className="label">Mensaje (opcional)</label>
        <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Cuéntales cómo juegas, tu disponibilidad…" />
      </div>
      <button type="button" className="btn btn-ignite" onClick={() => onSubmit(message)}>Publicar</button>
    </Modal>
  );
}

/* ---------------- Modal: crear equipo ---------------- */
function CreateTeamModal({
  requiredStarters,
  maxRoster,
  meId,
  predefined,
  onClose,
  onSubmit,
}: {
  requiredStarters: number;
  maxRoster: number;
  meId?: string;
  predefined: boolean;
  onClose: () => void;
  onSubmit: (
    teamName: string,
    shieldUrl: string,
    contactMethod: string,
    contactValue: string,
    inviteUserIds: string[],
  ) => void;
}) {
  const [teamName, setTeamName] = useState('');
  const [shieldUrl, setShieldUrl] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PresetTeam | null>(null);
  const [contactMethod, setContactMethod] = useState<'discord' | 'email'>('discord');
  const [contactValue, setContactValue] = useState('');
  const [freePlayers, setFreePlayers] = useState<RecruitmentPost[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/recruitment?type=player_lft')
      .then((r) => setFreePlayers((r.data as RecruitmentPost[]).filter((p) => p.authorId !== meId)))
      .catch(() => setFreePlayers([]))
      .finally(() => setLoading(false));
  }, [meId]);

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const ids = Object.keys(selected).filter((k) => selected[k]);
  const minInvites = requiredStarters - 1;
  const valid =
    teamName.trim() &&
    contactValue.trim() &&
    ids.length >= minInvites &&
    ids.length <= maxRoster - 1;

  return (
    <Modal title="Crear equipo" onClose={onClose}>
      <p className="font-mono text-[11px] text-mute leading-[1.7]">
        Serás el capitán. Invita al menos a {minInvites} jugador(es) del tablón. Cuando se completen los{' '}
        {requiredStarters} titulares, el equipo se <b className="text-ink">postula a inscripción</b> y queda a
        la espera de que el administrador lo apruebe (igual que el registro normal).
      </p>
      <div className="font-mono text-[10px] text-ignite border border-ignite/40 rounded-md px-3 py-2 leading-[1.5]">
        ⚠ Solo se permite 1 Grand Champion 1 (GC1) por equipo. Si dos jugadores GC1 intentan unirse,
        el segundo no podrá aceptar.
      </div>
      {predefined ? (
        <div>
          <label className="label">Elige tu equipo</label>
          <p className="font-mono text-[10px] text-mute mt-1 mb-2 leading-[1.6]">
            Cada equipo solo puede ser tomado una vez.
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
            <input className="input" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={50} placeholder="Ej. Nova Boost" />
          </div>
          <UploadField label="Escudo (opcional)" endpoint="shield" value={shieldUrl} onChange={setShieldUrl} thumb />
        </>
      )}

      <div>
        <label className="label">Medio de contacto del capitán <span className="text-ignite">*</span></label>
        <div className="grid grid-cols-2 gap-2 mb-2">
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
        <input
          className="input"
          type={contactMethod === 'email' ? 'email' : 'text'}
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
          placeholder={contactMethod === 'discord' ? 'Tu usuario de Discord' : 'tu@correo.com'}
        />
        <div className="font-mono text-[10px] text-mute mt-1.5">
          El admin usará este contacto para la inscripción del equipo.
        </div>
      </div>

      <div>
        <label className="label">Jugadores a invitar ({ids.length} seleccionados)</label>
        {loading ? (
          <Spinner />
        ) : freePlayers.length === 0 ? (
          <p className="font-mono text-xs text-mute">No hay jugadores libres en el tablón ahora mismo.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
            {freePlayers.map((p) => (
              <label key={p.id} className="flex items-center gap-3 card p-3 cursor-pointer">
                <input type="checkbox" checked={!!selected[p.authorId]} onChange={() => toggle(p.authorId)} className="accent-[#EC571E]" />
                <span className="font-display text-sm truncate flex-1">
                  {p.epicUsername || p.steamUsername || p.author?.username}
                </span>
                <span className="font-mono text-[10px] text-mute">{rankLabel(p.rank)} · {positionLabel(p.position)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-ignite"
        disabled={!valid}
        onClick={() => onSubmit(teamName.trim(), shieldUrl, contactMethod, contactValue.trim(), ids)}
      >
        Crear equipo e invitar
      </button>
    </Modal>
  );
}
