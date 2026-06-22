import { useState } from 'react';

/**
 * Ayuda desplegable y detallada para que un jugador de consola sepa qué ID
 * escribir y dónde encontrarlo. Reutilizada en la inscripción y en el perfil.
 *
 * Punto clave: para consola, ballchasing identifica al jugador por el NOMBRE
 * que aparece en pantalla durante la partida (no por un ID estable), así que lo
 * que importa es que escriban ese nombre tal cual.
 */
export default function ConsoleIdHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-line rounded-lg overflow-hidden bg-white/[0.015]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-display font-black italic uppercase tracking-tight text-base">
          ¿Cómo encuentro mi ID de consola?
        </span>
        <span
          className={`font-mono text-ignite text-lg leading-none transition-transform duration-200 ${
            open ? 'rotate-45' : ''
          }`}
        >
          +
        </span>
      </button>

      {open && (
        <div className="px-4 pb-5 pt-1 flex flex-col gap-5">
          {/* Regla principal */}
          <div className="border-l-2 border-ignite bg-ignite/[0.06] rounded-r-md px-4 py-3">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-ignite mb-1.5">
              Lo más importante
            </div>
            <p className="font-mono text-[12px] text-ink leading-[1.7]">
              Escribe tu nombre <b className="text-ignite">exactamente como aparece dentro de
              Rocket League</b> (el que se ve sobre tu carro y en el marcador de la partida). En
              PlayStation y Xbox normalmente es tu PSN ID / Gamertag. Da igual mayúsculas o
              minúsculas, pero el texto debe coincidir.
            </p>
          </div>

          {/* PlayStation */}
          <Platform name="PlayStation — Online ID (PSN ID)" accent="#0070D1">
            <Step>
              <b className="text-ink">En PS5:</b> pulsa tu foto de perfil (arriba a la derecha) →{' '}
              <b className="text-ink">Perfil</b>; tu <b className="text-ink">Online ID</b> es el
              nombre grande (no el "nombre real").
            </Step>
            <Step>
              <b className="text-ink">En PS4:</b> Ajustes →{' '}
              <b className="text-ink">Gestión de cuenta</b> →{' '}
              <b className="text-ink">Información de la cuenta</b> →{' '}
              <b className="text-ink">ID online</b>.
            </Step>
            <Step>
              <b className="text-ink">Desde el móvil:</b> abre la app{' '}
              <b className="text-ink">PlayStation</b> y toca tu avatar; ahí está tu Online ID.
            </Step>
          </Platform>

          {/* Xbox */}
          <Platform name="Xbox — Gamertag" accent="#107C10">
            <Step>
              <b className="text-ink">En la consola:</b> pulsa el botón{' '}
              <b className="text-ink">Xbox</b> (el del centro del mando) para abrir la guía; tu{' '}
              <b className="text-ink">Gamertag</b> aparece arriba junto a tu avatar.
            </Step>
            <Step>
              También en <b className="text-ink">Perfil y sistema → Mi perfil</b>.
            </Step>
            <Step>
              <b className="text-ink">Desde el móvil/web:</b> la app{' '}
              <b className="text-ink">Xbox</b> o{' '}
              <span className="text-ink">account.xbox.com</span>.
            </Step>
          </Platform>

          {/* Switch */}
          <Platform name="Nintendo Switch" accent="#E60012">
            <Step>
              Switch no tiene un ID público fijo: lo que vale es el{' '}
              <b className="text-ink">nombre que usas dentro de Rocket League</b> al jugar en
              Switch.
            </Step>
            <Step>
              Para verlo, entra a Rocket League en tu Switch y mira el nombre que aparece como
              tuyo en el menú o en una partida.
            </Step>
          </Platform>

          {/* Truco infalible */}
          <div className="border border-line rounded-md px-4 py-3">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-mute mb-1.5">
              Truco infalible
            </div>
            <p className="font-mono text-[12px] text-mute leading-[1.7]">
              Abre <b className="text-ink">Rocket League</b> en tu consola, entra al menú
              principal o a una partida, y copia el nombre que aparece como el tuyo.{' '}
              <b className="text-ink">Ese</b> es el que debes escribir: es el que queda guardado
              en las repeticiones de los partidos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Platform({
  name,
  accent,
  children,
}: {
  name: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: accent }} />
        <span className="font-display font-black italic uppercase tracking-tight text-sm">
          {name}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 pl-[18px]">{children}</ul>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="font-mono text-[11.5px] text-mute leading-[1.65] relative before:content-['→'] before:absolute before:-left-[18px] before:text-ignite">
      {children}
    </li>
  );
}
