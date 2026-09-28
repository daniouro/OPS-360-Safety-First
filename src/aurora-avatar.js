/*!
 * Aurora · Avatar animado — OPS 360° Safety First
 * Versão 49.202.0
 *
 * <aurora-avatar> — rosto animado que substitui o logo na conversa.
 * Pisca, respira, olha para quem está digitando, pensa, fala (com
 * sincronia labial) e reage com expressões ao que o usuário escreve.
 *
 * Uso:  <aurora-avatar tamanho="44"></aurora-avatar>
 *       avatar.estado = 'ouvindo' | 'pensando' | 'falando' | 'ocioso'
 *       avatar.emocao = 'neutra' | 'feliz' | 'preocupada' | 'empatica' | 'curiosa' | 'surpresa'
 *       avatar.falar('texto')   avatar.gesto('sim')   avatar.reagir(resultadoDaAurora)
 */
(function (raiz) {
  'use strict';

  const VERSAO = '49.202.0';
  if (typeof window === 'undefined' || typeof HTMLElement === 'undefined') {
    if (typeof module === 'object' && module.exports) module.exports = { versao: VERSAO };
    return;
  }
  if (window.customElements && window.customElements.get('aurora-avatar')) return;

  const EMOCOES = {
    neutra: { sorriso: 0.9, olhoAberto: 1, olhoSorriso: 0.1, sobrE: 0, sobrD: 0, interno: 0, rubor: 0.12, cabR: 0 },
    feliz: { sorriso: 2.6, olhoAberto: 0.96, olhoSorriso: 0.5, sobrE: 0.9, sobrD: 0.9, interno: -1, rubor: 0.55, cabR: 2 },
    preocupada: { sorriso: -0.7, olhoAberto: 1.08, olhoSorriso: 0, sobrE: 0.8, sobrD: 0.8, interno: 11, rubor: 0, cabR: 0 },
    empatica: { sorriso: 0.3, olhoAberto: 0.92, olhoSorriso: 0.15, sobrE: 0.5, sobrD: 0.5, interno: 8, rubor: 0.15, cabR: 4 },
    curiosa: { sorriso: 0.6, olhoAberto: 1.05, olhoSorriso: 0, sobrE: 2.2, sobrD: 0.1, interno: 1, rubor: 0.1, cabR: -5 },
    surpresa: { sorriso: 0, olhoAberto: 1.2, olhoSorriso: 0, sobrE: 2.6, sobrD: 2.6, interno: 0, rubor: 0.2, cabR: 0, boca: { w: 5.2, a: 3.2, r: 0.9 } }
  };

  const VISEMAS = {
    A: { w: 7.4, a: 5.0, r: 0.1 },
    E: { w: 8.4, a: 3.1, r: 0 },
    I: { w: 8.7, a: 1.8, r: 0 },
    O: { w: 5.6, a: 4.1, r: 0.8 },
    U: { w: 4.8, a: 2.4, r: 1 },
    M: { w: 7.0, a: 0, r: 0.1 },
    F: { w: 7.4, a: 0.8, r: 0 },
    C: { w: 7.2, a: 1.6, r: 0.2 },
    espaco: { w: 7.4, a: 0.5, r: 0.1 },
    pausa: { w: 7.2, a: 0.1, r: 0.1 }
  };

  const GESTOS = {
    sim: { dur: 800, f: (p) => ({ cabY: Math.sin(p * Math.PI * 4) * 1.6 * (1 - p) }) },
    nao: { dur: 900, f: (p) => ({ cabX: Math.sin(p * Math.PI * 6) * 2.2 * (1 - p), cabR: Math.sin(p * Math.PI * 6) * 1.5 * (1 - p) }) },
    aceno: { dur: 1100, f: (p) => ({ cabR: Math.sin(p * Math.PI) * 6, cabY: -Math.sin(p * Math.PI) * 1.4, sobr: p < 0.45 ? Math.sin((p / 0.45) * Math.PI) * 1.8 : 0, sorriso: Math.sin(p * Math.PI) * 1.2 }) },
    sorriso: { dur: 1300, f: (p) => ({ sorriso: Math.sin(p * Math.PI) * 1.3, rubor: Math.sin(p * Math.PI) * 0.35, olhoSorriso: Math.sin(p * Math.PI) * 0.3 }) },
    riso: { dur: 1100, f: (p) => ({ cabY: -Math.abs(Math.sin(p * Math.PI * 5)) * 1.2 * (1 - p), sorriso: 1.5 * Math.sin(p * Math.PI), bocaA: 2.6 * Math.sin(p * Math.PI), olhoSorriso: 0.5 * Math.sin(p * Math.PI) }) },
    inclinar: { dur: 1400, f: (p) => ({ cabR: -Math.sin(p * Math.PI) * 7 }) },
    desculpa: { dur: 1400, f: (p) => ({ cabY: Math.sin(p * Math.PI) * 1.4, cabR: Math.sin(p * Math.PI) * 3, interno: Math.sin(p * Math.PI) * 6 }) }
  };

  const ESTILO = `
    :host {
      --aurora-pele: #e2ab86;
      --aurora-pele-sombra: #c98d6b;
      --aurora-cabelo: #1c2230;
      --aurora-iris: #19b3a3;
      --aurora-labios: #b85563;
      --aurora-uniforme: #13263d;
      --aurora-destaque: #2dd4bf;
      --aurora-destaque-2: #22d3ee;
      --aurora-destaque-3: #818cf8;
      --aurora-fundo: #0b1628;
      --fala: 0;
      display: inline-block;
      position: relative;
      width: var(--aurora-tamanho, 40px);
      height: var(--aurora-tamanho, 40px);
      flex-shrink: 0;
      border-radius: 50%;
      vertical-align: middle;
      -webkit-tap-highlight-color: transparent;
    }
    :host([hidden]) { display: none; }
    .anel {
      position: absolute; inset: 0; border-radius: 50%;
      background: conic-gradient(from 0deg, var(--aurora-destaque), var(--aurora-destaque-2), var(--aurora-destaque-3), var(--aurora-destaque));
      -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - var(--espessura, 2px)), #000 calc(100% - var(--espessura, 2px) + 0.6px));
      mask: radial-gradient(farthest-side, transparent calc(100% - var(--espessura, 2px)), #000 calc(100% - var(--espessura, 2px) + 0.6px));
      animation: girar 9s linear infinite;
      opacity: 0.9;
    }
    .brilho {
      position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
      box-shadow: 0 0 calc(6px + var(--fala) * 10px) rgba(45, 212, 191, calc(0.28 + var(--fala) * 0.35));
      transition: box-shadow .25s ease;
    }
    .retrato {
      position: absolute; inset: var(--espessura, 2px); border-radius: 50%; overflow: hidden;
      background: var(--aurora-fundo);
    }
    svg { display: block; width: 100%; height: 100%; }
    :host([estado="ouvindo"]) .anel { animation-duration: 5s; opacity: 1; }
    :host([estado="ouvindo"]) .brilho { box-shadow: 0 0 12px rgba(45, 212, 191, .55); }
    :host([estado="pensando"]) .anel { animation-duration: 1.3s; opacity: 1; }
    :host([estado="pensando"]) .brilho { animation: pulsar 1.3s ease-in-out infinite; }
    :host([estado="falando"]) .anel { animation-duration: 4s; opacity: 1; }
    :host([estatico]) .anel { animation: none; opacity: .55; }
    :host([estatico]) .brilho { box-shadow: none; }
    @keyframes girar { to { transform: rotate(360deg); } }
    @keyframes pulsar { 50% { box-shadow: 0 0 14px rgba(34, 211, 238, .6); } }
    @media (prefers-reduced-motion: reduce) {
      .anel, :host([estado]) .anel, :host([estado="pensando"]) .brilho { animation: none; }
    }
  `;

  let contador = 0;

  function modeloSVG(id) {
    const u = (n) => n + '-' + id;
    return `
<svg viewBox="16 14 88 88" role="presentation" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="${u('fundo')}" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#16304f"/>
      <stop offset="1" stop-color="#070f1d"/>
    </radialGradient>
    <radialGradient id="${u('aura1')}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="var(--aurora-destaque)" stop-opacity=".55"/>
      <stop offset="1" stop-color="var(--aurora-destaque)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${u('aura2')}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="var(--aurora-destaque-3)" stop-opacity=".45"/>
      <stop offset="1" stop-color="var(--aurora-destaque-3)" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${u('pele')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--aurora-pele)"/>
      <stop offset="1" stop-color="var(--aurora-pele-sombra)"/>
    </linearGradient>
    <linearGradient id="${u('cabelo')}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a3346"/>
      <stop offset="1" stop-color="var(--aurora-cabelo)"/>
    </linearGradient>
    <linearGradient id="${u('mecha')}" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox" spreadMethod="reflect">
      <stop offset="0" stop-color="var(--aurora-destaque)"/>
      <stop offset=".5" stop-color="var(--aurora-destaque-2)"/>
      <stop offset="1" stop-color="var(--aurora-destaque-3)"/>
    </linearGradient>
    <radialGradient id="${u('iris')}" cx="45%" cy="40%" r="60%">
      <stop offset="0" stop-color="#5eead4"/>
      <stop offset=".55" stop-color="var(--aurora-iris)"/>
      <stop offset="1" stop-color="#0b4f4a"/>
    </radialGradient>
    <radialGradient id="${u('rubor')}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#f27d8e" stop-opacity=".9"/>
      <stop offset="1" stop-color="#f27d8e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${u('uniforme')}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b3452"/>
      <stop offset="1" stop-color="var(--aurora-uniforme)"/>
    </linearGradient>
    <clipPath id="${u('olho')}"><path d="M -5.6 0 C -3.7 -4.4, 3.7 -4.4, 5.6 0 C 3.7 3.7, -3.7 3.7, -5.6 0 Z"/></clipPath>
    <clipPath id="${u('boca')}"><path class="boca-clip" d="M 53 76 Q 60 76 67 76 Q 60 77 53 76 Z"/></clipPath>
  </defs>

  <rect x="0" y="0" width="120" height="120" fill="url(#${u('fundo')})"/>
  <g class="aura">
    <ellipse class="aura-a" cx="44" cy="40" rx="30" ry="24" fill="url(#${u('aura1')})"/>
    <ellipse class="aura-b" cx="80" cy="46" rx="28" ry="22" fill="url(#${u('aura2')})"/>
  </g>

  <g class="corpo">
    <path d="M 52 80 L 52 93 C 56 96, 64 96, 68 93 L 68 80 Z" fill="var(--aurora-pele-sombra)"/>
    <path d="M 20 122 C 20 105, 33 95, 50 92.5 C 54 97.5, 66 97.5, 70 92.5 C 87 95, 100 105, 100 122 Z" fill="url(#${u('uniforme')})"/>
    <path d="M 50 92.8 L 60 104.5 L 70 92.8" fill="none" stroke="var(--aurora-destaque)" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>
    <rect x="73.5" y="104" width="8" height="3.2" rx="1" fill="var(--aurora-destaque)" opacity=".85"/>
  </g>

  <g class="cabeca">
    <path class="cabelo-tras" fill="url(#${u('cabelo')})"
      d="M 60 22.5 C 82.5 22.5, 91.5 40, 90.5 58 C 90 72, 88.5 82, 84.5 90.5 C 79.5 88.5, 77 80, 78 72 L 42 72 C 43 80, 40.5 88.5, 35.5 90.5 C 31.5 82, 30 72, 29.5 58 C 28.5 40, 37.5 22.5, 60 22.5 Z"/>
    <path class="rosto" fill="url(#${u('pele')})"
      d="M 60 29 C 76 29, 84 42, 83.5 56 C 83 70, 74 84, 60 85.5 C 46 84, 37 70, 36.5 56 C 36 42, 44 29, 60 29 Z"/>
    <ellipse class="rubor-e" cx="45.5" cy="68.5" rx="5" ry="2.8" fill="url(#${u('rubor')})" opacity=".1"/>
    <ellipse class="rubor-d" cx="74.5" cy="68.5" rx="5" ry="2.8" fill="url(#${u('rubor')})" opacity=".1"/>

    <g class="olho-e" transform="translate(49 57)">
      <path d="M -5.6 0 C -3.7 -4.4, 3.7 -4.4, 5.6 0 C 3.7 3.7, -3.7 3.7, -5.6 0 Z" fill="#f8fafc"/>
      <g clip-path="url(#${u('olho')})">
        <g class="iris-e">
          <circle r="3.3" fill="url(#${u('iris')})"/>
          <circle r="1.55" fill="#07121c"/>
          <circle cx="-1.1" cy="-1.2" r="0.95" fill="#fff"/>
          <circle cx="1.2" cy="0.9" r="0.45" fill="#fff" opacity=".85"/>
        </g>
        <path class="palpebra-inf-e" d="M -6 4 C -3 4, 3 4, 6 4 L 6 7 L -6 7 Z" fill="var(--aurora-pele)"/>
      </g>
      <path d="M -6.1 0.3 C -3.9 -4.8, 3.9 -4.8, 6.1 0.3 L 6.9 -0.9" fill="none" stroke="#1a1420" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    </g>
    <g class="olho-d" transform="translate(71 57)">
      <path d="M -5.6 0 C -3.7 -4.4, 3.7 -4.4, 5.6 0 C 3.7 3.7, -3.7 3.7, -5.6 0 Z" fill="#f8fafc"/>
      <g clip-path="url(#${u('olho')})">
        <g class="iris-d">
          <circle r="3.3" fill="url(#${u('iris')})"/>
          <circle r="1.55" fill="#07121c"/>
          <circle cx="-1.1" cy="-1.2" r="0.95" fill="#fff"/>
          <circle cx="1.2" cy="0.9" r="0.45" fill="#fff" opacity=".85"/>
        </g>
        <path class="palpebra-inf-d" d="M -6 4 C -3 4, 3 4, 6 4 L 6 7 L -6 7 Z" fill="var(--aurora-pele)"/>
      </g>
      <path d="M 6.1 0.3 C 3.9 -4.8, -3.9 -4.8, -6.1 0.3 L -6.9 -0.9" fill="none" stroke="#1a1420" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    </g>

    <path class="sobrancelha-e" transform="translate(49 48)" d="M -6.2 1.2 Q -0.5 -2.4 6 0.2" fill="none" stroke="#2a2230" stroke-width="2.1" stroke-linecap="round"/>
    <path class="sobrancelha-d" transform="translate(71 48)" d="M 6.2 1.2 Q 0.5 -2.4 -6 0.2" fill="none" stroke="#2a2230" stroke-width="2.1" stroke-linecap="round"/>

    <path d="M 58.6 64.2 Q 60.2 67.4 62 65.8" fill="none" stroke="var(--aurora-pele-sombra)" stroke-width="1.1" stroke-linecap="round" opacity=".9"/>

    <g class="boca">
      <path class="boca-forma" d="M 53 76 Q 60 76 67 76 Q 60 77 53 76 Z" fill="#5b1a28" stroke="var(--aurora-labios)" stroke-width="1.25" stroke-linejoin="round"/>
      <g clip-path="url(#${u('boca')})">
        <path class="dentes" d="" fill="#f8fafc" opacity="0"/>
        <ellipse class="lingua" cx="60" cy="81" rx="3.4" ry="1.8" fill="#d9707e" opacity="0"/>
      </g>
    </g>

    <path class="franja" fill="url(#${u('cabelo')})"
      d="M 36.2 53 C 35.5 36, 46 26, 61 26 C 75.5 26, 85 36, 84.2 51 C 80.5 43.5, 74.5 38.8, 66.5 37.2 C 62.5 42.5, 53.5 46.5, 44.5 47 C 40.5 47.4, 38 49.5, 36.2 53 Z"/>
    <path class="mecha" d="M 43.5 34.5 C 51.5 29, 64 28.2, 75 32.5" fill="none" stroke="url(#${u('mecha')})" stroke-width="2.2" stroke-linecap="round" opacity=".95"/>
    <path d="M 40 43.5 C 44 38, 49.5 35.2, 55 34.2" fill="none" stroke="url(#${u('mecha')})" stroke-width="1.1" stroke-linecap="round" opacity=".6"/>

    <g class="acessorio-fone">
      <path d="M 32.5 57 C 31 29, 89 29, 87.5 57" fill="none" stroke="#1d2b3f" stroke-width="3" stroke-linecap="round"/>
      <path d="M 34 50 C 36 33, 84 33, 86 50" fill="none" stroke="var(--aurora-destaque)" stroke-width=".7" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="33" cy="59" rx="4.3" ry="5.8" fill="#16233a" stroke="var(--aurora-destaque)" stroke-width=".8"/>
      <ellipse cx="87" cy="59" rx="3.8" ry="5.3" fill="#16233a" stroke="var(--aurora-destaque)" stroke-width=".6" opacity=".9"/>
      <path d="M 34.5 64 C 36 74.5, 44 80, 51.2 79.2" fill="none" stroke="#1d2b3f" stroke-width="1.8" stroke-linecap="round"/>
      <circle class="microfone" cx="52.2" cy="79" r="1.7" fill="var(--aurora-destaque)"/>
    </g>
    <g class="acessorio-capacete" display="none">
      <path d="M 33.5 49 C 33 24, 87 24, 86.5 49 Z" fill="#f4f7fb"/>
      <path d="M 58 25.6 C 58.6 33, 58.6 41, 58 49 L 62 49 C 61.4 41, 61.4 33, 62 25.6 Z" fill="var(--aurora-destaque)" opacity=".85"/>
      <path d="M 29 49.5 C 45 45.5, 75 45.5, 91 49.5 L 91 52.6 C 75 48.8, 45 48.8, 29 52.6 Z" fill="#dfe6ef"/>
    </g>
  </g>
</svg>`;
  }

  // Ponteiro compartilhado: a Aurora acompanha o cursor com o olhar.
  const ponteiro = { x: 0, y: 0, t: 0 };
  let ouvindoPonteiro = false;
  function escutarPonteiro() {
    if (ouvindoPonteiro) return;
    ouvindoPonteiro = true;
    window.addEventListener('pointermove', (ev) => {
      ponteiro.x = ev.clientX;
      ponteiro.y = ev.clientY;
      ponteiro.t = performance.now();
    }, { passive: true });
  }

  const aprox = (atual, alvo, dt, k) => atual + (alvo - atual) * (1 - Math.exp(-k * dt));
  const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
  const semAcentos = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

  class AuroraAvatar extends HTMLElement {
    static get observedAttributes() {
      return ['estado', 'emocao', 'tamanho', 'estatico', 'acessorio', 'nome'];
    }

    constructor() {
      super();
      this._id = 'aa' + ++contador;
      this._raiz = this.attachShadow({ mode: 'open' });
      this._raiz.innerHTML = '<style>' + ESTILO + '</style><div class="anel"></div><div class="brilho"></div><div class="retrato">' + modeloSVG(this._id) + '</div>';
      const q = (s) => this._raiz.querySelector(s);
      this._el = {
        cabeca: q('.cabeca'), corpo: q('.corpo'), aura: q('.aura'),
        olhoE: q('.olho-e'), olhoD: q('.olho-d'), irisE: q('.iris-e'), irisD: q('.iris-d'),
        palpE: q('.palpebra-inf-e'), palpD: q('.palpebra-inf-d'),
        sobrE: q('.sobrancelha-e'), sobrD: q('.sobrancelha-d'),
        boca: q('.boca-forma'), bocaClip: q('.boca-clip'), dentes: q('.dentes'), lingua: q('.lingua'),
        ruborE: q('.rubor-e'), ruborD: q('.rubor-d'), microfone: q('.microfone'),
        mecha: this._raiz.getElementById('mecha-' + this._id),
        fone: q('.acessorio-fone'), capacete: q('.acessorio-capacete')
      };
      this._v = { cabX: 0, cabY: 0, cabR: 0, olhX: 0, olhY: 0, olhoAberto: 1, olhoSorriso: 0.1, sobrE: 0, sobrD: 0, interno: 0, bocaW: 7.2, bocaA: 0.2, bocaR: 0.1, sorriso: 0.9, rubor: 0.12, fala: 0 };
      this._estado = 'ocioso';
      this._emocao = 'neutra';
      this._gestos = [];
      this._fala = null;
      this._alvoOlhar = null;
      this._sacada = { x: 0, y: 0 };
      this._proximaSacada = 0;
      this._proximaPiscada = 0;
      this._inicioPiscada = -1000;
      this._piscadaDupla = false;
      this._tAnterior = 0;
      this._visivel = true;
      this._loop = this._loop.bind(this);
      this._reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.setAttribute('role', 'img');
    }

    connectedCallback() {
      if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', this.getAttribute('nome') || 'Aurora');
      this._aplicarTamanho();
      this._aplicarAcessorio();
      if ('IntersectionObserver' in window) {
        this._observador = new IntersectionObserver((entradas) => {
          this._visivel = entradas[0].isIntersecting;
          if (this._visivel) this._iniciar();
        });
        this._observador.observe(this);
      }
      escutarPonteiro();
      this._desenhar(0.016, performance.now());
      this._iniciar();
    }

    disconnectedCallback() {
      if (this._observador) this._observador.disconnect();
      cancelAnimationFrame(this._raf);
      this._raf = null;
      if (this._fala && this._fala.resolver) this._fala.resolver();
    }

    attributeChangedCallback(nome, antigo, novo) {
      if (antigo === novo) return;
      if (nome === 'estado') this._estado = novo || 'ocioso';
      else if (nome === 'emocao') this._emocao = EMOCOES[novo] ? novo : 'neutra';
      else if (nome === 'tamanho') this._aplicarTamanho();
      else if (nome === 'acessorio') this._aplicarAcessorio();
      else if (nome === 'nome') this.setAttribute('aria-label', novo || 'Aurora');
      else if (nome === 'estatico') {
        if (novo === null) this._iniciar();
        else this._congelarRosto();
      }
    }

    // ------------------------------------------------------------ API
    get estado() { return this._estado; }
    set estado(v) { this.setAttribute('estado', v || 'ocioso'); }
    get emocao() { return this._emocao; }
    set emocao(v) { this.setAttribute('emocao', v || 'neutra'); }
    get versao() { return VERSAO; }

    gesto(nome) {
      if (!GESTOS[nome] || this._reduzido || this.hasAttribute('estatico')) return;
      this._gestos = this._gestos.filter((g) => g.nome !== nome);
      this._gestos.push({ nome, inicio: performance.now() });
      this._iniciar();
    }

    piscar() {
      this._inicioPiscada = performance.now();
    }

    // alvo: Element, {x, y} (coordenadas da janela) ou null para olhar para frente.
    olharPara(alvo) {
      this._alvoOlhar = alvo || null;
    }

    // Reage ao resultado da Aurora ({ emocao, gesto }) — expressão temporária + gesto.
    reagir(resultado, duracao) {
      if (!resultado) return;
      const emocao = resultado.emocao && EMOCOES[resultado.emocao] ? resultado.emocao : null;
      if (emocao) {
        this.emocao = emocao;
        clearTimeout(this._timerEmocao);
        if (emocao !== 'preocupada') {
          this._timerEmocao = setTimeout(() => { this.emocao = 'neutra'; }, duracao || 7000);
        }
      }
      if (resultado.gesto) this.gesto(resultado.gesto);
    }

    // Anima a boca de acordo com o texto (sincronia labial). Com { continuar: true }
    // o texto é somado à fala atual — ideal para respostas que aparecem aos poucos.
    falar(texto, opcoes) {
      opcoes = opcoes || {};
      const limpo = semAcentos(String(texto || '').replace(/<[^>]+>/g, ' ').replace(/https?:\/\/\S+/g, ' ')).toLowerCase();
      const cps = opcoes.cps || 16;
      const passo = 1000 / cps;
      const eventos = [];
      let t = 0;
      for (const ch of limpo) {
        let v;
        let d = passo;
        if (ch === 'a') v = 'A';
        else if (ch === 'e') v = 'E';
        else if (ch === 'i' || ch === 'y') v = 'I';
        else if (ch === 'o') v = 'O';
        else if (ch === 'u') v = 'U';
        else if (ch === 'm' || ch === 'b' || ch === 'p') v = 'M';
        else if (ch === 'f' || ch === 'v') v = 'F';
        else if (/[a-z0-9]/.test(ch)) v = 'C';
        else if (/[,;:]/.test(ch)) { v = 'pausa'; d = 170; }
        else if (/[.!?…\n]/.test(ch)) { v = ch === '!' || ch === '?' ? 'enfase' : 'pausa'; d = 300; }
        else if (/\s/.test(ch)) { v = 'espaco'; d = passo * 0.6; }
        else continue;
        eventos.push({ t, v });
        t += d;
      }
      const max = opcoes.duracaoMaxima || 6500;
      const escala = t > max ? max / t : 1;
      eventos.forEach((e) => { e.t *= escala; });
      const agora = performance.now();
      if (opcoes.continuar && this._fala && agora < this._fala.inicio + this._fala.fim + 350) {
        const deslocamento = Math.max(agora - this._fala.inicio, this._fala.fim);
        eventos.forEach((e) => { e.t += deslocamento; this._fala.eventos.push(e); });
        this._fala.fim = deslocamento + t * escala;
        return this._fala.promessa;
      }
      if (this._fala && this._fala.resolver) this._fala.resolver();
      let resolver;
      const promessa = new Promise((r) => { resolver = r; });
      this._fala = { inicio: agora, eventos, fim: t * escala, i: 0, resolver, promessa, estadoAnterior: this._estado === 'falando' ? 'ocioso' : this._estado };
      this.estado = 'falando';
      this._iniciar();
      return promessa;
    }

    pararDeFalar() {
      if (!this._fala) return;
      const resolver = this._fala.resolver;
      this._fala = null;
      if (this._estado === 'falando') this.estado = 'ocioso';
      if (resolver) resolver();
    }

    congelar() { this.setAttribute('estatico', ''); }
    animar() { this.removeAttribute('estatico'); }

    // --------------------------------------------------------- internos
    _aplicarTamanho() {
      const t = parseFloat(this.getAttribute('tamanho'));
      if (t > 0) {
        this.style.setProperty('--aurora-tamanho', t + 'px');
        this.style.setProperty('--espessura', Math.max(1.5, Math.round(t * 0.05 * 2) / 2) + 'px');
      }
    }

    _aplicarAcessorio() {
      const a = this.getAttribute('acessorio') || 'fone';
      this._el.fone.setAttribute('display', a === 'fone' ? 'inline' : 'none');
      this._el.capacete.setAttribute('display', a === 'capacete' ? 'inline' : 'none');
    }

    _congelarRosto() {
      cancelAnimationFrame(this._raf);
      this._raf = null;
      this._fala = null;
      this._gestos = [];
      Object.assign(this._v, { cabX: 0, cabY: 0, cabR: 0, olhX: 0, olhY: 0, olhoAberto: 1, olhoSorriso: 0.1, sobrE: 0, sobrD: 0, interno: 0, bocaW: 7.2, bocaA: 0.1, bocaR: 0.1, sorriso: 0.9, rubor: 0.1, fala: 0 });
      this._aplicar(1, 0);
    }

    _iniciar() {
      if (this._raf || this.hasAttribute('estatico') || !this.isConnected) return;
      this._tAnterior = performance.now();
      this._raf = requestAnimationFrame(this._loop);
    }

    _loop(t) {
      this._raf = null;
      if (!this.isConnected || this.hasAttribute('estatico')) return;
      const dt = Math.min(0.05, Math.max(0.001, (t - this._tAnterior) / 1000));
      this._tAnterior = t;
      if (this._visivel) this._desenhar(dt, t);
      this._raf = requestAnimationFrame(this._loop);
    }

    _vetorOlhar() {
      let alvo = this._alvoOlhar;
      const agora = performance.now();
      if (!alvo && this._estado === 'ocioso' && agora - ponteiro.t < 2500 && !this._reduzido) alvo = ponteiro;
      if (!alvo) return null;
      let x;
      let y;
      if (alvo.getBoundingClientRect) {
        if (!alvo.isConnected) { this._alvoOlhar = null; return null; }
        const r = alvo.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      } else {
        x = alvo.x;
        y = alvo.y;
      }
      const eu = this.getBoundingClientRect();
      const dx = x - (eu.left + eu.width / 2);
      const dy = y - (eu.top + eu.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const forca = Math.min(1, dist / 220);
      return { x: (dx / dist) * 2.1 * forca, y: (dy / dist) * 1.5 * forca };
    }

    _desenhar(dt, t) {
      const est = this._estado;
      const emo = EMOCOES[this._emocao] || EMOCOES.neutra;
      const seg = t / 1000;
      const alvo = {
        cabX: 0, cabY: 0, cabR: emo.cabR, olhX: 0, olhY: 0,
        olhoAberto: emo.olhoAberto, olhoSorriso: emo.olhoSorriso,
        sobrE: emo.sobrE, sobrD: emo.sobrD, interno: emo.interno,
        bocaW: emo.boca ? emo.boca.w : 7.2, bocaA: emo.boca ? emo.boca.a : 0.15, bocaR: emo.boca ? emo.boca.r : 0.1,
        sorriso: emo.sorriso, rubor: emo.rubor, fala: 0
      };

      if (est === 'ouvindo') {
        alvo.sobrE += 0.4; alvo.sobrD += 0.4; alvo.olhoAberto += 0.03; alvo.cabR += 2.5; alvo.olhX = 1.2; alvo.olhY = 1;
      } else if (est === 'pensando') {
        const lado = Math.sin(seg * 0.9) > -0.3 ? -1 : 1;
        alvo.olhX = 1.6 * lado; alvo.olhY = -1.35; alvo.sobrE += lado < 0 ? 1.3 : 0.2; alvo.sobrD += lado < 0 ? 0.2 : 1.3;
        alvo.interno += 1.5; alvo.sorriso = Math.min(alvo.sorriso, 0.4); alvo.bocaW = 5.8; alvo.bocaA = 0.2; alvo.bocaR = 0.55;
        alvo.cabR -= 3; alvo.cabY -= 0.8;
      }

      const olhar = this._vetorOlhar();
      if (olhar && (est === 'ocioso' || est === 'ouvindo')) {
        alvo.olhX = olhar.x; alvo.olhY = olhar.y; alvo.cabR += olhar.x * 0.9;
      }

      if (!this._reduzido) {
        alvo.cabY += Math.sin((seg * 2 * Math.PI) / 4.2) * 0.55;
        alvo.cabR += Math.sin((seg * 2 * Math.PI) / 9.3) * 1.1 + Math.sin((seg * 2 * Math.PI) / 5.1) * 0.4;
        alvo.cabX += Math.sin((seg * 2 * Math.PI) / 11.7) * 0.5;
        if (t > this._proximaSacada) {
          const amplitude = est === 'pensando' ? 0.4 : 0.7;
          this._sacada = { x: (Math.random() - 0.5) * amplitude * 2, y: (Math.random() - 0.5) * amplitude };
          this._proximaSacada = t + 600 + Math.random() * (est === 'falando' ? 1200 : 2000);
        }
        alvo.olhX += this._sacada.x;
        alvo.olhY += this._sacada.y;
      }

      // Fala: visemas ao longo do tempo.
      if (this._fala) {
        const f = this._fala;
        const decorrido = t - f.inicio;
        while (f.i < f.eventos.length - 1 && f.eventos[f.i + 1].t <= decorrido) f.i++;
        const ev = f.eventos[f.i];
        if (decorrido > f.fim + 120) {
          const anterior = f.estadoAnterior;
          const resolver = f.resolver;
          this._fala = null;
          if (this._estado === 'falando') this.estado = anterior && anterior !== 'pensando' ? anterior : 'ocioso';
          if (resolver) resolver();
        } else if (ev) {
          const vis = VISEMAS[ev.v === 'enfase' ? 'pausa' : ev.v] || VISEMAS.espaco;
          alvo.bocaW = vis.w; alvo.bocaA = vis.a; alvo.bocaR = vis.r;
          alvo.fala = limitar(vis.a / 5, 0, 1);
          if (ev.v === 'enfase' && decorrido - ev.t < 320) { alvo.sobrE += 0.9; alvo.sobrD += 0.9; alvo.cabY -= 0.6; }
          if (!this._reduzido) alvo.cabR += Math.sin(decorrido / 210) * 0.8;
          alvo.olhX *= 0.4; alvo.olhY *= 0.4;
        }
      }

      // Gestos temporários.
      const agora = performance.now();
      this._gestos = this._gestos.filter((g) => agora - g.inicio < GESTOS[g.nome].dur);
      this._gestos.forEach((g) => {
        const d = GESTOS[g.nome].f((agora - g.inicio) / GESTOS[g.nome].dur);
        if (d.cabX) alvo.cabX += d.cabX;
        if (d.cabY) alvo.cabY += d.cabY;
        if (d.cabR) alvo.cabR += d.cabR;
        if (d.sobr) { alvo.sobrE += d.sobr; alvo.sobrD += d.sobr; }
        if (d.sorriso) alvo.sorriso += d.sorriso;
        if (d.rubor) alvo.rubor += d.rubor;
        if (d.olhoSorriso) alvo.olhoSorriso += d.olhoSorriso;
        if (d.interno) alvo.interno += d.interno;
        if (d.bocaA) alvo.bocaA = Math.max(alvo.bocaA, d.bocaA);
      });

      // Piscadas naturais (às vezes duplas).
      if (t > this._proximaPiscada) {
        this._inicioPiscada = t;
        const dupla = !this._piscadaDupla && Math.random() < 0.15;
        this._piscadaDupla = dupla;
        const base = est === 'pensando' ? 3800 : est === 'falando' ? 2300 : 3000;
        this._proximaPiscada = t + (dupla ? 260 : base * (0.6 + Math.random() * 0.9));
      }
      const fase = t - this._inicioPiscada;
      let piscar = 1;
      if (fase >= 0 && fase < 170) piscar = fase < 70 ? 1 - fase / 70 : fase < 95 ? 0.04 : Math.min(1, (fase - 95) / 75);

      const v = this._v;
      v.cabX = aprox(v.cabX, alvo.cabX, dt, 6);
      v.cabY = aprox(v.cabY, alvo.cabY, dt, 7);
      v.cabR = aprox(v.cabR, alvo.cabR, dt, 5);
      v.olhX = aprox(v.olhX, limitar(alvo.olhX, -2.2, 2.2), dt, 16);
      v.olhY = aprox(v.olhY, limitar(alvo.olhY, -1.6, 1.6), dt, 16);
      v.olhoAberto = aprox(v.olhoAberto, alvo.olhoAberto, dt, 10);
      v.olhoSorriso = aprox(v.olhoSorriso, limitar(alvo.olhoSorriso, 0, 0.85), dt, 8);
      v.sobrE = aprox(v.sobrE, alvo.sobrE, dt, 9);
      v.sobrD = aprox(v.sobrD, alvo.sobrD, dt, 9);
      v.interno = aprox(v.interno, alvo.interno, dt, 8);
      v.bocaW = aprox(v.bocaW, alvo.bocaW, dt, 20);
      v.bocaA = aprox(v.bocaA, alvo.bocaA, dt, 22);
      v.bocaR = aprox(v.bocaR, alvo.bocaR, dt, 18);
      v.sorriso = aprox(v.sorriso, limitar(alvo.sorriso, -1.5, 4), dt, 7);
      v.rubor = aprox(v.rubor, limitar(alvo.rubor, 0, 0.9), dt, 4);
      v.fala = aprox(v.fala, alvo.fala, dt, 10);
      this._aplicar(piscar, seg);
    }

    _aplicar(piscar, seg) {
      const v = this._v;
      const e = this._el;
      const f = (n) => Math.round(n * 100) / 100;
      e.cabeca.setAttribute('transform', `translate(${f(v.cabX)} ${f(v.cabY)}) rotate(${f(v.cabR)} 60 88)`);
      e.corpo.setAttribute('transform', `translate(${f(v.cabX * 0.25)} ${f(v.cabY * 0.3)})`);
      e.aura.setAttribute('transform', `translate(${f(Math.sin(seg * 0.35) * 3)} ${f(Math.cos(seg * 0.27) * 2)})`);
      const sy = limitar(v.olhoAberto * piscar, 0.04, 1.25);
      e.olhoE.setAttribute('transform', `translate(49 57) scale(1 ${f(sy)})`);
      e.olhoD.setAttribute('transform', `translate(71 57) scale(1 ${f(sy)})`);
      const iris = `translate(${f(v.olhX)} ${f(v.olhY)})`;
      e.irisE.setAttribute('transform', iris);
      e.irisD.setAttribute('transform', iris);
      const inf = f(4 - v.olhoSorriso * 3.4);
      const palp = `M -6 ${inf} C -3 ${f(inf - 1.3 * v.olhoSorriso)}, 3 ${f(inf - 1.3 * v.olhoSorriso)}, 6 ${inf} L 6 7 L -6 7 Z`;
      e.palpE.setAttribute('d', palp);
      e.palpD.setAttribute('d', palp);
      e.sobrE.setAttribute('transform', `translate(49 ${f(48 - v.sobrE)}) rotate(${f(-v.interno)})`);
      e.sobrD.setAttribute('transform', `translate(71 ${f(48 - v.sobrD)}) rotate(${f(v.interno)})`);

      const cx = 60;
      const cy = 76.5;
      const ww = v.bocaW * (1 - v.bocaR * 0.45);
      const a = Math.max(0, v.bocaA);
      const canto = cy - v.sorriso * 0.9 + v.bocaR * 0.3;
      const topo = cy - a * 0.35 - v.sorriso * 0.15 - v.bocaR * a * 0.2;
      const base = cy + a + v.sorriso * 0.85 + v.bocaR * a * 0.15;
      const boca = `M ${f(cx - ww)} ${f(canto)} Q ${cx} ${f(topo)} ${f(cx + ww)} ${f(canto)} Q ${cx} ${f(base)} ${f(cx - ww)} ${f(canto)} Z`;
      e.boca.setAttribute('d', boca);
      e.bocaClip.setAttribute('d', boca);
      const dentes = limitar((a - 1.1) / 1.6, 0, 1);
      if (dentes > 0) {
        const h = Math.min(1.5, a * 0.32);
        e.dentes.setAttribute('d', `M ${f(cx - ww)} ${f(canto - 1)} L ${f(cx + ww)} ${f(canto - 1)} L ${f(cx + ww)} ${f(topo * 0.5 + canto * 0.5 + h)} Q ${cx} ${f(topo + h + 0.8)} ${f(cx - ww)} ${f(topo * 0.5 + canto * 0.5 + h)} Z`);
      }
      e.dentes.setAttribute('opacity', f(dentes * 0.95));
      e.lingua.setAttribute('cy', f(base - 1.2));
      e.lingua.setAttribute('opacity', f(limitar((a - 2) / 2, 0, 0.9)));
      e.ruborE.setAttribute('opacity', f(v.rubor));
      e.ruborD.setAttribute('opacity', f(v.rubor));
      if (e.microfone) e.microfone.setAttribute('opacity', f(0.65 + v.fala * 0.35));
      if (e.mecha) e.mecha.setAttribute('gradientTransform', `translate(${f(Math.sin(seg * 0.6) * 0.5)} 0)`);
      this.style.setProperty('--fala', f(v.fala));
    }
  }

  window.customElements.define('aurora-avatar', AuroraAvatar);

  raiz.AuroraAvatar = {
    versao: VERSAO,
    Elemento: AuroraAvatar,
    criar(opcoes) {
      opcoes = opcoes || {};
      const el = document.createElement('aurora-avatar');
      if (opcoes.tamanho) el.setAttribute('tamanho', opcoes.tamanho);
      if (opcoes.acessorio) el.setAttribute('acessorio', opcoes.acessorio);
      if (opcoes.estatico) el.setAttribute('estatico', '');
      if (opcoes.nome) el.setAttribute('nome', opcoes.nome);
      return el;
    }
  };
})(typeof self !== 'undefined' ? self : this);
