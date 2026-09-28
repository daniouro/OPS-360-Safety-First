// Gera os arquivos de distribuição:
//   dist/aurora-ops360.js   — pacote único (compreensão + avatar + integração)
//   dist/aurora-demo.html   — demonstração autônoma (abre direto no navegador)
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');
const { versao } = require(path.join(raiz, 'src/aurora-compreensao.js'));

const partes = ['src/aurora-compreensao.js', 'src/aurora-avatar.js', 'src/aurora-integracao.js'];
const cabecalho = `/*!
 * Aurora · OPS 360° Safety First — pacote ${versao}
 * Compreensão de linguagem + avatar animado + integração automática com o chat.
 * Uso: <script src="aurora-ops360.js"></script> antes de </body>. Veja LEIA-ME.md.
 */
`;
const pacote = cabecalho + partes.map((p) => `\n/* ===== ${path.basename(p)} ===== */\n` + ler(p)).join('\n');

fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dist/aurora-ops360.js'), pacote);

const embutir = (js) => '<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '\n</script>';
const demo = ler('demo/index.html');
const inicio = demo.indexOf('<!-- AURORA:INICIO -->');
const fim = demo.indexOf('<!-- AURORA:FIM -->');
if (inicio < 0 || fim < 0) throw new Error('Marcadores AURORA:INICIO/FIM não encontrados em demo/index.html');
const scripts = [
  embutir('window.AURORA_CONFIG = { depurar: false };'),
  embutir(ler('exemplos/base-conhecimento-exemplo.js')),
  embutir('window.AURORA_CONFIG.base = window.AURORA_BASE_EXEMPLO;'),
  embutir(pacote)
].join('\n  ');
const autonomo = demo.slice(0, inicio) + scripts + demo.slice(fim + '<!-- AURORA:FIM -->'.length);
fs.writeFileSync(path.join(raiz, 'dist/aurora-demo.html'), autonomo);

const kb = (arquivo) => (fs.statSync(path.join(raiz, arquivo)).size / 1024).toFixed(1) + ' KB';
console.log(`Aurora ${versao}`);
console.log('  dist/aurora-ops360.js  ', kb('dist/aurora-ops360.js'));
console.log('  dist/aurora-demo.html  ', kb('dist/aurora-demo.html'));
