// Testes do motor de compreensão da Aurora — execute com: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const AuroraNLU = require('../src/aurora-compreensao.js');
const BASE = require('../exemplos/base-conhecimento-exemplo.js');

const nova = (opcoes) => AuroraNLU.criar(Object.assign({ semente: 5, armazenamento: false, base: BASE }, opcoes));

function memoriaFalsa() {
  const dados = new Map();
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => dados.set(k, String(v)),
    removeItem: (k) => dados.delete(k)
  };
}

test('normaliza gírias, abreviações e acentos', () => {
  const a = AuroraNLU.util.analisar('vc sabe oq é apr? pq preciso hj');
  assert.match(a.expandido, /voce sabe o que e apr por que preciso hoje/);
  assert.equal(a.tokens.find((t) => t.base === 'voce').exib, 'você');
});

test('reconhece a NR escrita de vários jeitos', () => {
  for (const forma of ['nr35', 'NR 35', 'nr-35', 'N.R. 35', 'norma regulamentadora 35', 'norma 35']) {
    const ents = AuroraNLU.util.analisar('o que diz a ' + forma).entidades.map((e) => e.id);
    assert.ok(ents.includes('NR-35'), forma + ' → ' + ents.join(','));
  }
});

test('corrige erros de digitação sem "corrigir" palavras comuns', () => {
  const a = nova();
  const u = a.entender('qual a validade do treinamnto da nr35');
  assert.deepEqual(u.correcoes.map((c) => c.para), ['treinamento']);
  assert.equal(a.entender('responda mais curto').correcoes.length, 0);
  assert.equal(a.entender('conta uma piada').correcoes.length, 0);
  assert.equal(a.entender('socorro').correcoes.length, 0);
});

test('radicalização aproxima variações da mesma palavra', () => {
  const r = AuroraNLU.util.radical;
  assert.equal(r('treinamento'), r('treinamentos'));
  assert.equal(r('trabalhar'), r('trabalho'));
  assert.equal(r('inspeção'.normalize('NFD').replace(/[̀-ͯ]/g, '')), r('inspecoes'));
  assert.equal(r('normas'), r('norma'));
});

test('detecta intenções em registros diferentes', () => {
  const a = nova();
  const casos = [
    ['oi aurora', 'saudacao'], ['bom dia!', 'saudacao'], ['eae blz?', 'como_vai'], ['tudo bem com você?', 'como_vai'],
    ['obrigadão!!', 'agradecimento'], ['vlw', 'agradecimento'], ['Agradeço a atenção.', 'agradecimento'],
    ['tchau, até amanhã', 'despedida'], ['quem é você?', 'identidade'], ['você é um robô?', 'identidade'],
    ['não entendi', 'esclarecer'], ['me dá um exemplo', 'exemplo'], ['resume pra mim', 'resumo'],
    ['não é isso', 'insatisfacao'], ['você só repete a mesma coisa', 'insatisfacao'], ['conta uma piada', 'piada'],
    ['mandou bem!', 'elogio'], ['to cansado hoje', 'estado_negativo']
  ];
  for (const [frase, esperada] of casos) {
    const nomes = a.entender(frase).intencoes.map((i) => i.nome);
    assert.ok(nomes.includes(esperada), `"${frase}" → ${nomes.join(', ')}`);
  }
});

test('identifica o registro: formal, informal e técnico', () => {
  const a = nova();
  assert.equal(a.entender('Prezada Aurora, gostaria de saber, por gentileza, a periodicidade do exame.').registro, 'formal');
  assert.equal(a.entender('mano, tipo assim, vc sabe qdo vence o curso? kkk').registro, 'informal');
  assert.equal(a.entender('Sequência de desenergização NR-10 com aterramento temporário e equipotencialização').registro, 'tecnico');
});

