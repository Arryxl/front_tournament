import { useEffect, useRef } from 'react';

/**
 * Capa atmosférica de la marca: grano, cursor orbital, barra de progreso
 * y activación de las animaciones .reveal al hacer scroll.
 * Solo se monta en las vistas públicas para no estorbar en los paneles.
 */
export function Atmosphere() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add('cursor-host');

    const fine = window.matchMedia('(hover: hover)').matches;
    let raf = 0;
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;

    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
      }
      const hot = (e.target as HTMLElement)?.closest('a, button, [data-hot]');
      cursorRef.current?.classList.toggle('is-hot', !!hot);
    };

    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cx}px, ${cy}px)`;
      }
      raf = requestAnimationFrame(loop);
    };

    const scroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
      if (progressRef.current) progressRef.current.style.width = `${pct || 0}%`;
    };

    if (fine) {
      window.addEventListener('mousemove', move);
      raf = requestAnimationFrame(loop);
    }
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
      document.body.classList.remove('cursor-host');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('scroll', scroll);
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <>
      <div className="grain" />
      <div className="g-progress" ref={progressRef} />
      <div className="g-cursor" ref={cursorRef} />
      <div className="g-cursor-dot" ref={dotRef} />
    </>
  );
}
