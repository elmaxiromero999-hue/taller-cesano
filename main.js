/* Cesano — maqueta web. Vanilla JS, sin dependencias. */

// Datos del taller en un solo lugar. Lo que figura vacío está [CONFIRMAR] (ver TODO.md).
const CONFIG = {
  whatsapp: '', // formato 549351XXXXXXX — mientras esté vacío, los botones ofrecen llamar
  telefono: '+543514617662',
  mensaje: 'Hola Cesano, quiero un presupuesto. Te mando fotos del daño.',
};

document.documentElement.classList.add('js');
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cada clic a WhatsApp/teléfono queda registrado con su ubicación (así se mide la web)
function track(evento, ubicacion) {
  (window.dataLayer = window.dataLayer || []).push({ event: evento, ubicacion });
}

/* ---------------- INTRO ---------------- */
const intro = $('#intro');
const params = new URLSearchParams(location.search);

function ready() {
  document.body.classList.remove('intro-lock');
  document.body.classList.add('is-ready');
}

(function initIntro() {
  let visto = false;
  try { visto = sessionStorage.getItem('cesano-intro') === '1'; } catch (e) {}
  if (!intro || (visto && !params.has('intro'))) {
    if (intro) intro.remove();
    ready();
    return;
  }

  let puede = false, saliendo = false;
  setTimeout(() => { puede = true; }, reduce ? 0 : 900);

  function entrar() {
    if (saliendo || !puede) return;
    saliendo = true;
    try { sessionStorage.setItem('cesano-intro', '1'); } catch (e) {}
    if (params.has('intro')) history.replaceState(null, '', location.pathname + location.hash);
    intro.classList.remove('is-dragging');
    intro.classList.add('is-leaving');
    setTimeout(ready, reduce ? 0 : 380);
    setTimeout(() => intro.remove(), reduce ? 0 : 1300);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
  }

  function onWheel(e) { if (e.deltaY > 6) entrar(); }
  function onKey(e) {
    if (['Enter', ' ', 'ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); entrar(); }
  }
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKey);
  $('.intro__enter', intro).addEventListener('click', entrar);

  // Deslizar hacia arriba (dedo o mouse): la cortina sigue el gesto
  let y0 = null, dy = 0;
  intro.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.intro__enter')) return;
    y0 = e.clientY; dy = 0;
    intro.classList.add('is-dragging');
  });
  intro.addEventListener('pointermove', (e) => {
    if (y0 === null || saliendo) return;
    dy = Math.min(0, e.clientY - y0);
    intro.style.setProperty('--drag', dy + 'px');
  });
  const soltar = () => {
    if (y0 === null) return;
    y0 = null;
    intro.classList.remove('is-dragging');
    if (dy < -50) { puede = true; entrar(); }
    else intro.style.setProperty('--drag', '0px');
  };
  intro.addEventListener('pointerup', soltar);
  intro.addEventListener('pointercancel', soltar);
})();

/* ---------------- WHATSAPP ---------------- */
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
  toast.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { toast.hidden = true; }, 7000);
}
$('.toast__x').addEventListener('click', () => { toast.hidden = true; });

document.addEventListener('click', (e) => {
  const wa = e.target.closest('[data-wa]');
  if (wa) {
    track('whatsapp_click', wa.dataset.wa);
    if (!CONFIG.whatsapp) { e.preventDefault(); mostrarToast(); }
  }
  const tel = e.target.closest('[data-tel]');
  if (tel) track('telefono_click', tel.dataset.tel);
});

/* ---------------- HEADER ---------------- */
const hdr = $('.hdr');
const burger = $('.hdr__burger');
burger.addEventListener('click', () => {
  const abierto = hdr.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', abierto);
  burger.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
});
$$('.hdr__nav a').forEach((a) => a.addEventListener('click', () => {
  hdr.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
}));

const navLinks = $$('.hdr__nav a:not(.btn)');
const secObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
['servicios', 'garantia', 'seguros', 'historia', 'contacto'].forEach((id) => secObs.observe(document.getElementById(id)));

