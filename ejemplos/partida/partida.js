/* ==========================================================================
   Partida · Estudio contable — comportamiento de la página (sin dependencias)
     Menú: barra que se vuelve sólida, se esconde al bajar y marca la sección actual.
     [data-progreso]  filete superior que avanza con el scroll.
     .pd-rev          fundido lento al entrar en pantalla (IntersectionObserver).
     [data-asiento]   el asiento se carga fila por fila, las cifras ruedan y el total "cuadra".
     [data-plan]      plan de cuentas en acordeón (una cuenta abierta a la vez).
     [data-pasos]     riel vertical que se llena con el scroll y enciende cada paso.
     [data-digitos]   calendario de vencimientos por terminación de CUIT (fechas ilustrativas).
     [data-cuenta]    contadores de las cifras.
   Con prefers-reduced-motion todo aparece en su estado final.
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('es-AR');
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* Rueda una cifra desde 0 hasta su valor. */
  const rodar = (el, hasta, ms = 1100, miles = true) => new Promise((ok) => {
    if (quieto) { el.textContent = miles ? fmt(hasta) : hasta; return ok(); }
    const t0 = performance.now();
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const v = hasta * easeOut(p);
      el.textContent = miles ? fmt(v) : Math.round(v);
      p < 1 ? requestAnimationFrame(paso) : ok();
    };
    requestAnimationFrame(paso);
  });
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

  /* ---------- Scroll: barra, progreso y riel del método ---------- */
  const progreso = $('[data-progreso]');
  const pasos = $('[data-pasos]'), riel = $('[data-riel]'), itemsPaso = $$('[data-paso]');
  let ultimo = scrollY, pedido = false;
  const alScroll = () => {
    pedido = false;
    const y = scrollY, alto = document.documentElement.scrollHeight - innerHeight;
    progreso.style.transform = `scaleX(${alto > 0 ? y / alto : 0})`;
    nav.classList.toggle('is-solida', y > 10);
    nav.classList.toggle('is-oculta', y > ultimo && y > innerHeight * .6 && !nav.classList.contains('is-abierta'));
    ultimo = y;

    // El riel se llena según cuánto del bloque de pasos pasó por la mitad de la pantalla.
    const r = pasos.getBoundingClientRect(), medio = innerHeight * .6;
    const p = Math.min(1, Math.max(0, (medio - r.top) / r.height));
    riel.style.transform = `scaleY(${p})`;
    itemsPaso.forEach((li) => li.classList.toggle('is-activo', quieto || li.getBoundingClientRect().top < medio));
  };
  addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(alScroll); } }, { passive: true });
  addEventListener('resize', alScroll);
  alScroll();

  /* Link de la sección actual en el menú */
  const links = $$('.pd-nav__links a');
  const ioSec = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => a.classList.toggle('is-actual', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => ioSec.observe(s));

  /* ---------- Revelados ---------- */
  const ioRev = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); ioRev.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.pd-rev').forEach((el) => ioRev.observe(el));
  requestAnimationFrame(() => $('.pd-hero').classList.add('is-listo'));

  /* ---------- Asiento que cuadra ---------- */
  const asiento = $('[data-asiento]');
  const filas = $$('.pd-asiento__filas li', asiento);
  const totales = $$('.pd-asiento__total [data-num]', asiento);
  const cargarAsiento = async () => {
    await espera(700);
    for (const li of filas) {
      li.classList.add('is-in');
      const b = $('[data-num]', li);
      rodar(b, +b.dataset.num, 900);
      await espera(380);
    }
    await espera(650);
    await Promise.all(totales.map((b) => rodar(b, +b.dataset.num, 1000)));
    asiento.classList.add('is-cuadra');
  };
  new IntersectionObserver((ents, io) => {
    if (ents[0].isIntersecting) { io.disconnect(); cargarAsiento(); }
  }, { threshold: .35 }).observe(asiento);

  /* ---------- Plan de cuentas ---------- */
  const cuentas = $$('.pd-cuenta');
  const abrirCuenta = (c, si) => { c.classList.toggle('is-abierta', si); $('button', c).setAttribute('aria-expanded', si); };
  cuentas.forEach((c) => $('button', c).addEventListener('click', () => {
    const si = !c.classList.contains('is-abierta');
    cuentas.forEach((o) => abrirCuenta(o, false));
    abrirCuenta(c, si);
  }));
  abrirCuenta(cuentas[0], true);

  /* ---------- Vencimientos ---------- */
  // Reglas ilustrativas: día base + corrimiento por terminación de CUIT; si cae en fin de semana o feriado pasa al siguiente hábil.
  const OBLIG = [
    { id: 'aut', nombre: 'Autónomos', det: 'Aportes previsionales', c: '#7a7d5a', dia: (d) => 5 + Math.floor(d / 4) },
    { id: '931', nombre: 'Cargas sociales · F.931', det: 'Aportes y contribuciones del personal', c: '#4a6378', dia: (d) => 9 + Math.floor(d / 4) },
    { id: 'gan', nombre: 'Ganancias · anticipo', det: 'Personas humanas y sociedades', c: '#9b5a46', dia: (d) => 13 + Math.floor(d / 4) },
    { id: 'iibb', nombre: 'Ingresos Brutos', det: 'Régimen local o Convenio Multilateral', c: '#6b4c63', dia: (d) => 16 + Math.floor(d / 4) },
    { id: 'iva', nombre: 'IVA', det: 'Declaración jurada mensual', c: '#1d3a32', dia: (d) => 18 + Math.floor(d / 2) },
    { id: 'mono', nombre: 'Monotributo', det: 'Cuota mensual, igual para todos', c: '#9a7b4f', dia: () => 20 },
  ];
  const FERIADOS_FIJOS = ['1-1', '3-24', '4-2', '5-1', '5-25', '6-20', '7-9', '12-8', '12-25'];
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  // Pasada la mitad del mes, se muestra el siguiente: es el que le importa a quien entra.
  const base = new Date(hoy.getFullYear(), hoy.getMonth() + (hoy.getDate() > 15 ? 1 : 0), 1);
  const anio = base.getFullYear(), mes = base.getMonth(), diasMes = new Date(anio, mes + 1, 0).getDate();
  const esFeriado = (dia) => FERIADOS_FIJOS.includes(`${mes + 1}-${dia}`);
  const esHabil = (dia) => { const w = new Date(anio, mes, dia).getDay(); return w !== 0 && w !== 6 && !esFeriado(dia); };
  const habil = (dia) => { while (dia < diasMes && !esHabil(dia)) dia++; return dia; };

  $('[data-mes]').textContent = `${MESES[mes]} ${anio}`;
  const grilla = $('[data-grilla]'), agenda = $('[data-agenda]'), cajaDig = $('[data-digitos]');
  const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7; // lunes = 0

  let celdas = [];
  const armarGrilla = () => {
    let html = '';
    for (let i = 0; i < desfase; i++) html += '<div class="pd-dia is-vacio"></div>';
    for (let d = 1; d <= diasMes; d++) {
      const w = new Date(anio, mes, d).getDay();
      const cls = ['pd-dia'];
      if (w === 0 || w === 6) cls.push('is-finde');
      if (esFeriado(d)) cls.push('is-feriado');
      if (new Date(anio, mes, d).getTime() === hoy.getTime()) cls.push('is-hoy');
      html += `<div class="${cls.join(' ')}">${d}<span class="pd-dia__marcas"></span></div>`;
    }
    const resto = (7 - ((desfase + diasMes) % 7)) % 7;
    for (let i = 0; i < resto; i++) html += '<div class="pd-dia is-vacio"></div>';
    grilla.innerHTML = html;
    celdas = $$('.pd-dia:not(.is-vacio)', grilla);
  };

  const mostrar = (dig) => {
    $$('button', cajaDig).forEach((b) => b.setAttribute('aria-checked', b.dataset.d == dig));
    const lista = OBLIG.map((o) => ({ ...o, fecha: habil(o.dia(dig)) })).sort((a, b) => a.fecha - b.fecha);
    celdas.forEach((c) => { c.classList.remove('is-vence'); $('.pd-dia__marcas', c).innerHTML = ''; });
    lista.forEach((o, i) => {
      const c = celdas[o.fecha - 1];
      c.classList.add('is-vence');
      $('.pd-dia__marcas', c).insertAdjacentHTML('beforeend', `<i style="--c:${o.c};--d:${i * .06}s" title="${o.nombre}"></i>`);
    });
    agenda.innerHTML = lista.map((o, i) => {
      const f = new Date(anio, mes, o.fecha);
      const n = Math.round((f - hoy) / 864e5);
      const cuando = n < 0 ? 'vencido' : n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`;
      return `<li style="--c:${o.c};--d:${i * .05}s"><time datetime="${anio}-${String(mes + 1).padStart(2, '0')}-${String(o.fecha).padStart(2, '0')}">${o.fecha}<small>${SEM[f.getDay()]}</small></time><div><b>${o.nombre}</b><p>${o.det}</p></div><em>${cuando}</em></li>`;
    }).join('');
    try { localStorage.setItem('partida_cuit', dig); } catch {}
  };

  cajaDig.innerHTML = Array.from({ length: 10 }, (_, d) => `<button type="button" role="radio" data-d="${d}" aria-checked="false" aria-label="CUIT terminado en ${d}">${d}</button>`).join('');
  cajaDig.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) mostrar(+b.dataset.d); });
  // Flechas para moverse entre dígitos, como un radiogroup.
  cajaDig.addEventListener('keydown', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const mov = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!mov) return;
    e.preventDefault();
    const d = (+b.dataset.d + mov + 10) % 10;
    mostrar(d); $(`button[data-d="${d}"]`, cajaDig).focus();
  });
  armarGrilla();
  let inicial = 4;
  try { const g = localStorage.getItem('partida_cuit'); if (g !== null && /^\d$/.test(g)) inicial = +g; } catch {}
  mostrar(inicial);

  /* ---------- Cifras ---------- */
  const ioCifras = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    ioCifras.unobserve(e.target);
    rodar(e.target, +e.target.dataset.cuenta, 1600, 'miles' in e.target.dataset);
  }), { threshold: .6 });
  $$('[data-cuenta]').forEach((b) => ioCifras.observe(b));

  /* ---------- Formulario (de ejemplo: no envía) ---------- */
  const form = $('[data-form]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach((i) => { const mal = !i.checkValidity() || !i.value.trim(); i.classList.toggle('is-error', mal); if (mal && ok) { i.focus(); ok = false; } });
    if (!ok) return;
    $('[data-ok]', form).hidden = false;
    $('button[type="submit"]', form).disabled = true;
  });
})();