const PERGUNTAS = [
  ['qual a validade do treinamento de nr35?', 'nr35-treinamento'],
  ['vc sabe qdo vence o curso de altura?', 'nr35-treinamento'],
  ['Prezada, gostaria de saber a carga horária do treinamento de trabalho em altura.', 'nr35-treinamento'],
  ['ate quando vale meu certificado de altura?', 'nr35-treinamento'],
  ['a partir de qntos metros é considerado altura?', 'nr35-o-que-e'],
  ['onde eu prendo o talabarte', 'nr35-epi'],
  ['o que precisa pra subir em andaime', 'nr35-epi'],
  ['quem pode mexer em painel eletrico', 'nr10-o-que-e'],
  ['quantas horas tem o curso de eletricidade nr-10?', 'nr10-treinamento'],
  ['qual a sequencia pra desenergizar', 'nr10-desenergizacao'],
  ['tanque é espaço confinado?', 'nr33'],
  ['curso de vigia tem quantas horas', 'nr33-treinamento'],
  ['a empresa tem que me dar epi de graça?', 'nr6-epi'],
  ['guarda corpo é epi ou epc', 'epi-epc-diferenca'],
  ['me ensina a fazer uma analise de risco', 'apr'],
  ['a pt vale por quanto tempo', 'pt'],
  ['acidente no trajeto precisa de CAT?', 'cat'],
  ['preciso colocar cadeado na maquina antes da manutençao?', 'loto'],
  ['posso jogar agua em incendio eletrico?', 'extintores'],
  ['fiquei 40 dias afastado, preciso de exame pra voltar?', 'aso-exames'],
  ['o que é near miss', 'quase-acidente'],
  ['qual telefone dos bombeiros', 'emergencia-contatos'],
  ['posso ganhar insalubridade e periculosidade junto?', 'insalubridade-periculosidade'],
  ['Solicito, por gentileza, informações acerca da periodicidade do exame periódico.', 'aso-exames']
];

test('encontra a resposta certa em perguntas formais, informais, técnicas e com erros', () => {
  for (const [frase, id] of PERGUNTAS) {
    const r = nova().responder(frase);
    assert.equal(r.entradaId, id, `"${frase}" → ${r.entradaId} (${r.fonte}, ${r.confianca})`);
  }
});

test('não inventa resposta para assuntos fora da base', () => {
  for (const frase of ['qual a capital da frança', 'como faço bolo de cenoura', 'qual o valor do dolar hoje', 'qual o preço da gasolina']) {
    const r = nova().responder(frase);
    assert.notEqual(r.fonte, 'base', frase);
  }
});

test('conversa social não vira consulta à base', () => {
  const a = nova();
  assert.equal(a.responder('obrigado pela explicação sobre a NR-35').fonte, 'social');
  assert.equal(a.responder('que horas são?').fonte, 'social');
  assert.equal(a.responder('meu nome é Carla e sou técnica de segurança').fonte, 'social');
  assert.equal(a.perfil.nome, 'Carla');
  assert.equal(a.responder('responda mais curto por favor').fonte, 'social');
  assert.equal(a.perfil.verbosidade, 'curto');
});

test('mantém o contexto: "e da NR-10?" e "quantas horas tem?"', () => {
  const a = nova();
  assert.equal(a.responder('qual a validade do treinamento de nr35?').entradaId, 'nr35-treinamento');
  const r2 = a.responder('e da nr10?');
  assert.equal(r2.entradaId, 'nr10-treinamento');
  assert.ok(r2.entendimento.continuacao);
  const r3 = a.responder('e quantas horas tem?');
  assert.equal(r3.entradaId, 'nr10-treinamento');
  assert.match(r3.texto, /40 horas/);
  const b = nova();
  b.responder('Sequência de desenergização conforme NR-10?');
  assert.equal(b.responder('E o LOTO?').entradaId, 'loto');
});

test('responde exatamente o que foi perguntado (trecho relevante)', () => {
  const r = nova().responder('quem deve elaborar a APR?');
  assert.equal(r.entradaId, 'apr');
  assert.match(r.texto, /A APR deve ser feita pela equipe/);
  assert.doesNotMatch(r.texto, /é uma ferramenta para identificar/);
});

test('perguntas compostas recebem as duas respostas', () => {
  const r = nova().responder('qual a validade do treinamento da nr35 e da nr10?');
  assert.match(r.texto, /Sobre a NR-35:/);
  assert.match(r.texto, /Sobre a NR-10:/);
});

test('não entendi / exemplo / resumo usam a resposta anterior', () => {
  const a = nova();
  a.responder('o que é apr?');
  assert.equal(a.responder('não entendi').fonte, 'seguimento');
  assert.match(a.responder('me dá um exemplo').texto, /içar a bomba/);
  assert.equal(a.responder('resume pra mim').fonte, 'seguimento');
});

