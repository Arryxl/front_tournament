import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { BrandLogo } from '../components/brand';
import { BackButton } from '../components/ui';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Si llegamos aquí desde una acción protegida (p. ej. predecir), volver allí.
  const from = (location.state as { from?: string } | null)?.from;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await login(username, password)
          : await register(username, password, email || undefined);
      if (from) navigate(from);
      else navigate(user.role === 'admin' ? '/admin' : user.role === 'candidate' ? '/player' : '/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error de autenticación');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="cover-halo" />
      <div className="w-full max-w-sm relative z-[2]">
        <BackButton to="/" label="Volver al inicio" className="mb-7" />
        <div className="flex items-center gap-3 mb-6">
          <BrandLogo size={48} />
          <span className="font-display font-black italic uppercase tracking-tight text-2xl leading-none">
            GRAV<span className="text-ignite">I</span>TY
          </span>
        </div>
        <h1 className="font-display font-black italic uppercase text-5xl tracking-tight mb-2 leading-[0.85]">
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </h1>
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute mb-8">
          {mode === 'login' ? 'Vuelve a la pista' : 'Únete a la liga'}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="label">Usuario</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          {mode === 'register' && (
            <div>
              <label className="label">Email (opcional)</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="font-mono text-xs text-ignite">{error}</div>}
          <button className="btn btn-ignite mt-2" disabled={busy}>
            {busy ? '…' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ink mt-6"
        >
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
        </button>
      </div>
    </div>
  );
}
