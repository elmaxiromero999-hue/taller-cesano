/* Cesano — maqueta web. Vanilla JS, sin dependencias. */

// Datos del taller en un solo lugar. Lo que figura vacío está [CONFIRMAR] (ver TODO.md).
const CONFIG = {
  whatsapp: '', // formato 549351XXXXXXX — mientras esté vacío, los botones ofrecen llamar
  telefono: '+543514617662',
  mensaje: 'Hola Cesano, quiero un presupuesto. Te mando fotos del daño.',
};

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cada bloque corre aparte: si falla uno, el resto de la página sigue andando
function bloque(nombre, fn) {
  try { fn(); } catch (err) { console.error('[cesano] ' + nombre, err); }
}

// Cada clic a WhatsApp/teléfono queda registrado con su ubicación (así se mide la web)
function track(evento, ubicacion) {
  (window.dataLayer = window.dataLayer || []).push({ event: evento, ubicacion });
}

function ready() {
  document.body.classList.remove('intro-lock');
  document.body.classList.add('is-ready');
}

/* ---------------- REVEAL + CONTADORES (primero, para que nada quede invisible) ---------------- */
bloque('reveal', () => {
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revObs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('.reveal:not(.h2)').forEach((el) => revObs.observe(el));

  // los títulos arrancan enmascarados (clip-path) y el observer no los ve: se mira su contenedor
  const titulos = new Map();
  const h2Obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      titulos.get(en.target).forEach((h) => h.classList.add('is-in'));
      h2Obs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  $$('.h2.reveal').forEach((h) => {
    const p = h.parentElement;
    if (!titulos.has(p)) { titulos.set(p, []); h2Obs.observe(p); }
    titulos.get(p).push(h);
  });
});

bloque('contadores', () => {
  function contar(el) {
    const fin = +el.dataset.count;
    const ini = +(el.dataset.from || 0);
    const fmt = (n) => (el.dataset.sep ? n.toLocaleString('es-AR') : String(n));
    if (reduce) { el.textContent = fmt(fin); return; }
    const dur = 1500, t0 = performance.now();
    (function paso(t) {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(ini + (fin - ini) * (k === 1 ? 1 : 1 - Math.pow(2, -10 * k))));
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  const numObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      contar(en.target);
      numObs.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => numObs.observe(el));
});

/* ---------------- INTRO ---------------- */
bloque('intro', () => {
  const intro = $('#intro');
  const params = new URLSearchParams(location.search);
  let visto = false;
  try { visto = sessionStorage.getItem('cesano-intro') === '1'; } catch (e) {}
  // si llega con un enlace directo (#contacto, #seguros…) va derecho a lo que buscaba
  const directo = location.hash.length > 1 && !params.has('intro');
  if (!intro || directo || (visto && !params.has('intro'))) {
    if (intro) intro.remove();
    ready();
    // enlace directo: ir a la sección una vez que la página tomó su altura final
    if (directo) {
      const ir = () => {
        let destino = null;
        try { destino = document.querySelector(decodeURIComponent(location.hash)); } catch (e) {}
        if (destino) destino.scrollIntoView({ behavior: 'instant', block: 'start' }); // instantáneo: el smooth se corta mientras carga
      };
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      requestAnimationFrame(ir);
      if (document.fonts) document.fonts.ready.then(ir);
      window.addEventListener('load', () => setTimeout(ir, 60), { once: true });
    }
    return;
  }

  // mientras está la intro, la página de abajo no recibe foco ni scroll
  const fondo = ['.hdr', 'main', '.pie', '.fab'].map((s) => $(s)).filter(Boolean);
  fondo.forEach((el) => { el.inert = true; });
  document.body.classList.add('intro-lock');
  const boton = $('.intro__enter', intro);
  if (boton) boton.focus({ preventScroll: true });

  let rueda = false, saliendo = false;
  setTimeout(() => { rueda = true; }, reduce ? 0 : 900); // evita que un scroll accidental la saltee

  function entrar() {
    if (saliendo) return;
    saliendo = true;
    try { sessionStorage.setItem('cesano-intro', '1'); } catch (e) {}
    if (params.has('intro')) history.replaceState(null, '', location.pathname + location.hash);
    intro.classList.remove('is-dragging');
    intro.classList.add('is-leaving');
    fondo.forEach((el) => { el.inert = false; });
    setTimeout(ready, reduce ? 0 : 380);
    setTimeout(() => {
      intro.remove();
      const logo = $('.hdr__logo');
      if (logo) logo.focus({ preventScroll: true });
    }, reduce ? 0 : 1300);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
  }

  function onWheel(e) { if (rueda && e.deltaY > 6) entrar(); }
  function onKey(e) {
    if (['Enter', ' ', 'ArrowDown', 'PageDown', 'Escape'].includes(e.key)) { e.preventDefault(); entrar(); }
  }
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKey);
  if (boton) boton.addEventListener('click', entrar);
  const saltar = $('.intro__skip', intro);
  if (saltar) saltar.addEventListener('click', entrar);

  // Deslizar hacia arriba (dedo o mouse), también arrancando sobre el botón: la cortina sigue el gesto
  let y0 = null, dy = 0;
  intro.addEventListener('pointerdown', (e) => {
    y0 = e.clientY; dy = 0;
    intro.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (y0 === null || saliendo) return;
    dy = Math.min(0, e.clientY - y0);
    intro.style.setProperty('--drag', dy + 'px');
  });
  const soltar = () => {
    if (y0 === null) return;
    y0 = null;
    intro.classList.remove('is-dragging');
    if (dy < -50) entrar();
    else intro.style.setProperty('--drag', '0px');
  };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
  window.addEventListener('blur', soltar);
  document.addEventListener('pointerleave', soltar);
});

