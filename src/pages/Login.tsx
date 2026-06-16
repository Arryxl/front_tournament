import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
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
      navigate(user.role === 'admin' ? '/admin' : user.role === 'candidate' ? '/player' : '/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error de autenticación');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-mono tracking-[0.35em] text-sm font-bold block mb-2">
          GRAVITY
        </Link>
        <h1 className="font-display font-extrabold uppercase text-4xl tracking-tight mb-8">
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </h1>
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
