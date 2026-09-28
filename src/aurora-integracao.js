/*!
 * Aurora · Integração automática com o chat do OPS 360° Safety First
 * Versão 49.202.0
 *
 * - Troca o logo das mensagens da IA pelo avatar animado <aurora-avatar>.
 * - Remove o texto "Aurora, sua assistente de inteligência artificial".
 * - Liga o avatar ao chat: ouve enquanto o usuário digita, pensa enquanto
 *   a resposta é preparada e "fala" quando a resposta aparece.
 * - Expõe window.Aurora para usar o motor de compreensão no fluxo de mensagens.
 *
 * Requer aurora-compreensao.js e aurora-avatar.js (o pacote único já traz tudo).
 */
(function (raiz) {
  'use strict';

  const VERSAO = '49.202.0';
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    if (typeof module === 'object' && module.exports) module.exports = { versao: VERSAO };
    return;
  }

  const SELETORES_LOGO = [
    '[data-aurora-logo]', '.ai-avatar', '.bot-avatar', '.assistant-avatar', '.aurora-avatar', '.avatar-ai', '.avatar-bot',
    '.avatar-ia', '.ia-avatar', '.ai-icon', '.bot-icon', '.ia-icon', '.ai-logo', '.ia-logo', '.logo-ia', '.aurora-logo',
    '.assistant-icon', '.message-avatar', '.msg-avatar', '.chat-avatar', '.mensagem-avatar', '.message.ai .avatar',
    '.message.bot .avatar', '.message.assistant .avatar', '.msg.ai .avatar', '.msg.bot .avatar', '.ai-message .avatar',
    '.bot-message .avatar', '.assistant-message .avatar', '.mensagem-ia .avatar', '.mensagem.ia .avatar'
  ].join(',');

  const SELETORES_IA = [
    '.ai', '.ia', '.bot', '.assistant', '.aurora', '[data-role="assistant"]', '[data-autor="ia"]', '[data-sender="ai"]',
    '[data-sender="bot"]', '.message-ai', '.ai-message', '.bot-message', '.assistant-message', '.msg-ai', '.msg-bot',
    '.mensagem-ia', '.mensagem-bot', '.resposta-ia'
  ].join(',');

  const SELETORES_MENSAGENS = [
    '#chatMessages', '#chat-messages', '#messages', '#mensagens', '.chat-messages', '.messages', '.mensagens',
    '.chat-body', '.chat-history', '.conversation', '.conversa', '[role="log"]'
  ].join(',');

  const SELETORES_ENTRADA = [
    'textarea[placeholder*="ergunte" i]', 'input[placeholder*="ergunte" i]', 'textarea[placeholder*="mensagem" i]',
    'input[placeholder*="mensagem" i]', 'textarea[placeholder*="igite" i]', 'input[placeholder*="igite" i]',
    '#chatInput', '#chat-input', '#userInput', '#messageInput', '#mensagem', 'textarea'
  ].join(',');

  const FUNCOES_CONHECIDAS = [
    'generateResponse', 'getAIResponse', 'getBotResponse', 'gerarResposta', 'gerarRespostaIA', 'obterResposta',
    'getResponse', 'generateAIResponse', 'getAuroraResponse', 'respostaAurora', 'gerarRespostaAurora',
    'responderPergunta', 'buscarResposta', 'findBestResponse', 'getSmartResponse'
  ];

  const PADRAO = {
    autoIntegrar: true,
    substituirLogo: true,
    removerTextos: ['Aurora, sua assistente de inteligência artificial', 'sua assistente de inteligência artificial'],
    seletorLogo: null,
    seletorMensagens: null,
    seletorEntrada: null,
    tamanhoAvatar: null,
    acessorio: 'fone',
    heuristica: true,
    funcaoResposta: null,
    detectarFuncao: true,
    base: null,
    nome: 'Aurora',
    produto: 'OPS 360°',
    aprender: true,
    depurar: false
  };

  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();

  const RE_SO_FRASE = /^(?:(?:a |eu sou a )?aurora )?(?:a )?(?:sua )?assistente (?:virtual )?(?:de )?(?:inteligencia artificial|ia)$/;

  function lerConfigDoScript() {
    const script = document.currentScript || document.querySelector('script[src*="aurora"]');
    const cfg = {};
    if (!script || !script.dataset) return cfg;
    const d = script.dataset;
    if (d.auto === 'false') cfg.autoIntegrar = false;
    if (d.seletorLogo) cfg.seletorLogo = d.seletorLogo;
    if (d.seletorMensagens) cfg.seletorMensagens = d.seletorMensagens;
    if (d.seletorEntrada) cfg.seletorEntrada = d.seletorEntrada;
    if (d.tamanho) cfg.tamanhoAvatar = parseInt(d.tamanho, 10) || null;
    if (d.acessorio) cfg.acessorio = d.acessorio;
    if (d.funcaoResposta) cfg.funcaoResposta = d.funcaoResposta;
    if (d.aprender === 'false') cfg.aprender = false;
    if (d.depurar === 'true') cfg.depurar = true;
    return cfg;
  }

  const configScript = lerConfigDoScript();

  const Aurora = {
    versao: VERSAO,
    config: Object.assign({}, PADRAO),
    nlu: null,
    avatar: null,
    _iniciado: false,
    _avatares: new Set(),
    _reacaoPendente: null,
    _entrada: null,
    _mensagens: null,

    _log() {
      if (this.config.depurar && window.console) console.info.apply(console, ['[Aurora]'].concat([].slice.call(arguments)));
    },

    _garantirNLU() {
      if (this.nlu) return this.nlu;
      if (!raiz.AuroraNLU) throw new Error('Aurora: aurora-compreensao.js não foi carregado.');
      this.nlu = raiz.AuroraNLU.criar({
        nome: this.config.nome,
        produto: this.config.produto,
        aprender: this.config.aprender,
        base: this.config.base || null
      });
      return this.nlu;
    },

    // ----------------------------------------------------- API pública
    iniciar(opcoes) {
      Object.assign(this.config, opcoes || {});
      this._garantirNLU();
      if (this._iniciado) return this;
      this._iniciado = true;
      this.removerTextos();
      if (this.config.substituirLogo) this.substituirLogos();
      this._ligarEntrada();
      this._observar();
      this._envolverFuncaoResposta();
      const n = this._avatares.size;
      if (window.console) console.info('[Aurora ' + VERSAO + '] ativa — avatares: ' + n + (this._funcaoEnvolvida ? ' · respostas via ' + this._funcaoEnvolvida : ''));
      return this;
    },

    entender(texto) { return this._garantirNLU().entender(texto); },
    reescrever(texto) { return this._garantirNLU().reescrever(texto); },
    humanizar(resposta, entendimento) { return this._garantirNLU().humanizar(resposta, entendimento); },
    carregarBase(base, acrescentar) { return this._garantirNLU().carregarBase(base, acrescentar); },
    esquecer() { if (this.nlu) this.nlu.esquecer(); },

    // Responde com a base interna (Aurora.carregarBase) — síncrono.
    responder(texto) {
      this._pensar(texto);
      const r = this._garantirNLU().responder(texto);
      this._reagir(r);
      return r;
    },

    // Responde usando o motor do app: motor(perguntaEntendida, entendimento) → texto | Promise<texto>.
    async processar(texto, motor) {
      this._pensar(texto);
      const r = await this._garantirNLU().processar(texto, motor);
      this._reagir(r);
      return r;
    },

    // Envolve a função de resposta do app (ver LEIA-ME).
    envolver(funcao) {
      return this._garantirNLU().envolver(funcao, (r) => this._reagir(r));
    },

    criarAvatar(opcoes) {
      opcoes = opcoes || {};
      const av = document.createElement('aurora-avatar');
      if (opcoes.tamanho) av.setAttribute('tamanho', opcoes.tamanho);
      av.setAttribute('acessorio', opcoes.acessorio || this.config.acessorio);
      av.setAttribute('nome', this.config.nome);
      return av;
    },

    // Torna este avatar o "vivo" (o da mensagem mais recente); os anteriores ficam estáticos.
    ativarAvatar(av) {
      if (!av || av === this.avatar) return av;
      this._avatares.forEach((outro) => {
        if (outro !== av) {
          outro.setAttribute('estatico', '');
          outro.setAttribute('aria-hidden', 'true');
        }
      });
      av.removeAttribute('estatico');
      av.removeAttribute('aria-hidden');
      this._avatares.add(av);
      this.avatar = av;
      const pendente = this._reacaoPendente;
      if (pendente && Date.now() - pendente.t < 6000) {
        setTimeout(() => av.reagir(pendente.r), 60);
        this._reacaoPendente = null;
      }
      return av;
    },

    falar(texto, opcoes) {
      return this.avatar ? this.avatar.falar(texto, opcoes) : Promise.resolve();
    },

    // ------------------------------------------------ texto a remover
    removerTextos(raizNo) {
      const frases = this.config.removerTextos || [];
      if (!frases.length || !document.body) return 0;
      const alvos = frases.map(normalizar).filter(Boolean);
      const escopo = raizNo && raizNo.nodeType === 1 ? raizNo : document.body;
      const walker = document.createTreeWalker(escopo, NodeFilter.SHOW_TEXT);
      const nos = [];
      while (walker.nextNode()) nos.push(walker.currentNode);
      let removidos = 0;
      nos.forEach((no) => {
        const t = normalizar(no.nodeValue);
        if (!t || t.length < 8 || !alvos.some((a) => t.includes(a) || (a.includes(t) && /assistente/.test(t)))) return;
        const el = no.parentElement;
        if (!el || el.closest('aurora-avatar, script, style, textarea, [contenteditable="true"]')) return;
        let alvo = el;
        const ehSoFrase = (x) => RE_SO_FRASE.test(normalizar(x.textContent));
        const temConteudo = (x) => !!x.querySelector('svg, img, canvas, button, input, textarea, select, video, aurora-avatar');
        while (alvo.parentElement && alvo.parentElement !== document.body && ehSoFrase(alvo.parentElement) && !temConteudo(alvo.parentElement)) {
          alvo = alvo.parentElement;
        }
        if (ehSoFrase(alvo) && !temConteudo(alvo)) {
          alvo.style.setProperty('display', 'none', 'important');
          alvo.setAttribute('aria-hidden', 'true');
          alvo.setAttribute('data-aurora-oculto', '');
        } else {
          no.nodeValue = no.nodeValue
            .replace(/,?\s*(?:eu sou )?(?:a\s+)?aurora\s*[,–—-]?\s*sua\s+assistente\s+de\s+intelig[eê]ncia\s+artificial[.!]?/gi, '')
            .replace(/,?\s*sua\s+assistente\s+de\s+intelig[eê]ncia\s+artificial[.!]?/gi, '')
            .replace(/\s{2,}/g, ' ');
        }
        removidos++;
      });
      if (removidos) this._log('texto removido em', removidos, 'lugar(es)');
      return removidos;
    },

    // ------------------------------------------------ logo → avatar
    substituirLogos(raizNo) {
      const escopo = raizNo && raizNo.nodeType === 1 ? raizNo : document;
      let candidatos = [];
      const seletor = this.config.seletorLogo || SELETORES_LOGO;
      try {
        candidatos = [].slice.call(escopo.querySelectorAll(seletor));
        if (escopo.matches && escopo.matches(seletor)) candidatos.unshift(escopo);
      } catch (err) {
        this._log('seletor inválido:', seletor);
      }
      candidatos = candidatos.filter((el) => !el.closest('[data-aurora-substituido]') && !el.closest('aurora-avatar'));
      if (!candidatos.length && this.config.heuristica && !this.config.seletorLogo) candidatos = this._logosPorHeuristica(escopo);
      let ultimo = null;
      candidatos.forEach((el) => {
        if (!this._ehLogoDaIA(el)) return;
        const av = this._trocar(el);
        if (av) ultimo = av;
      });
      if (ultimo) this.ativarAvatar(ultimo);
      return candidatos.length;
    },

    _ehLogoDaIA(el) {
      const linha = el.closest('.message, .msg, .mensagem, .chat-message, [class*="message"], [class*="mensagem"], li') || el.parentElement;
      if (!linha) return true;
      const tipo = this._tipoMensagem(linha);
      if (tipo === 'usuario') return false;
      if (tipo === 'ia') return true;
      const caixa = this._mensagens || linha.parentElement;
      if (!caixa) return true;
      const r = el.getBoundingClientRect();
      const c = caixa.getBoundingClientRect();
      return !r.width || r.left + r.width / 2 <= c.left + c.width / 2;
    },

    _tipoMensagem(el) {
      if (!el || el.nodeType !== 1) return null;
      const cls = ((el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '').toString().toLowerCase();
      const dados = ((el.getAttribute('data-role') || '') + ' ' + (el.getAttribute('data-sender') || '') + ' ' + (el.getAttribute('data-autor') || '')).toLowerCase();
      const tudo = cls + ' ' + dados;
      if (/(?:^|[\s_-])(?:user|usuario|me|mine|sent|outgoing|self|human|humano|cliente)(?:$|[\s_-])/.test(tudo)) return 'usuario';
      if (/(?:^|[\s_-])(?:ai|ia|bot|assistant|assistente|aurora|received|incoming|resposta)(?:$|[\s_-])/.test(tudo)) return 'ia';
      try { if (el.matches(SELETORES_IA)) return 'ia'; } catch (err) { /* ignora */ }
      return null;
    },

    _logosPorHeuristica(escopo) {
      const area = this._mensagens || (escopo.nodeType === 1 ? escopo : document.body);
      const achados = [];
      area.querySelectorAll('div, span, figure, i').forEach((el) => {
        if (el.closest('[data-aurora-substituido], aurora-avatar')) return;
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.width > 64 || Math.abs(r.width - r.height) > 4) return;
        const est = getComputedStyle(el);
        const raio = parseFloat(est.borderTopLeftRadius) || 0;
        if (raio < r.width * 0.35 && !/%/.test(est.borderTopLeftRadius)) return;
        const temIcone = el.querySelector('svg, img, i') || (est.backgroundImage && est.backgroundImage !== 'none');
        const irmaoComTexto = el.nextElementSibling && (el.nextElementSibling.textContent || '').trim().length > 0;
        if (temIcone && irmaoComTexto && !achados.some((a) => a.contains(el) || el.contains(a))) achados.push(el);
      });
      this._log('logos por heurística:', achados.length);
      return achados;
    },

    _trocar(el) {
      if (el.hasAttribute('data-aurora-substituido')) return el.querySelector('aurora-avatar');
      const r = el.getBoundingClientRect();
      const lado = this.config.tamanhoAvatar || Math.round(Math.max(28, Math.min(72, Math.max(r.width, r.height) || 40)));
      const av = this.criarAvatar({ tamanho: lado });
      [].slice.call(el.children).forEach((filho) => {
        filho.style.setProperty('display', 'none', 'important');
        filho.setAttribute('data-aurora-oculto', '');
      });
      [].slice.call(el.childNodes).forEach((n) => { if (n.nodeType === 3 && n.nodeValue.trim()) n.nodeValue = ''; });
      Object.assign(el.style, {
        background: 'transparent', backgroundImage: 'none', border: '0', boxShadow: 'none', padding: '0',
        overflow: 'visible', width: lado + 'px', height: lado + 'px', minWidth: lado + 'px', flex: '0 0 ' + lado + 'px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      });
      el.setAttribute('data-aurora-substituido', '');
      el.appendChild(av);
      this._avatares.add(av);
      return av;
    },

    // ------------------------------------------------ entrada do usuário
    _ligarEntrada() {
      const entrada = this.config.seletorEntrada ? document.querySelector(this.config.seletorEntrada) : this._acharEntrada();
      if (!entrada || entrada === this._entrada) return;
      this._entrada = entrada;
      let timer = null;
      const ouvir = () => {
        const av = this.avatar;
        if (!av || av.estado === 'falando' || av.estado === 'pensando') return;
        av.estado = entrada.value && entrada.value.trim() ? 'ouvindo' : 'ocioso';
        av.olharPara(entrada);
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (av.estado === 'ouvindo') av.estado = 'ocioso';
        }, 1600);
      };
      entrada.addEventListener('input', ouvir);
      entrada.addEventListener('focus', () => { if (this.avatar) this.avatar.olharPara(entrada); });
      entrada.addEventListener('blur', () => { if (this.avatar) this.avatar.olharPara(null); });
      entrada.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey && entrada.value.trim()) this._pensar(entrada.value);
      }, true);
      const botao = this._acharBotaoEnviar(entrada);
      if (botao) botao.addEventListener('click', () => { if (entrada.value.trim()) this._pensar(entrada.value); }, true);
      this._log('campo de mensagem ligado:', entrada);
    },

    _acharEntrada() {
      const lista = [].slice.call(document.querySelectorAll(SELETORES_ENTRADA));
      return lista.find((el) => el.offsetParent !== null) || lista[0] || null;
    },

    _acharBotaoEnviar(entrada) {
      let no = entrada.parentElement;
      for (let i = 0; i < 4 && no; i++, no = no.parentElement) {
        const b = no.querySelector('button[type="submit"], button[aria-label*="nviar" i], button[title*="nviar" i], button[class*="send" i], button[class*="enviar" i], button[id*="send" i], button[id*="enviar" i]');
        if (b) return b;
      }
      return null;
    },

    // O usuário enviou uma mensagem: o avatar reage e fica pensando.
    _pensar(texto) {
      const av = this.avatar;
      if (!av) return;
      av.olharPara(null);
      if (av.estado !== 'falando') av.estado = 'pensando';
      try {
        const u = this._garantirNLU().entender(texto);
        const tem = (n) => u.intencoes.some((i) => i.nome === n && i.score >= 0.7);
        if (u.urgencia >= 0.7) av.emocao = 'preocupada';
        else if (tem('insatisfacao') || u.frustracao >= 0.5) av.reagir({ emocao: 'empatica', gesto: 'desculpa' });
        else if (tem('agradecimento') || tem('elogio')) av.reagir({ emocao: 'feliz', gesto: 'sorriso' });
        else if (tem('saudacao')) av.reagir({ emocao: 'feliz', gesto: 'aceno' });
        else if (u.surpresa) av.reagir({ emocao: 'surpresa' });
      } catch (err) {
        this._log('falha ao entender:', err);
      }
    },

    _reagir(r) {
      if (!r) return;
      this._reacaoPendente = { r, t: Date.now() };
      if (this.avatar && this.avatar.estado === 'pensando') this.avatar.estado = 'ocioso';
    },

    _emocaoDoTexto(texto) {
      const t = normalizar(texto);
      if (/⚠|🚨/.test(texto) || /\b(?:emergencia|samu|bombeiros|risco a vida|192|193)\b/.test(t)) return { emocao: 'preocupada' };
      if (/\b(?:desculp\w*|sinto muito|foi mal)\b/.test(t)) return { emocao: 'empatica', gesto: 'desculpa' };
      if (/[😊😄🙂😉🥰😁]/u.test(texto) || /\b(?:por nada|imagina|que bom|prazer|disponha|obrigad\w*)\b/.test(t)) return { emocao: 'feliz', gesto: 'sorriso' };
      return { gesto: 'sim' };
    },

    // ------------------------------------------------ observação do chat
    _observar() {
      if (!('MutationObserver' in window) || this._observador) return;
      this._mensagens = this.config.seletorMensagens ? document.querySelector(this.config.seletorMensagens) : this._acharMensagens();
      const alvo = this._mensagens || document.body;
      let pendentes = [];
      let agendado = false;
      const processar = () => {
        agendado = false;
        const nos = pendentes;
        pendentes = [];
        if (!this._entrada || !this._entrada.isConnected) this._ligarEntrada();
        nos.forEach((no) => this._novoNo(no));
      };
      this._observador = new MutationObserver((mutacoes) => {
        mutacoes.forEach((m) => {
          if (m.type === 'childList') {
            m.addedNodes.forEach((n) => {
              if (n.nodeType === 1 && n.tagName !== 'AURORA-AVATAR' && !n.closest('aurora-avatar')) pendentes.push(n);
            });
          }
          this._acompanharFala(m.target);
        });
        if (!agendado && pendentes.length) {
          agendado = true;
          requestAnimationFrame(processar);
        }
      });
      this._observador.observe(alvo, { childList: true, subtree: true, characterData: true });
      if (alvo !== document.body) {
        this._observadorPagina = new MutationObserver(() => {
          if (!this._mensagens || !this._mensagens.isConnected) {
            this._observador.disconnect();
            this._observador = null;
            this._observadorPagina.disconnect();
            this._observadorPagina = null;
            this._observar();
          }
        });
        this._observadorPagina.observe(document.body, { childList: true, subtree: true });
      }
    },

    _acharMensagens() {
      try {
        const lista = [].slice.call(document.querySelectorAll(SELETORES_MENSAGENS));
        const visivel = lista.find((el) => el.offsetParent !== null);
        if (visivel || lista[0]) return visivel || lista[0];
      } catch (err) { /* ignora */ }
      const entrada = this._entrada || this._acharEntrada();
      let no = entrada ? entrada.parentElement : null;
      while (no && no !== document.body) {
        const rolavel = [].slice.call(no.querySelectorAll('div, section, ul, main')).find((el) => {
          const e = getComputedStyle(el);
          return /(auto|scroll)/.test(e.overflowY) && el.children.length >= 1 && !el.contains(entrada);
        });
        if (rolavel) return rolavel;
        no = no.parentElement;
      }
      return null;
    },

    _novoNo(no) {
      if (!no.isConnected) return;
      this.removerTextos(no);
      if (this.config.substituirLogo) this.substituirLogos(no);
      // Linha da mensagem que tem um avatar: o próprio nó, um descendente ou um irmão
      // (quando o app monta a mensagem em partes: primeiro o logo, depois o balão).
      let cont = no.hasAttribute('data-aurora-substituido') ? no : no.querySelector('[data-aurora-substituido]');
      let linha = cont ? cont.parentElement : null;
      if (!linha && no.parentElement) {
        cont = [].find.call(no.parentElement.children, (c) => c.hasAttribute('data-aurora-substituido')) || null;
        if (cont) linha = no.parentElement;
      }
      const av = cont ? cont.querySelector('aurora-avatar') : null;
      if (!av || !linha) {
        if (this._tipoMensagem(no) === 'usuario' && this.avatar && this.avatar.estado !== 'falando') this.avatar.estado = 'pensando';
        return;
      }
      this.ativarAvatar(av);
      const texto = (linha.textContent || '').trim();
      const digitando = !texto || /^(?:\.{2,}|…|digitando.*|typing.*|pensando.*)$/i.test(texto) || /typing|digitando|loading|carregando|dots/i.test(String(linha.className));
      if (digitando) {
        av.estado = 'pensando';
        return;
      }
      if (this._mensagemAtual && this._mensagemAtual.no === linha) {
        this._acompanharFala(linha);
        return;
      }
      this._mensagemAtual = { no: linha, avatar: av, falado: '' };
      const pendente = this._reacaoPendente;
      if (pendente && Date.now() - pendente.t < 6000) {
        av.reagir(pendente.r);
        this._reacaoPendente = null;
      } else {
        av.reagir(this._emocaoDoTexto(texto));
      }
      this._acompanharFala(linha);
    },

    // Faz o avatar "falar" o texto conforme ele aparece (efeito de digitação incluído).
    _acompanharFala(alvo) {
      const atual = this._mensagemAtual;
      if (!atual || !atual.no.isConnected) return;
      const no = alvo && alvo.nodeType === 3 ? alvo.parentElement : alvo;
      if (no && !atual.no.contains(no) && no !== atual.no) return;
      const texto = (atual.no.textContent || '').trim();
      if (texto.length <= atual.falado.length) return;
      const novo = texto.slice(atual.falado.length);
      const primeiro = !atual.falado;
      atual.falado = texto;
      atual.avatar.falar(novo, primeiro ? { duracaoMaxima: 5000 } : { continuar: true, cps: 30, duracaoMaxima: 2500 });
    },

    _envolverFuncaoResposta() {
      let nome = this.config.funcaoResposta;
      if (!nome && this.config.detectarFuncao) {
        const achadas = FUNCOES_CONHECIDAS.filter((n) => typeof window[n] === 'function');
        if (achadas.length === 1) nome = achadas[0];
      }
      if (!nome) return;
      const original = window[nome];
      if (typeof original !== 'function') {
        this._log('função de resposta não encontrada:', nome);
        return;
      }
      if (original.__aurora) return;
      try {
        window[nome] = this.envolver(original);
        this._funcaoEnvolvida = nome;
      } catch (err) {
        this._log('não foi possível envolver', nome, err);
      }
    }
  };

  Object.assign(Aurora.config, raiz.AURORA_CONFIG || {}, configScript);
  raiz.Aurora = Aurora;

  function autoIniciar() {
    if (Aurora.config.autoIntegrar === false) return;
    try {
      Aurora.iniciar();
    } catch (err) {
      if (window.console) console.warn('[Aurora] não foi possível iniciar automaticamente:', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoIniciar);
  else setTimeout(autoIniciar, 0);
})(typeof self !== 'undefined' ? self : this);
