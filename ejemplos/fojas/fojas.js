/* ==========================================================================
   Fojas · Estudio jurídico — comportamiento de la página (sin dependencias)
     Menú: barra sólida, se esconde al bajar, marca la sección actual.
     [data-folio]     foliado fijo: cada sección [data-foja] es una foja del expediente.
     .fj-rev          fundido lento al entrar en pantalla.
     [data-redline]   la cláusula se corrige sola: tachado bordó y texto nuevo que se escribe.
     [data-codigo]    áreas como índice de un código (pestañas Art. 1 a 6).
     [data-pila]      fojas que se apilan con el scroll (sticky + leve escala de las de abajo).
     [data-terminos]  glosario con buscador.
   Con prefers-reduced-motion todo aparece en su estado final.
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const espera = (ms) => new Promise((r) => setTimeout(r, quieto ? 0 : ms));

  /* ---------- Menú ---------- */
  const nav = $('[data-nav]'), drawer = $('[data-drawer]'), burger = $('[data-burger]');
  const abrir = (si) => {
    nav.classList.toggle('is-abierta', si);
    drawer.classList.toggle('is-abierto', si);
    burger.setAttribute('aria-expanded', si);
    drawer.inert = !si;
    document.body.style.overflow = si ? 'hidden' : '';
  };
  drawer.inert = true;
  burger.addEventListener('click', () => abrir(!nav.classList.contains('is-abierta')));
  $$('a', drawer).forEach((a) => a.addEventListener('click', () => abrir(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-abierta')) { abrir(false); burger.focus(); } });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) abrir(false); });

  /* ---------- Scroll: barra y pila de fojas ---------- */
  const fojas = $$('.fj-foja');
  fojas.forEach((f, i) => f.style.setProperty('--i', i));
  let ultimo = scrollY, pedido = false;
  const alScroll = () => {
    pedido = false;
    const y = scrollY;
    nav.classList.toggle('is-solida', y > 10);
    nav.classList.toggle('is-oculta', y > ultimo && y > innerHeight * .6 && !nav.classList.contains('is-abierta'));
    ultimo = y;
    if (quieto) return;
    // Cuando la foja siguiente se monta encima, la de abajo se achica y oscurece apenas.
    fojas.forEach((f, i) => {
      const sig = fojas[i + 1];
      if (!sig) return;
      const a = f.getBoundingClientRect(), b = sig.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, 1 - (b.top - a.top) / a.height));
      f.style.setProperty('--s', (1 - p * .035).toFixed(4));
      f.style.setProperty('--b', (1 - p * .05).toFixed(4));
    });
  };
  addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(alScroll); } }, { passive: true });
  addEventListener('resize', alScroll);
  alScroll();

  /* ---------- Sección actual: link del menú + foliado ---------- */
  const links = $$('.fj-nav__links a');
  const folio = $('[data-folio]');
  const ioSec = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    const id = e.target.id;
    links.forEach((a) => a.classList.toggle('is-actual', id && a.getAttribute('href') === '#' + id));
    folio.parentElement.classList.toggle('is-oscuro', 'oscura' in e.target.dataset);
    const n = e.target.dataset.foja;
    if (folio.textContent !== n) {
      folio.textContent = n;
      folio.classList.remove('is-cambia'); void folio.offsetWidth; folio.classList.add('is-cambia');
    }
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-foja]').forEach((s) => ioSec.observe(s));

  /* ---------- Revelados ---------- */
  const ioRev = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); ioRev.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.fj-rev').forEach((el) => ioRev.observe(el));

  /* ---------- Cláusula con control de cambios ---------- */
  const hoja = $('[data-redline]');
  const cambios = $$('del, ins', hoja);
  const textos = new Map();
  if (!quieto) cambios.filter((c) => c.tagName === 'INS').forEach((c) => { textos.set(c, c.textContent); c.textContent = ''; });
  const escribir = async (el, txt) => {
    el.classList.add('is-escribiendo');
    for (let i = 1; i <= txt.length; i++) { el.textContent = txt.slice(0, i); await espera(32); }
    await espera(250);
    el.classList.remove('is-escribiendo');
  };
  const revisar = async () => {
    await espera(1100);
    for (const c of cambios) {
      if (c.tagName === 'DEL') { c.classList.add('is-tachado'); await espera(850); }
      else if (!quieto) await escribir(c, textos.get(c));
    }
    await espera(300);
    hoja.classList.add('is-revisada');
  };
  new IntersectionObserver((ents, io) => {
    if (ents[0].isIntersecting) { io.disconnect(); revisar(); }
  }, { threshold: .4 }).observe(hoja);

  /* ---------- Áreas ---------- */
  const AREAS = [
    { t: 'Empresas y sociedades', d: 'Acompañamos a la empresa desde el estatuto hasta la sucesión de sus socios, para que las decisiones se tomen con reglas claras.', l: ['Constitución de SAS, SRL y SA', 'Contratos comerciales y de distribución', 'Acuerdos de socios', 'Gobierno societario y actas', 'Compra y venta de empresas', 'Protección de marcas'] },
    { t: 'Laboral', d: 'Asesoramos a empleadores para prevenir conflictos y a trabajadores para que se respeten sus derechos.', l: ['Contratos y registración', 'Despidos e indemnizaciones', 'Reclamos y conciliaciones', 'Auditorías laborales', 'Accidentes de trabajo', 'Convenios colectivos'] },
    { t: 'Familia y sucesiones', d: 'Temas delicados que pedimos tratar con tiempo, discreción y acuerdos que cuiden a todos, especialmente a los chicos.', l: ['Divorcios y convenios', 'Cuota alimentaria', 'Cuidado personal y régimen de comunicación', 'Sucesiones', 'Testamentos', 'Planificación patrimonial'] },
    { t: 'Inmobiliario', d: 'Revisamos antes de firmar: títulos, contratos y condiciones, para que la operación más importante no tenga sorpresas.', l: ['Compraventas y boletos', 'Contratos de alquiler', 'Estudio de títulos', 'Consorcios y propiedad horizontal', 'Desalojos', 'Fideicomisos al costo'] },
    { t: 'Civil y daños', d: 'Cuando algo sale mal, buscamos una reparación justa y, si se puede, rápida.', l: ['Incumplimientos contractuales', 'Accidentes de tránsito', 'Defensa del consumidor', 'Responsabilidad profesional', 'Daños y perjuicios', 'Cobro de deudas'] },
    { t: 'Litigios y mediación', d: 'Preferimos el acuerdo. Cuando no es posible, litigamos con preparación y te informamos cada paso.', l: ['Mediación prejudicial', 'Juicios civiles y comerciales', 'Medidas cautelares', 'Arbitraje', 'Recursos ante cámaras', 'Ejecución de sentencias'] },
  ];
  const det = $('[data-det]'), tabs = $$('[data-area]');
  const verArea = (i) => {
    const a = AREAS[i];
    tabs.forEach((b, j) => { b.setAttribute('aria-selected', i === j); b.tabIndex = i === j ? 0 : -1; });
    det.innerHTML = `<small>Art. ${i + 1}</small><h3>${a.t}</h3><p>${a.d}</p><ul>${a.l.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  };
  tabs.forEach((b, i) => b.addEventListener('click', () => verArea(i)));
  $('[data-codigo] [role="tablist"]').addEventListener('keydown', (e) => {
    const mov = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!mov) return;
    e.preventDefault();
    const i = (tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true') + mov + tabs.length) % tabs.length;
    verArea(i); tabs[i].focus();
  });
  verArea(0);

  /* ---------- Glosario ---------- */
  const TERMINOS = [
    ['Mediación prejudicial', 'Una reunión previa al juicio, con un mediador neutral, para intentar un acuerdo. En muchos casos es obligatoria antes de demandar.'],
    ['Medida cautelar', 'Una orden del juez para proteger algo mientras dura el juicio; por ejemplo, que no se venda un bien o que se congele una cuenta.'],
    ['Prescripción', 'El plazo después del cual ya no se puede reclamar. Por eso conviene consultar temprano, aunque parezca que hay tiempo.'],
    ['Carta documento', 'Una comunicación con constancia oficial de envío, fecha y contenido. Sirve como prueba de que avisaste o intimaste.'],
    ['Homologación', 'Cuando un juez aprueba un acuerdo entre las partes: desde ese momento tiene la misma fuerza que una sentencia.'],
    ['Declaratoria de herederos', 'La resolución del juez que dice quiénes son los herederos de una persona. Es el primer paso para disponer de los bienes.'],
    ['Usufructo', 'El derecho de usar un bien que es de otra persona y quedarte con lo que produce, como el alquiler de un departamento.'],
    ['Poder', 'Un documento, casi siempre ante escribano, por el que autorizás a alguien a actuar en tu nombre para ciertos trámites.'],
    ['Boleto de compraventa', 'El contrato que se firma antes de la escritura: fija el precio, las condiciones y la fecha en que se va a escriturar.'],
    ['Intimación', 'Un pedido formal para que alguien cumpla algo en un plazo, bajo aviso de que si no lo hace habrá consecuencias.'],
  ];
  const lista = $('[data-terminos]'), buscar = $('[data-buscar]'), vacio = $('[data-vacio]');
  lista.innerHTML = TERMINOS.map(([t, d], i) => `<div class="fj-termino"><dt><button type="button" aria-expanded="false" aria-controls="fj-t${i}"><span>${t}</span><i>Ver</i></button></dt><dd id="fj-t${i}"><p><span>${d}</span></p></dd></div>`).join('');
  const items = $$('.fj-termino', lista);
  items.forEach((it) => {
    const b = $('button', it);
    b.addEventListener('click', () => {
      const si = !it.classList.contains('is-abierto');
      it.classList.toggle('is-abierto', si);
      b.setAttribute('aria-expanded', si);
      $('i', b).textContent = si ? 'Cerrar' : 'Ver';
    });
  });
  const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  buscar.addEventListener('input', () => {
    const q = sinTildes(buscar.value.trim());
    let hay = 0;
    items.forEach((it, i) => {
      const [t, d] = TERMINOS[i];
      const ok = !q || sinTildes(t + ' ' + d).includes(q);
      it.hidden = !ok; hay += ok;
      const span = $('dt span', it);
      const k = q ? sinTildes(t).indexOf(q) : -1;
      span.innerHTML = k >= 0 ? `${t.slice(0, k)}<mark>${t.slice(k, k + q.length)}</mark>${t.slice(k + q.length)}` : t;
    });
    vacio.hidden = hay > 0;
  });

  /* ---------- Formulario (de ejemplo: no envía) ---------- */
  const form = $('[data-form]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach((i) => { const mal = !i.value.trim(); i.classList.toggle('is-error', mal); if (mal && ok) { i.focus(); ok = false; } });
    if (!ok) return;
    $('[data-ok]', form).hidden = false;
    $('button[type="submit"]', form).disabled = true;
  });
})();
