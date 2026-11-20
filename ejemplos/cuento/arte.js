/* ==========================================================================
   Cuento · ilustraciones (sprite SVG compartido por las cuatro páginas)
   Se inserta al principio del <body> con un <script> normal (no defer), así
   los <use href="#…"> pintan en cualquier navegador, también abriendo el HTML
   directo (file://), sin repetir el SVG en cada página.
   Símbolos:
     #mono        monograma: óvalo + C en script (como el logo)
     #plato       plato de porcelana visto desde arriba, con el filete rojo
     #medialuna   medialuna / croissant desde arriba
     #croissant-dulce  croissant relleno de dulce rojo
     #taza        taza con latte art sobre plato con filete rojo (desde arriba)
     #tarta       tarta de hojaldre con crema y frutillas
     #palmerita   palmerita (corazón de hojaldre caramelizado)
     #alfajor     alfajor de dulce de leche
     #iced        iced latte con dulce de leche en vaso
     #bolsa       bolsa de café en grano con la marca
     #tostadas    tostadas con manteca y dulce de leche, en su plato
   ========================================================================== */
document.body.insertAdjacentHTML('afterbegin', `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="cu-porc" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f6f2ec"/><stop offset="1" stop-color="#ddd6cc"/></radialGradient>
    <radialGradient id="cu-masa" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#f6cf8a"/><stop offset=".5" stop-color="#dc9a48"/><stop offset="1" stop-color="#9e5a20"/></radialGradient>
    <radialGradient id="cu-latte" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#cfa274"/><stop offset=".6" stop-color="#9a6337"/><stop offset="1" stop-color="#4c2a14"/></radialGradient>
    <radialGradient id="cu-frutilla" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".55" stop-color="#d4202c"/><stop offset="1" stop-color="#8c0f18"/></radialGradient>
    <linearGradient id="cu-hojaldre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7a95a"/><stop offset=".5" stop-color="#c47a30"/><stop offset="1" stop-color="#8a4c18"/></linearGradient>
    <linearGradient id="cu-galleta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d3a0"/><stop offset="1" stop-color="#c99a5e"/></linearGradient>
    <linearGradient id="cu-papel" x1="0" x2="1"><stop offset="0" stop-color="#d9d3ca"/><stop offset=".3" stop-color="#fffdf9"/><stop offset=".7" stop-color="#f1ece4"/><stop offset="1" stop-color="#c9c1b6"/></linearGradient>
    <linearGradient id="cu-vidrio" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".2" stop-color="#fff" stop-opacity=".1"/><stop offset=".8" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>
    <linearGradient id="cu-latte-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe2cf"/><stop offset=".45" stop-color="#d2a77a"/><stop offset="1" stop-color="#a26a3c"/></linearGradient>
    <linearGradient id="cu-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4f2"/><stop offset=".5" stop-color="#a9a8a4"/><stop offset="1" stop-color="#6d6c69"/></linearGradient>
    <filter id="cu-sombra" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>

  <symbol id="mono" viewBox="0 0 100 100">
    <ellipse cx="50" cy="50" rx="27" ry="38" transform="rotate(-28 50 50)" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <text x="49" y="72" text-anchor="middle" font-family="Pinyon Script, Snell Roundhand, cursive" font-size="74" fill="currentColor">C</text>
  </symbol>

  <symbol id="plato" viewBox="0 0 400 400">
    <circle cx="206" cy="212" r="186" fill="#3b2a20" opacity=".22" filter="url(#cu-sombra)"/>
    <circle cx="200" cy="200" r="186" fill="url(#cu-porc)"/>
    <circle cx="200" cy="200" r="130" fill="none" stroke="#e7e1d8" stroke-width="2"/>
    <circle cx="200" cy="200" r="168" fill="none" stroke="#b3262d" stroke-width="5" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:var(--rim,0)"/>
  </symbol>

  <symbol id="medialuna" viewBox="0 0 400 400">
    <g stroke="#8f5019" stroke-width="2.5" stroke-opacity=".55">
      <ellipse cx="82" cy="236" rx="34" ry="22" transform="rotate(-52 82 236)" fill="url(#cu-masa)"/>
      <ellipse cx="318" cy="236" rx="34" ry="22" transform="rotate(52 318 236)" fill="url(#cu-masa)"/>
      <ellipse cx="128" cy="180" rx="50" ry="40" transform="rotate(-32 128 180)" fill="url(#cu-masa)"/>
      <ellipse cx="272" cy="180" rx="50" ry="40" transform="rotate(32 272 180)" fill="url(#cu-masa)"/>
      <ellipse cx="200" cy="158" rx="58" ry="52" fill="url(#cu-masa)"/>
    </g>
    <g fill="#fff" opacity=".35">
      <ellipse cx="184" cy="134" rx="22" ry="9" transform="rotate(-18 184 134)"/>
      <ellipse cx="116" cy="164" rx="14" ry="6" transform="rotate(-40 116 164)"/>
      <ellipse cx="260" cy="158" rx="14" ry="6" transform="rotate(20 260 158)"/>
    </g>
  </symbol>

  <symbol id="croissant-dulce" viewBox="0 0 400 400">
    <use href="#medialuna"/>
    <path d="M150 168 C170 140 230 140 250 168 C238 196 162 196 150 168 Z" fill="#a8121f"/>
    <path d="M168 162 C182 152 206 150 222 156" stroke="#ff8a8a" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>
  </symbol>

  <symbol id="taza" viewBox="0 0 400 400">
    <circle cx="206" cy="210" r="150" fill="#3b2a20" opacity=".22" filter="url(#cu-sombra)"/>
    <circle cx="200" cy="200" r="150" fill="url(#cu-porc)"/>
    <circle cx="200" cy="200" r="136" fill="none" stroke="#b3262d" stroke-width="4.5" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:var(--rim,0)"/>
    <g transform="rotate(-38 200 200)"><rect x="232" y="292" width="92" height="9" rx="4.5" fill="url(#cu-metal)"/><ellipse cx="232" cy="296" rx="18" ry="11" fill="url(#cu-metal)"/></g>
    <rect x="276" y="186" width="54" height="26" rx="13" fill="#f3eee7" stroke="#d7d0c6" stroke-width="2"/>
    <circle cx="200" cy="200" r="94" fill="#fffefb" stroke="#ded7cd" stroke-width="2"/>
    <circle cx="200" cy="200" r="88" fill="none" stroke="#b3262d" stroke-width="3" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:var(--rim,0)"/>
    <circle cx="200" cy="200" r="80" fill="url(#cu-latte)"/>
    <path transform="translate(200 204) scale(1.25)" d="M0 30 C-40 0 -46 -30 -20 -35 C-8 -37 0 -28 0 -18 C0 -28 8 -37 20 -35 C46 -30 40 0 0 30 Z" fill="#f6ead6"/>
    <path transform="translate(200 204) scale(1.25)" d="M0 22 C-26 2 -30 -20 -14 -24" fill="none" stroke="#e0c49e" stroke-width="3"/>
  </symbol>

  <symbol id="frutilla" viewBox="-30 -30 60 60">
    <path d="M0 -24 C18 -24 24 -6 15 10 C8 22 -8 22 -15 10 C-24 -6 -18 -24 0 -24 Z" fill="url(#cu-frutilla)"/>
    <g fill="#ffd9a0" opacity=".85"><circle cx="-6" cy="-8" r="1.4"/><circle cx="6" cy="-4" r="1.4"/><circle cx="-2" cy="4" r="1.4"/><circle cx="8" cy="8" r="1.2"/><circle cx="-9" cy="6" r="1.2"/></g>
    <ellipse cx="-6" cy="-14" rx="6" ry="3" fill="#fff" opacity=".45" transform="rotate(-30 -6 -14)"/>
  </symbol>

  <symbol id="tarta" viewBox="0 0 400 400">
    <ellipse cx="204" cy="318" rx="150" ry="26" fill="#3b2a20" opacity=".3" filter="url(#cu-sombra)"/>
    <path d="M64 262 v34 a136 38 0 0 0 272 0 v-34 Z" fill="url(#cu-hojaldre)"/>
    <g stroke="#f3c47e" stroke-width="2" opacity=".6"><path d="M70 276 a130 34 0 0 0 260 0"/><path d="M68 288 a132 36 0 0 0 264 0"/></g>
    <ellipse cx="200" cy="262" rx="136" ry="38" fill="#d48d40"/>
    <ellipse cx="200" cy="256" rx="112" ry="28" fill="#f4dc95"/>
    <ellipse cx="190" cy="250" rx="60" ry="10" fill="#fff6d2" opacity=".6"/>
    <use href="#frutilla" x="96" y="186" width="70" height="70"/>
    <use href="#frutilla" x="150" y="168" width="78" height="78"/>
    <use href="#frutilla" x="214" y="176" width="74" height="74"/>
    <use href="#frutilla" x="252" y="204" width="62" height="62"/>
    <use href="#frutilla" x="120" y="214" width="64" height="64"/>
    <use href="#frutilla" x="186" y="214" width="66" height="66"/>
    <g fill="#fff" opacity=".85"><circle cx="120" cy="268" r="2"/><circle cx="160" cy="282" r="1.6"/><circle cx="240" cy="280" r="2"/><circle cx="290" cy="262" r="1.6"/><circle cx="200" cy="288" r="1.8"/></g>
  </symbol>

  <symbol id="palmerita" viewBox="0 0 400 400">
    <path d="M206 318 C126 278 86 236 96 184 C106 134 172 124 206 162 C240 124 306 134 316 184 C326 236 286 278 206 318 Z" fill="#3b2a20" opacity=".25" filter="url(#cu-sombra)"/>
    <path d="M200 306 C120 266 80 226 90 176 C100 126 166 116 200 154 C234 116 300 126 310 176 C320 226 280 266 200 306 Z" fill="url(#cu-masa)"/>
    <g fill="none" stroke="#8f4a14" stroke-width="6" stroke-linecap="round" opacity=".75">
      <path d="M156 186 A8 8 0 0 1 172 186 A16 16 0 0 1 140 186 A24 24 0 0 1 188 186 A32 32 0 0 1 124 186 A40 40 0 0 1 196 190"/>
      <g transform="translate(400 0) scale(-1 1)"><path d="M156 186 A8 8 0 0 1 172 186 A16 16 0 0 1 140 186 A24 24 0 0 1 188 186 A32 32 0 0 1 124 186 A40 40 0 0 1 196 190"/></g>
    </g>
    <g fill="#fff8e6" opacity=".8"><circle cx="130" cy="220" r="2.2"/><circle cx="168" cy="244" r="2"/><circle cx="240" cy="238" r="2.2"/><circle cx="276" cy="210" r="2"/><circle cx="200" cy="268" r="2"/><circle cx="150" cy="150" r="1.8"/><circle cx="256" cy="152" r="1.8"/></g>
  </symbol>

  <symbol id="alfajor" viewBox="0 0 400 400">
    <ellipse cx="206" cy="300" rx="120" ry="22" fill="#3b2a20" opacity=".3" filter="url(#cu-sombra)"/>
    <path d="M100 252 v26 a100 28 0 0 0 200 0 v-26 Z" fill="url(#cu-galleta)"/>
    <ellipse cx="200" cy="252" rx="100" ry="28" fill="#e8c38a"/>
    <path d="M104 236 v18 a96 26 0 0 0 192 0 v-18 Z" fill="#6e3814"/>
    <path d="M120 252 q4 14 8 0 M168 262 q5 16 10 0 M236 262 q4 13 8 0 M272 254 q4 12 8 0" fill="#6e3814"/>
    <path d="M102 208 v26 a98 27 0 0 0 196 0 v-26 Z" fill="url(#cu-galleta)"/>
    <ellipse cx="200" cy="208" rx="98" ry="27" fill="#f5e6cc"/>
    <ellipse cx="190" cy="204" rx="70" ry="16" fill="#fffaf0" opacity=".9"/>
    <g fill="#fff" opacity=".9"><circle cx="150" cy="210" r="2"/><circle cx="232" cy="198" r="2"/><circle cx="262" cy="214" r="1.6"/><circle cx="182" cy="220" r="1.6"/></g>
  </symbol>

  <symbol id="iced" viewBox="0 0 400 400">
    <ellipse cx="206" cy="362" rx="90" ry="14" fill="#3b2a20" opacity=".3" filter="url(#cu-sombra)"/>
    <path d="M126 92 L274 92 L262 336 Q260 356 240 356 L160 356 Q140 356 138 336 Z" fill="url(#cu-latte-v)"/>
    <path d="M136 290 L264 290 L262 336 Q260 356 240 356 L160 356 Q140 356 138 336 Z" fill="#5c2f14"/>
    <path d="M128 112 L272 112 L272 132 Q200 140 128 132 Z" fill="#f7efe3"/>
    <g fill="#6e3814" opacity=".9">
      <path d="M150 132 C152 170 146 190 154 220 C158 236 150 250 156 266 L148 268 C142 240 150 220 144 196 C140 170 144 150 142 132 Z"/>
      <path d="M244 132 C246 160 240 186 250 214 L242 216 C234 190 238 160 236 132 Z"/>
    </g>
    <g fill="#fff" opacity=".35" stroke="#fff" stroke-opacity=".6" stroke-width="2">
      <rect x="160" y="140" width="42" height="40" rx="8" transform="rotate(-12 181 160)"/>
      <rect x="206" y="150" width="40" height="38" rx="8" transform="rotate(14 226 169)"/>
    </g>
    <g fill="#7a4420"><circle cx="180" cy="118" r="2"/><circle cx="212" cy="114" r="1.6"/><circle cx="236" cy="120" r="2"/></g>
    <path d="M120 86 L280 86 L266 340 Q264 362 240 362 L160 362 Q136 362 134 340 Z" fill="url(#cu-vidrio)" stroke="#d9d2c8" stroke-width="3"/>
    <path d="M150 104 L160 320" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".5"/>
  </symbol>

  <symbol id="bolsa" viewBox="0 0 400 400">
    <ellipse cx="206" cy="364" rx="110" ry="14" fill="#3b2a20" opacity=".3" filter="url(#cu-sombra)"/>
    <path d="M112 96 L288 96 L300 360 L100 360 Z" fill="url(#cu-papel)"/>
    <path d="M112 96 L288 96 L290 128 L110 128 Z" fill="#e9e3da"/>
    <g stroke="#c9c1b6" stroke-width="2"><path d="M112 104 H288"/><path d="M111 112 H289"/><path d="M111 120 H289"/></g>
    <circle cx="200" cy="146" r="4" fill="#c9c1b6"/>
    <text x="200" y="250" text-anchor="middle" font-family="Pinyon Script, Snell Roundhand, cursive" font-size="78" fill="#b3262d" transform="rotate(-8 200 240)">Cuento</text>
    <text x="200" y="306" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="3" fill="#7a6f64">CAFÉ DE ESPECIALIDAD</text>
    <text x="200" y="326" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="3" fill="#7a6f64">250 G · EN GRANO</text>
    <path d="M130 140 L124 340" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".5"/>
  </symbol>

  <symbol id="tostadas" viewBox="0 0 400 400">
    <use href="#plato"/>
    <g transform="rotate(-14 160 200)">
      <rect x="86" y="122" width="132" height="150" rx="34" fill="#8a4f1f"/>
      <rect x="96" y="132" width="112" height="130" rx="28" fill="#d9a35c"/>
      <rect x="120" y="160" width="40" height="30" rx="8" fill="#fbecaa"/>
    </g>
    <g transform="rotate(10 250 210)">
      <rect x="176" y="150" width="128" height="146" rx="34" fill="#7f4719"/>
      <rect x="186" y="160" width="108" height="126" rx="28" fill="#cf9550"/>
    </g>
    <circle cx="282" cy="292" r="44" fill="#fffefb" stroke="#ddd6cc" stroke-width="3"/>
    <circle cx="282" cy="292" r="34" fill="#8a4a1c"/>
    <ellipse cx="272" cy="282" rx="12" ry="6" fill="#c2763a" opacity=".7"/>
  </symbol>
</svg>`);
