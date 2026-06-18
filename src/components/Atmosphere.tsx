import { useEffect, useRef } from 'react';

/**
 * Capa atmosférica de la marca: grano, barra de progreso de scroll y
 * activación de las animaciones .reveal al hacer scroll. (El cursor orbital
 * se retiró: se usa el cursor normal del sistema.)
 * Solo se monta en las vistas públicas para no estorbar en los paneles.
 */
export function Atmosphere() {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      if (progressRef.current) progressRef.current.style.width = `${pct || 0}%`;
    };
    window.addEventListener('scroll', scroll, { passive: true });

    // reveal-on-scroll
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    const observeAll = () =>
      document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('scroll', scroll);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <>
      <div className="grain" />
      <div className="g-progress" ref={progressRef} />
    </>
  );
}
