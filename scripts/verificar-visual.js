// Verificação visual (requer Playwright + Chromium):
//   node scripts/verificar-visual.js [pasta-de-saida]
// Gera capturas do avatar em todos os estados e da demonstração em uso,
// e falha se houver erros no console ou se a integração não fizer o esperado.
const fs = require('fs');
const path = require('path');

function carregarPlaywright() {
  const caminhos = ['playwright', '/opt/node22/lib/node_modules/playwright'];
  for (const c of caminhos) {
    try { return require(c); } catch (e) { /* tenta o próximo */ }
  }
  throw new Error('Playwright não encontrado.');
}

const raiz = path.join(__dirname, '..');
const saida = path.resolve(process.argv[2] || path.join(raiz, '.visual'));
fs.mkdirSync(saida, { recursive: true });

const galeria = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;padding:24px;background:#080e1b;color:#cbd5e1;font:14px system-ui}
  .grade{display:grid;grid-template-columns:repeat(5,190px);gap:18px}
  figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
  .pequenos{display:flex;gap:18px;margin-top:26px;align-items:center}
</style></head><body>
<div class="grade" id="grade"></div>
<div class="pequenos" id="pequenos"></div>
<script src="file://${path.join(raiz, 'src/aurora-avatar.js')}"></script>
<script>
  const casos = [
    ['neutra', {}], ['feliz', {emocao:'feliz'}], ['preocupada', {emocao:'preocupada'}], ['empatica', {emocao:'empatica'}],
    ['curiosa', {emocao:'curiosa'}], ['surpresa', {emocao:'surpresa'}], ['ouvindo', {estado:'ouvindo'}],
    ['pensando', {estado:'pensando'}], ['falando', {falar:'Aaaa oooo'}], ['capacete', {acessorio:'capacete', emocao:'feliz'}]
  ];
  const grade = document.getElementById('grade');
  window.avatares = casos.map(([nome, o]) => {
    const f = document.createElement('figure');
    const av = document.createElement('aurora-avatar');
    av.setAttribute('tamanho', '170');
    if (o.acessorio) av.setAttribute('acessorio', o.acessorio);
    f.appendChild(av);
    const c = document.createElement('figcaption'); c.textContent = nome; f.appendChild(c);
    grade.appendChild(f);
    if (o.emocao) av.emocao = o.emocao;
    if (o.estado) av.estado = o.estado;
    av._teste = o;
    return av;
  });
  [28, 36, 44, 56].forEach((t) => {
    const av = document.createElement('aurora-avatar');
    av.setAttribute('tamanho', t);
    document.getElementById('pequenos').appendChild(av);
  });