/* ---------------- REVEAL + CONTADORES ---------------- */
function contar(el) {
  const fin = +el.dataset.count;
  const ini = +(el.dataset.from || 0);
  const fmt = (n) => (el.dataset.sep ? n.toLocaleString('es-AR') : String(n));
  if (reduce) { el.textContent = fmt(fin); return; }
  const dur = 1500, t0 = performance.now();
  (function paso(t) {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(2, -10 * k);
    el.textContent = fmt(Math.round(ini + (fin - ini) * (k === 1 ? 1 : e)));
    if (k < 1) requestAnimationFrame(paso);
  })(t0);
}

const revObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    revObs.unobserve(en.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
$$('.reveal').forEach((el) => revObs.observe(el));

const numObs = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    contar(en.target);
    numObs.unobserve(en.target);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach((el) => numObs.observe(el));

/* ---------------- PASOS DEL SEGURO ---------------- */
const pasos = $('.pasos');
const btnPasos = $$('.paso', pasos);
function activarPaso(i) {
  btnPasos.forEach((b, j) => {
    b.classList.toggle('is-on', j === i);
    b.setAttribute('aria-selected', j === i);
  });
}
btnPasos.forEach((b, i) => {
  b.addEventListener('click', () => activarPaso(i));
  b.querySelector('.paso__bar').addEventListener('animationend', () => activarPaso((i + 1) % btnPasos.length));
});
if (reduce) pasos.classList.add('is-paused');
else {
  pasos.classList.add('is-paused');
  new IntersectionObserver(([en]) => pasos.classList.toggle('is-paused', !en.isIntersecting), { threshold: 0.4 }).observe(pasos);
}

/* ---------------- TICKER DE ASEGURADORAS ---------------- */
const track$ = $('.ticker__track');
$$('li', track$).forEach((li) => {
  const c = li.cloneNode(true);
  c.setAttribute('aria-hidden', 'true');
  track$.appendChild(c);
});

/* ---------------- ANTES / HOY ---------------- */
const ah = $('.ah');
const sw = $('.switch');
function epoca(cual) {
  ah.dataset.epoca = cual;
  sw.classList.toggle('is-antes', cual === 'antes');
  $$('.switch__b', sw).forEach((b) => {
    const on = b.dataset.epoca === cual;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on);
  });
}
$$('.switch__b', sw).forEach((b) => b.addEventListener('click', () => epoca(b.dataset.epoca)));
if (!reduce) {
  // la primera vez que se ve, arranca en 1959 y salta a hoy
  epoca('antes');
  const ahObs = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    ahObs.disconnect();
    setTimeout(() => epoca('hoy'), 1100);
  }, { threshold: 0.5 });
  ahObs.observe(ah);
}

/* ---------------- ANTES Y DESPUÉS ---------------- */
const ba = $('.ba');
const baRange = $('.ba__range');
let baTocado = false;
const setPos = (v) => ba.style.setProperty('--pos', v + '%');
baRange.addEventListener('input', () => { baTocado = true; setPos(baRange.value); });
if (!reduce) {
  const baObs = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    baObs.disconnect();
    // pista: la línea se mueve sola una vez para mostrar que se arrastra
    const t0 = performance.now(), dur = 1800;
    (function anim(t) {
      if (baTocado) return;
      const k = Math.min(1, (t - t0) / dur);
      const v = 50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k * 0.3);
      setPos(k === 1 ? 50 : v);
      baRange.value = k === 1 ? 50 : v;
      if (k < 1) requestAnimationFrame(anim);
    })(t0);
  }, { threshold: 0.6 });
  baObs.observe(ba);
}

/* ---------------- SCROLL: HEADER, LÍNEA DE TIEMPO, PARALLAX ---------------- */
const tl = $('.tl');
const tlItems = $$('.tl__i');
const heroImg = $('.hero__img img');
let tick = false;
function onScroll() {
  tick = false;
  const vh = innerHeight;
  hdr.classList.toggle('is-scrolled', scrollY > 8);

  const r = tl.getBoundingClientRect();
  const marca = vh * 0.62;
  const p = Math.max(0, Math.min(1, (marca - r.top) / r.height));
  tl.style.setProperty('--p', p.toFixed(3));
  tlItems.forEach((li) => li.classList.toggle('is-on', li.getBoundingClientRect().top < marca));

  if (!reduce && scrollY < vh * 1.2) heroImg.style.setProperty('--par', (scrollY * 0.12).toFixed(1) + 'px');
}
window.addEventListener('scroll', () => {
  if (!tick) { tick = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();
