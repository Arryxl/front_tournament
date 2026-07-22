import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SOCIALS, PUBLISHER } from '../config';

/** Fecha de última actualización — cámbiala si revisas el contenido. */
const UPDATED = '17 de julio de 2026';
const DISCORD = SOCIALS.discord;

/* ---------------- Bloques de contenido legal ---------------- */
function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line-2 pt-8">
      <div className="flex items-baseline gap-4">
        <span className="font-display font-black italic text-ignite text-2xl tabular-nums leading-none shrink-0">
          {n}
        </span>
        <h2 className="font-display font-black italic uppercase tracking-tight text-2xl sm:text-3xl leading-none">
          {title}
        </h2>
      </div>
      <div className="mt-5 pl-0 sm:pl-10 flex flex-col gap-4 text-ink-d leading-relaxed max-w-[68ch]">
        {children}
      </div>
    </section>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-ignite mt-1 shrink-0 leading-none">▸</span>
      <span>{children}</span>
    </li>
  );
}

export default function Privacy() {
  return (
    <div className="max-w-[900px] mx-auto px-[var(--pad)] py-16 sm:py-20">
      {/* Hero */}
      <span className="kicker">Legal · Gravity League</span>
      <h1 className="font-display font-black italic uppercase text-[clamp(38px,8vw,92px)] tracking-tight leading-[0.85] mt-3 mb-5">
        Política de<br />privacidad
      </h1>
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-mute mb-4">
        Última actualización: {UPDATED}
      </p>
      <p className="text-ink-d leading-relaxed max-w-[68ch] mb-14">
        Gravity League es una liga comunitaria de <em>Rocket League</em>. Esta política explica qué
        datos tratamos cuando participas o vinculas tu cuenta de juego, con qué finalidad y qué
        control tienes sobre ellos. Usamos tus datos únicamente para organizar el torneo y calcular
        estadísticas de partidos; nunca los vendemos.
      </p>

      <div className="flex flex-col gap-10">
        <Section n="01" title="Quiénes somos">
          <p>
            «Gravity League» (en adelante, «nosotros») es una liga comunitaria de{' '}
            <em>Rocket League</em> operada por{' '}
            <strong className="text-ink">{PUBLISHER.name}</strong> y accesible en{' '}
            <strong className="text-ink">gravity.arryxl.me</strong>. {PUBLISHER.name} es el
            responsable del tratamiento de los datos descritos en esta política. Para cualquier
            consulta sobre privacidad puedes escribirnos a{' '}
            <a href={`mailto:${PUBLISHER.email}`} className="text-ignite hover:text-ignite-h underline underline-offset-4">
              {PUBLISHER.email}
            </a>{' '}
            o por nuestro{' '}
            <a href={DISCORD} target="_blank" rel="noreferrer" className="text-ignite hover:text-ignite-h underline underline-offset-4">
              servidor de Discord
            </a>
            .
          </p>
        </Section>

        <Section n="02" title="Qué datos tratamos">
          <p>Según cómo uses la plataforma, podemos tratar:</p>
          <ul className="flex flex-col gap-2.5">
            <Bullet>
              <strong className="text-ink">Identificadores de cuenta de juego.</strong> Cuando
              vinculas tu cuenta de Epic Games o Steam, obtenemos tu{' '}
              <em>identificador de cuenta</em> (Epic Account ID / SteamID) y tu nombre en pantalla.
              Es el único dato que necesitamos de esa cuenta.
            </Bullet>
            <Bullet>
              <strong className="text-ink">Datos de inscripción.</strong> Nombre del equipo,
              nombres de invocador/gamertag de los jugadores, rango declarado y capturas de pantalla
              que subes para verificar el rango.
            </Bullet>
            <Bullet>
              <strong className="text-ink">Estadísticas de partido.</strong> Datos derivados de los
              archivos <code className="font-mono text-ignite">.replay</code> de tus partidos
              (goles, asistencias, salvadas, tiros, etc.), asociados a tu identificador de cuenta.
            </Bullet>
            <Bullet>
              <strong className="text-ink">Datos de la cuenta del sitio.</strong> Nombre de usuario
              con el que accedes a la plataforma y actividad dentro de ella (predicciones, monedas
              virtuales del torneo).
            </Bullet>
          </ul>
          <p>
            No solicitamos ni almacenamos contraseñas de tus cuentas de Epic o Steam: la
            autenticación la realizan directamente esas plataformas.
          </p>
        </Section>

        <Section n="03" title="Para qué usamos los datos">
          <p>Tratamos los datos anteriores exclusivamente para:</p>
          <ul className="flex flex-col gap-2.5">
            <Bullet>Identificar de forma fiable a cada jugador dentro de un partido y de la liga.</Bullet>
            <Bullet>
              Extraer y calcular estadísticas a partir de los replays de <em>Rocket League</em> y
              mostrarlas en clasificaciones, perfiles y resúmenes de partido.
            </Bullet>
            <Bullet>Gestionar inscripciones, equipos, la llave del torneo y las funciones del sitio.</Bullet>
          </ul>
          <p>
            El identificador de cuenta es imprescindible porque los replays no conservan el nombre
            del equipo del lobby: la única forma fiable de atribuir las estadísticas a la persona
            correcta es su identificador estable de plataforma.
          </p>
        </Section>

        <Section n="04" title="Base para el tratamiento">
          <p>
            Vincular tu cuenta de Epic o Steam es <strong className="text-ink">voluntario</strong> y
            se basa en tu consentimiento, que otorgas al iniciar el proceso de vinculación. Los datos
            de inscripción se tratan para poder gestionar tu participación en el torneo. Puedes
            retirar tu consentimiento en cualquier momento desvinculando la cuenta (ver el apartado
            «Tus derechos»).
          </p>
        </Section>

        <Section n="05" title="Con quién se comparten">
          <p>No vendemos ni cedemos tus datos con fines publicitarios. Solo intervienen:</p>
          <ul className="flex flex-col gap-2.5">
            <Bullet>
              <strong className="text-ink">Epic Games (Epic Account Services).</strong> Para
              autenticar tu cuenta de Epic y devolvernos tu identificador y nombre en pantalla.
            </Bullet>
            <Bullet>
              <strong className="text-ink">Steam / Valve.</strong> Para autenticar tu cuenta de
              Steam mediante su sistema de inicio de sesión.
            </Bullet>
            <Bullet>
              <strong className="text-ink">Servicio de análisis de replays.</strong> Los archivos de
              repetición se procesan a través de un servicio externo de estadísticas de{' '}
              <em>Rocket League</em> para calcular los datos del partido.
            </Bullet>
          </ul>
          <p>Estas plataformas tratan los datos conforme a sus propias políticas de privacidad.</p>
        </Section>

        <Section n="06" title="Conservación">
          <p>
            Conservamos los datos vinculados a tu cuenta mientras participes en la liga o mantengas
            la cuenta vinculada. Si desvinculas tu cuenta o solicitas su eliminación, retiramos tus
            identificadores; las estadísticas de partidos ya disputados pueden conservarse de forma
            asociada al equipo por integridad del historial de la competición.
          </p>
        </Section>

        <Section n="07" title="Tus derechos">
          <ul className="flex flex-col gap-2.5">
            <Bullet>
              <strong className="text-ink">Desvincular.</strong> Puedes desconectar tu cuenta de
              Epic o Steam en cualquier momento desde{' '}
              <Link to="/me" className="text-ignite hover:text-ignite-h underline underline-offset-4">
                tu perfil
              </Link>{' '}
              → «Cuentas de juego».
            </Bullet>
            <Bullet>
              <strong className="text-ink">Acceso, corrección y eliminación.</strong> Puedes
              solicitarnos acceder a los datos que tenemos sobre ti, corregirlos o eliminarlos
              escribiéndonos por Discord.
            </Bullet>
            <Bullet>
              <strong className="text-ink">Retirar el consentimiento.</strong> Sin que ello afecte a
              los tratamientos ya realizados.
            </Bullet>
          </ul>
        </Section>

        <Section n="08" title="Menores de edad">
          <p>
            La plataforma está dirigida a mayores de la edad mínima requerida para tener una cuenta
            de Epic Games o Steam en tu país. Si eres menor de edad, participa solo con el
            consentimiento de tu madre, padre o tutor.
          </p>
        </Section>

        <Section n="09" title="Cambios en esta política">
          <p>
            Podemos actualizar esta política para reflejar cambios en la plataforma o en la
            normativa. Publicaremos siempre la versión vigente en esta página, con su fecha de última
            actualización.
          </p>
        </Section>

        <Section n="10" title="Contacto">
          <p>
            Para cualquier duda o solicitud sobre tus datos, contáctanos en{' '}
            <a href={`mailto:${PUBLISHER.email}`} className="text-ignite hover:text-ignite-h underline underline-offset-4">
              {PUBLISHER.email}
            </a>{' '}
            o por nuestro{' '}
            <a href={DISCORD} target="_blank" rel="noreferrer" className="text-ignite hover:text-ignite-h underline underline-offset-4">
              servidor de Discord
            </a>
            .
          </p>
        </Section>
      </div>

      <div className="mt-16 pt-8 border-t border-line">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-mute hover:text-ignite transition-colors group"
        >
          <span className="text-base leading-none transition-transform group-hover:-translate-x-1">←</span>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