</script></body></html>`;

(async () => {
  const { chromium } = carregarPlaywright();
  const navegador = await chromium.launch();
  const erros = [];
  const falhas = [];

  // 1) Galeria do avatar
  const g = await navegador.newPage({ viewport: { width: 1120, height: 620 }, deviceScaleFactor: 2 });
  g.on('pageerror', (e) => erros.push('galeria: ' + e.message));
  g.on('console', (m) => { if (m.type() === 'error') erros.push('galeria: ' + m.text()); });
  const arqGaleria = path.join(saida, 'galeria.html');
  fs.writeFileSync(arqGaleria, galeria);
  await g.goto('file://' + arqGaleria);
  await g.waitForTimeout(1600);
  await g.evaluate(() => window.avatares.forEach((av) => { if (av._teste.falar) av.falar('Aaaaaa ooooo aaaa', { cps: 6 }); }));
  await g.waitForTimeout(700);
  await g.screenshot({ path: path.join(saida, 'avatar-estados.png') });

  // 2) Demonstração: integração com um app no estilo do OPS 360°
  const d = await navegador.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  d.on('pageerror', (e) => erros.push('demo: ' + e.message));
  d.on('console', (m) => { if (m.type() === 'error') erros.push('demo: ' + m.text()); });
  await d.goto('file://' + path.join(raiz, 'dist/aurora-demo.html'));
  await d.waitForTimeout(1500);
  const inicial = await d.evaluate(() => ({
    textoVisivel: document.body.innerText.includes('assistente de inteligência artificial'),
    avatares: document.querySelectorAll('aurora-avatar').length,
    logosAntigos: [...document.querySelectorAll('.message-avatar > svg')].filter((s) => getComputedStyle(s).display !== 'none').length,
    funcaoEnvolvida: !!(window.gerarResposta && window.gerarResposta.__aurora)
  }));
  if (inicial.textoVisivel) falhas.push('o texto "sua assistente de inteligência artificial" continua visível');
  if (!inicial.avatares) falhas.push('nenhum avatar foi criado');
  if (inicial.logosAntigos) falhas.push('logo antigo continua visível em ' + inicial.logosAntigos + ' mensagem(ns)');
  if (!inicial.funcaoEnvolvida) falhas.push('a função gerarResposta não foi envolvida');

  const conversa = ['eae aurora blz?', 'qual a validade do treinamnto de nr35?', 'e da nr10?', 'quem deve elaborar a APR?'];
  for (const msg of conversa) {
    await d.fill('#chatInput', msg);
    await d.press('#chatInput', 'Enter');
    await d.waitForTimeout(300);
    if (msg === conversa[1]) {
      const estado = await d.evaluate(() => window.Aurora.avatar && window.Aurora.avatar.estado);
      if (estado !== 'pensando') falhas.push('avatar não ficou "pensando" após o envio (estado: ' + estado + ')');
    }
    await d.waitForFunction(() => !document.querySelector('.message.typing'), null, { timeout: 5000 });
    await d.waitForTimeout(4200);
  }
  await d.click('#btnCompreensao');
  await d.waitForTimeout(300);
  const final = await d.evaluate(() => {
    const vivos = [...document.querySelectorAll('aurora-avatar')].filter((a) => !a.hasAttribute('estatico'));
    const bolhas = [...document.querySelectorAll('.message.ai .bubble')].map((b) => b.textContent);
    return { vivos: vivos.length, total: document.querySelectorAll('aurora-avatar').length, bolhas, resumo: (window.Aurora.ultimoResultado || {}).resumo };
  });
  if (final.vivos !== 1) falhas.push('deveria haver 1 avatar animado (o da última mensagem), há ' + final.vivos);
  if (!final.bolhas.some((b) => /40 horas|bienal|a cada 2 anos/.test(b))) falhas.push('resposta da NR-10 não apareceu');
  if (!final.bolhas.some((b) => /A APR deve ser feita pela equipe/.test(b))) falhas.push('resposta focada da APR não apareceu');
  await d.screenshot({ path: path.join(saida, 'demo-desktop.png') });

  // Recorte do avatar vivo durante a fala
  await d.fill('#chatInput', 'o que é trabalho em altura?');
  await d.press('#chatInput', 'Enter');
  await d.waitForFunction(() => !document.querySelector('.message.typing'), null, { timeout: 5000 });
  await d.waitForTimeout(900);
  const falando = await d.evaluate(() => window.Aurora.avatar.estado);
  if (falando !== 'falando') falhas.push('avatar não estava "falando" enquanto a resposta aparecia (estado: ' + falando + ')');
  const ultimo = d.locator('.message.ai').last();
  await ultimo.screenshot({ path: path.join(saida, 'demo-mensagem-falando.png') });

  // 3) Celular
  const m = await navegador.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  m.on('pageerror', (e) => erros.push('celular: ' + e.message));
  await m.goto('file://' + path.join(raiz, 'dist/aurora-demo.html'));
  await m.waitForTimeout(1200);
  await m.fill('#chatInput', 'vc sabe qdo vence o curso de altura?');
  await m.press('#chatInput', 'Enter');
  await m.waitForFunction(() => !document.querySelector('.message.typing'), null, { timeout: 5000 });
  await m.waitForTimeout(3500);
  const rolagem = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (rolagem) falhas.push('há rolagem horizontal no celular');
  await m.screenshot({ path: path.join(saida, 'demo-celular.png') });

  await navegador.close();
  console.log('Capturas em:', saida);
  if (erros.length) console.log('Erros no console:\n  ' + erros.join('\n  '));
  if (falhas.length) console.log('Falhas:\n  ' + falhas.join('\n  '));
  if (erros.length || falhas.length) process.exit(1);
  console.log('Verificação visual: tudo certo.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
