import { useState } from 'react';
import { api, fileBase } from '../lib/api';

const fileUrl = (u: string) => (u.startsWith('http') ? u : `${fileBase}${u}`);

/**
 * Campo de subida de imagen con previsualización. Reutiliza los endpoints de
 * `/uploads/:endpoint` ya existentes (escudo / captura de rango).
 */
export function UploadField({
  label,
  endpoint,
  value,
  onChange,
  thumb,
  required,
}: {
  label: string;
  endpoint: 'shield' | 'screenshot' | 'preset-team';
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
          <img
            src={fileUrl(value)}
            alt=""
            className="w-12 h-12 rounded-md object-cover border border-line"
          />
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