test('varia as respostas sociais (sem respostas padronizadas)', () => {
  const a = nova();
  const oi = new Set();
  const obrigado = new Set();
  for (let i = 0; i < 5; i++) {
    oi.add(a.responder('oi').texto);
    obrigado.add(a.responder('obrigado').texto);
  }
  assert.ok(oi.size >= 3, 'saudações: ' + oi.size);
  assert.ok(obrigado.size >= 3, 'agradecimentos: ' + obrigado.size);
});

test('ao repetir a pergunta, não devolve o mesmo texto', () => {
  const a = nova();
  const r1 = a.responder('qual o prazo da cat?');
  const r2 = a.responder('qual o prazo da cat?');
  assert.notEqual(r1.texto, r2.texto);
  assert.equal(a.responder('você já disse isso').fonte, 'reparo');
});

test('emergência real recebe orientação imediata; pergunta sobre emergência não', () => {
  const r = nova().responder('socorro meu colega levou choque no painel!!');
  assert.equal(r.fonte, 'emergencia');
  assert.match(r.texto, /192/);
  assert.match(r.texto, /desligue a fonte/);
  assert.equal(r.emocao, 'preocupada');
  assert.notEqual(nova().responder('qual o número de emergência dos bombeiros?').fonte, 'emergencia');
  assert.notEqual(nova().responder('como montar um plano de emergência?').fonte, 'emergencia');
});

test('aprende com a correção do usuário e acerta de primeira na próxima vez', () => {
  const armazenamento = memoriaFalsa();
  const a = nova({ armazenamento });
  const pergunta = 'qual o kit pra ficar pendurado lá em cima';
  assert.notEqual(a.responder(pergunta).entradaId, 'nr35-epi');
  assert.equal(a.responder('quais epis usar em trabalho em altura').entradaId, 'nr35-epi');
  a.responder('isso, obrigado!');
  const b = nova({ armazenamento });
  assert.equal(b.responder(pergunta).entradaId, 'nr35-epi');
});

test('lembra do nome e das preferências entre sessões', () => {
  const armazenamento = memoriaFalsa();
  nova({ armazenamento }).responder('pode me chamar de Rafael');
  const b = nova({ armazenamento });
  assert.equal(b.perfil.nome, 'Rafael');
  b.esquecer();
  assert.equal(nova({ armazenamento }).perfil.nome, null);
});

test('envolve a função de resposta do app mantendo o tipo de retorno', async () => {
  const a = AuroraNLU.criar({ semente: 2, armazenamento: false });
  const recebidas = [];
  const motor = (texto) => { recebidas.push(texto); return /nr-35/i.test(texto) ? 'A reciclagem da NR-35 é bienal.' : 'Desculpe, não entendi.'; };
  const envolvida = a.envolver(motor);
  const r1 = envolvida('qual a validade do treinamnto da nr35?');
  assert.equal(typeof r1, 'string');
  assert.match(r1, /bienal/);
  assert.match(recebidas[0], /treinamento/);
  assert.match(recebidas[0], /NR-35/);
  assert.match(envolvida('obrigado!'), /nada|disponha|imagina|agradeço|tamo junto/i);
  assert.doesNotMatch(envolvida('e qual a cor do céu?'), /não entendi/i);
  const assincrona = a.envolver(async () => 'Resposta assíncrona sobre EPI.');
  assert.match(await assincrona('o que é epi?'), /Resposta assíncrona/);
  const semRetorno = a.envolver(() => undefined);
  assert.equal(semRetorno('o que é epi?'), undefined);
});

test('processar com motor externo trata respostas padrão e repetidas', async () => {
  const a = AuroraNLU.criar({ semente: 4, armazenamento: false });
  const sempreIgual = async () => 'Olá! Sou a Aurora. Como posso ajudar?';
  const r1 = await a.processar('qual a validade da nr35?', sempreIgual);
  assert.equal(r1.fonte, 'motor');
  const r2 = await a.processar('e o que é apr?', sempreIgual);
  assert.equal(r2.fonte, 'nao_encontrado');
  const r3 = await a.processar('o que é pt?', async () => 'Não entendi sua pergunta.');
  assert.equal(r3.fonte, 'nao_encontrado');
});

test('humaniza respostas em HTML sem quebrar as tags', () => {
  const a = AuroraNLU.criar({ semente: 9, armazenamento: false });
  const html = '<p>A <b>NR-35</b> trata do trabalho em altura.</p>';
  const u = a.entender('o que é a nr35?');
  const out = a.humanizar(html, u);
  assert.ok(out.includes(html));
  assert.doesNotMatch(out, /\n/);
});