/* ---------------- WHATSAPP ---------------- */
bloque('whatsapp', () => {
  if (CONFIG.whatsapp) {
    $$('[data-wa]').forEach((a) => {
      a.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(a.dataset.msg || CONFIG.mensaje)}`;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }
  const toast = $('.toast');
  let toastT;
  function mostrarToast() {
    if (!toast) return;
    toast.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { toast.hidden = true; }, 7000);
  }
  const x = $('.toast__x');
  if (x) x.addEventListener('click', () => { toast.hidden = true; });

  document.addEventListener('click', (e) => {
    const wa = e.target.closest('[data-wa]');
    if (wa) {
      track('whatsapp_click', wa.dataset.wa);
      if (!CONFIG.whatsapp) { e.preventDefault(); mostrarToast(); }
    }
    const tel = e.target.closest('[data-tel]');
    if (tel) track('telefono_click', tel.dataset.tel);
  });

  // el botón flotante se esconde mientras se ven los botones del hero, para no taparlos
  const fab = $('.fab'), heroCtas = $('.hero__ctas');
  if (fab && heroCtas) {
    new IntersectionObserver(([en]) => fab.classList.toggle('is-hidden', en.isIntersecting)).observe(heroCtas);
  }
});

/* ---------------- HEADER ---------------- */
bloque('header', () => {
  const hdr = $('.hdr');
  const burger = $('.hdr__burger');
  if (burger) {
    burger.addEventListener('click', () => {
      const abierto = hdr.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', abierto);
      burger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    $$('.hdr__nav a').forEach((a) => a.addEventListener('click', () => {
      hdr.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }
  const navLinks = $$('.hdr__nav a:not(.btn)');
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['servicios', 'garantia', 'seguros', 'historia', 'contacto']
    .map((id) => document.getElementById(id)).filter(Boolean)
    .forEach((el) => secObs.observe(el));
});

/* ---------------- PASOS DEL SEGURO ---------------- */
bloque('pasos', () => {
  const pasos = $('.pasos');
  if (!pasos) return;
  const btns = $$('.paso', pasos);
  function activar(i) {
    btns.forEach((b, j) => {
      b.classList.toggle('is-on', j === i);
      b.setAttribute('aria-pressed', j === i);
    });
  }
  btns.forEach((b, i) => {
    // si la persona elige un paso, deja de avanzar solo
    b.addEventListener('click', () => { pasos.classList.add('is-manual'); activar(i); });
    const bar = b.querySelector('.paso__bar');
    if (bar) bar.addEventListener('animationend', () => activar((i + 1) % btns.length));
  });
  pasos.classList.add('is-paused');
  if (reduce) { pasos.classList.add('is-manual'); return; }
  new IntersectionObserver(([en]) => pasos.classList.toggle('is-paused', !en.isIntersecting), { threshold: 0.4 }).observe(pasos);
});

/* ---------------- TICKER DE ASEGURADORAS ---------------- */
bloque('ticker', () => {
  const ticker = $('.ticker'), track$ = $('.ticker__track'), pausa = $('.ticker__pause');
  if (!track$) return;
  $$('li', track$).forEach((li) => {
    const c = li.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    track$.appendChild(c);
  });
  if (pausa && ticker) {
    if (reduce) { pausa.remove(); return; }
    pausa.addEventListener('click', () => {
      const p = ticker.classList.toggle('is-paused');
      pausa.setAttribute('aria-pressed', p);
      pausa.textContent = p ? 'Seguir' : 'Pausar';
    });
  }
});

/* ---------------- CINTA ANIMADA ---------------- */
bloque('cinta', () => {
  const t = $('.cinta__track');
  if (!t) return;
  [...t.children].forEach((n) => t.appendChild(n.cloneNode(true))); // segunda vuelta para que el loop no se corte
});

/* ---------------- ANTES / HOY ---------------- */
bloque('antes-hoy', () => {
  const ah = $('.ah'), sw = $('.switch');
  if (!ah || !sw) return;
  let elegido = false;
  function epoca(cual) {
    ah.dataset.epoca = cual;
    sw.classList.toggle('is-antes', cual === 'antes');
    $$('.switch__b', sw).forEach((b) => {
      const on = b.dataset.epoca === cual;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on);
    });
  }
  $$('.switch__b', sw).forEach((b) => b.addEventListener('click', () => { elegido = true; epoca(b.dataset.epoca); }));
  if (reduce) return;
  // la primera vez que se ve, arranca en 1959 y salta a hoy (salvo que la persona ya haya elegido)
  epoca('antes');
  const ahObs = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    ahObs.disconnect();
    setTimeout(() => { if (!elegido) epoca('hoy'); }, 1100);
  }, { threshold: 0.5 });
  ahObs.observe(ah);
});

/* ---------------- ANTES Y DESPUÉS ---------------- */
bloque('antes-despues', () => {
  const ba = $('.ba'), range = $('.ba__range');
  if (!ba || !range) return;
  let tocado = false;
  const setPos = (v) => ba.style.setProperty('--pos', v + '%');
  range.addEventListener('input', () => { tocado = true; setPos(range.value); });
  if (reduce) return;
  const baObs = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    baObs.disconnect();
    // pista: la línea se mueve sola una vez para mostrar que se arrastra
    const t0 = performance.now(), dur = 1800;
    (function anim(t) {
      if (tocado) return;
      const k = Math.min(1, (t - t0) / dur);
      const v = k === 1 ? 50 : 50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k * 0.3);
      setPos(v);
      range.value = v;
      if (k < 1) requestAnimationFrame(anim);
    })(t0);
  }, { threshold: 0.6 });
  baObs.observe(ba);
});

/* ---------------- SCROLL: HEADER, LÍNEA DE TIEMPO, PARALLAX ---------------- */
bloque('scroll', () => {
  const hdr = $('.hdr'), tl = $('.tl'), heroImg = $('.hero__img img');
  const tlItems = $$('.tl__i');
  let tick = false;
  function onScroll() {
    tick = false;
    const vh = innerHeight;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', scrollY > 8);
      // la barra naranja muestra cuánto falta de la página (el menú queda siempre visible)
      const total = document.documentElement.scrollHeight - vh;
      hdr.style.setProperty('--prog', total > 0 ? (scrollY / total).toFixed(4) : 0);
    }
    if (tl) {
      const r = tl.getBoundingClientRect();
      const marca = vh * 0.62;
      tl.style.setProperty('--p', Math.max(0, Math.min(1, (marca - r.top) / r.height)).toFixed(3));
      tlItems.forEach((li) => li.classList.toggle('is-on', li.getBoundingClientRect().top < marca));
    }
    if (heroImg && !reduce && scrollY < vh * 1.2) heroImg.style.setProperty('--par', (scrollY * 0.12).toFixed(1) + 'px');
  }
  window.addEventListener('scroll', () => {
    if (!tick) { tick = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
});

/* ---------------- EFECTOS CON MOUSE (solo en equipos con puntero) ---------------- */
bloque('mouse', () => {
  if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  // imán: el botón se acerca un poco al cursor
  $$('[data-magnet]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.3;
      const y = (e.clientY - r.top - r.height / 2) * 0.3;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });

  // garantía: el auto se inclina según la posición del mouse y el sello acompaña
  const vis = $('.garantia__visual');
  if (vis) {
    const zona = vis.closest('.garantia') || vis;
    zona.addEventListener('pointermove', (e) => {
      const r = vis.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)));
      vis.style.setProperty('--ry', (nx * 7).toFixed(2) + 'deg');
      vis.style.setProperty('--rx', (ny * -4).toFixed(2) + 'deg');
      vis.style.setProperty('--sx', (nx * -12).toFixed(1) + 'px');
      vis.style.setProperty('--sy', (ny * -8).toFixed(1) + 'px');
    });
    zona.addEventListener('pointerleave', () => {
      ['--ry', '--rx', '--sx', '--sy'].forEach((v) => vis.style.removeProperty(v));
    });
  }
});
