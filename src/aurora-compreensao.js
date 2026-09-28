/*!
 * Aurora · Motor de Compreensão de Linguagem (NLU) — OPS 360° Safety First
 * Versão 49.202.0
 *
 * Entende o que o usuário escreve — formal, informal ou técnico, com gírias,
 * abreviações e erros de digitação — acompanha o contexto da conversa, adapta
 * o tom da resposta e aprende com o uso para entender cada vez mais rápido.
 *
 * Sem dependências. Funciona no navegador (window.AuroraNLU) e no Node.js.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.AuroraNLU = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSAO = '49.202.0';

  // ===========================================================================
  // 1. Utilidades de texto
  // ===========================================================================

  function semAcentos(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function capitalizar(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function hashTexto(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  // Gerador pseudoaleatório com semente (mulberry32) — torna os testes reproduzíveis.
  function criarAleatorio(semente) {
    if (semente == null) return Math.random;
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Distância de Damerau-Levenshtein (transposições contam 1) com corte antecipado.
  function distancia(a, b, max) {
    if (a === b) return 0;
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    let p2 = new Array(lb + 1).fill(0);
    let p1 = new Array(lb + 1);
    let c = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) p1[j] = j;
    for (let i = 1; i <= la; i++) {
      c[0] = i;
      let menor = i;
      for (let j = 1; j <= lb; j++) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(p1[j] + 1, c[j - 1] + 1, p1[j - 1] + custo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          v = Math.min(v, p2[j - 2] + 1);
        }
        c[j] = v;
        if (v < menor) menor = v;
      }
      if (menor > max) return max + 1;
      const t = p2;
      p2 = p1;
      p1 = c;
      c = t;
    }
    return p1[lb];
  }

  function palavras(lista) {
    return lista.trim().split(/\s+/);
  }

  // ===========================================================================
  // 2. Léxicos
  // ===========================================================================

  // Gírias e "internetês" — marcam registro informal. Chaves sem acento.
  const GIRIAS = {
    vc: 'você', vcs: 'vocês', ce: 'você', vce: 'você', oce: 'você',
    tb: 'também', tbm: 'também', tmb: 'também', tbem: 'também',
    pq: 'por que', pqe: 'por que', porq: 'por que', pk: 'por que',
    oq: 'o que', oque: 'o que', q: 'que', qq: 'qualquer', qqr: 'qualquer',
    qlq: 'qualquer', qlqr: 'qualquer', cmg: 'comigo', ctg: 'contigo',
    d: 'de', p: 'para', pra: 'para', pro: 'para o', pras: 'para as', pros: 'para os',
    td: 'tudo', tds: 'todos', hj: 'hoje', amn: 'amanhã',
    qnd: 'quando', qdo: 'quando', qndo: 'quando', qd: 'quando',
    qto: 'quanto', qnto: 'quanto', qnt: 'quanto', qtos: 'quantos', qts: 'quantos', qtas: 'quantas',
    ql: 'qual', qm: 'quem', kd: 'cadê',
    blz: 'beleza', blza: 'beleza', vlw: 'valeu', vlws: 'valeu',
    obg: 'obrigado', obgd: 'obrigado', obgdo: 'obrigado', obgda: 'obrigada',
    obrigadu: 'obrigado', brigado: 'obrigado', brigada: 'obrigada',
    pfv: 'por favor', pfvr: 'por favor', pf: 'por favor', plz: 'por favor',
    pls: 'por favor', porfa: 'por favor', porfavor: 'por favor',
    msm: 'mesmo', mt: 'muito', mto: 'muito', mtu: 'muito', mta: 'muita', mts: 'muitos', mtas: 'muitas',
    nd: 'nada', ngm: 'ninguém', agr: 'agora', dps: 'depois', fds: 'fim de semana',
    flw: 'falou', flws: 'falou', tmj: 'tamo junto', vdd: 'verdade', sla: 'sei lá',
    pdc: 'pode crer', tlgd: 'tá ligado', ctz: 'certeza',
    ta: 'está', tah: 'está', to: 'estou', tou: 'estou', tava: 'estava', tavam: 'estavam',
    tamo: 'estamos', tamos: 'estamos', vo: 'vou', vamo: 'vamos', bora: 'vamos',
    neh: 'né', ne: 'né', aki: 'aqui', aq: 'aqui', naum: 'não', n: 'não', s: 'sim', ss: 'sim',
    dnv: 'de novo', mds: 'meu deus', entt: 'então', ent: 'então',
    eae: 'e aí', eai: 'e aí', iae: 'e aí', iai: 'e aí', oie: 'oi', oii: 'oi', hey: 'oi', hi: 'oi',
    hello: 'olá', xau: 'tchau', bye: 'tchau', tchauzinho: 'tchau',
    okay: 'ok', oks: 'ok', okk: 'ok', okey: 'ok', sqn: 'só que não', nois: 'nós',
    vey: 'véi', vei: 'véi', mano: 'mano', mana: 'mana', cara: 'cara', tipo: 'tipo',
    kkk: 'kkk', rs: 'rs'
  };

  // Abreviações neutras e erros comuns de escrita (não indicam informalidade).
  const ABREVIACOES = {
    concerteza: 'com certeza', derrepente: 'de repente', apartir: 'a partir', encima: 'em cima',
    denovo: 'de novo', obs: 'observação', info: 'informação', infos: 'informações',
    msg: 'mensagem', msgs: 'mensagens', qtd: 'quantidade', qtde: 'quantidade',
    func: 'funcionário', funcs: 'funcionários', colab: 'colaborador', colabs: 'colaboradores',
    manut: 'manutenção', proc: 'procedimento', doc: 'documento', docs: 'documentos',
    eqto: 'equipamento', equip: 'equipamento', trab: 'trabalho', ok: 'ok',
    exe: 'exemplo', ex: 'exemplo', tel: 'telefone', num: 'número', nro: 'número'
  };

  // Palavras funcionais ignoradas na busca por conteúdo (sem acentos).
  const STOPWORDS = new Set(palavras(`
    a o as os um uma uns umas de da do das dos em na no nas nos num numa por pelo pela pelos pelas
    para pra pro com sem sob sobre entre ate apos ao aos e ou mas que se me te lhe lhes eu tu ele ela
    nos vos voce voces eles elas meu minha meus minhas seu sua seus suas teu tua nosso nossa este esta
    isto esse essa isso aquele aquela aquilo la aqui ai ali ja ainda tambem so apenas muito muita
    muitos muitas pouco mais menos bem entao pois porque quando onde qual quais quem quanto quanta
    quantos quantas como e eh foi ser sao era estar estou estao esta estava ter tem tenho tinha ha
    haver vai vou pode posso podia poderia podem gostaria queria quero quer preciso precisa precisamos
    saber sabe sei dizer diz fala falar favor oi ola aurora tipo ne ok beleza cara mano vei alguma
    algum alguns algumas coisa coisas fazer faco faz feito feita sim nao certo sera seria gente ia
    tal tao todo toda todos todas tudo qualquer cada outro outra outros outras mesmo mesma assim
    agora hoje depois antes sempre nunca vez vezes hein ah oh eita opa uai bom boa dia tarde noite
    explica explicar explique detalhe detalha detalhar melhor ajuda ajudar me de do
  `));

  // Vocabulário de referência (com acentos): corrige digitação e restaura acentos.
  const VOCABULARIO = palavras(`
    você vocês não também então está estão estava é já até só lá aí após porém além através mês três
    olá obrigado obrigada amanhã manhã ótimo ótima péssimo horrível incrível possível impossível fácil
    difícil útil inútil rápido rápida último última próximo próxima número números código página
    público técnico técnica técnicos técnicas prático prática básico básica mínimo mínima máximo
    máxima válido válida dúvida dúvidas informação informações explicação situação questão questões
    opção opções atenção função funções relação sessão seção versão razão ação ações decisão opinião
    avaliação avaliações obrigação organização comunicação operação orientação orientações observação
    aplicação solução saúde água elétrica elétrico elétricas elétricos segurança proteção prevenção
    inspeção inspeções manutenção instalação instalações sinalização capacitação reciclagem validação
    identificação verificação liberação autorização permissão permissões emissão análise análises
    energização desenergização eletricidade tensão espaço espaços confinado confinados confinada altura
    alturas queda quedas andaime andaimes escada escadas cinturão paraquedista talabarte trava-quedas
    ancoragem mosquetão capacete capacetes óculos luva luvas botina botinas bota protetor auricular
    auditivo respirador máscara máscaras uniforme colete extintor extintores incêndio incêndios
    hidrante brigada emergência emergências evacuação rota fuga acidente acidentes incidente
    incidentes lesão lesões ferimento fratura queimadura choque trabalhador trabalhadores empregado
    empregados empregador funcionário funcionários colaborador colaboradores supervisor engenheiro
    médico exame exames admissional periódico demissional retorno risco riscos perigo perigos ruído
    calor poeira químico químicos química produto produtos inflamável inflamáveis combustível
    combustíveis explosivo explosivos máquina máquinas equipamento equipamentos ferramenta ferramentas
    bloqueio etiquetagem cadeado energia energias norma normas regulamentadora regulamentadoras
    obrigatório obrigatória obrigatórios obrigatórias necessário necessária exigência exigido prazo
    prazos validade vencimento periodicidade carga horária horas treinamento treinamentos curso cursos
    certificado certificados certificação documento documentos registro registros formulário relatório
    ficha fichas laudo programa gerenciamento comissão interna diálogo diário permissão preliminar
    procedimento procedimentos operacional instrução trabalho trabalhos atividade atividades serviço
    serviços empresa empresas setor área áreas local obra obras construção ergonomia ergonômica
    ergonômico postura levantamento insalubridade insalubre periculosidade perigoso perigosa adicional
    multa fiscalização auditoria investigação causa causas comunicação notificação primeiros socorros
    vítima vítimas resgate plano planos ventilação oxigênio atmosfera gás gases vapor vapores vazamento
    derramamento contenção sinal placa placas isolamento aterramento seccionamento disjuntor painel
    quadro cabo cabos vigia entrada autorizado autorizada responsável responsáveis responsabilidade
    líder liderança gestor gestão indicador indicadores comportamento cultura conscientização campanha
    reunião reuniões mandato eleição cipeiro cipeiros brigadista brigadistas diferença exemplo
    exemplos procedimento checklist modelo modelos preenchimento assinatura aprovação execução
    tarefa tarefas etapa etapas medida medidas controle controles coletiva individual regulamento
    legislação lei portaria item itens anexo capítulo conteúdo programático teórico teórica
    prática reciclar renovar vencer vence venceu vencido vencida validar emitir preencher assinar
    aprovar liberar realizar executar trabalhar subir descer entrar sair desligar ligar bloquear
    testar medir avaliar inspecionar verificar treinar comunicar notificar registrar investigar
    prevenir proteger evitar explicar entender ajudar mostrar perguntar responder funcionar existe
    existem têm há são será seria cansado cansada preocupado preocupada triste feliz ótimo legal
    bacana perfeito perfeita excelente maravilha tchau até logo breve bom dia boa tarde noite
    beleza tranquilo tranquila certeza verdade mentira piada hora horas data semana mês ano anos
    hoje ontem amanhã agora depois antes sempre nunca talvez sim não claro também ainda
    exposição exposto expostos limite limites tolerância nível níveis ruídos decibéis vibração
    radiação iluminação temperatura umidade ergonômicos biológico biológicos físico físicos
    dosimetria avaliação quantitativa qualitativa inventário ação preventiva corretiva
    ocupacional ocupacionais saúde médico atestado aptidão apto inapto afastamento afastado
    mudança transferência admissão demissão contratação terceirizado terceirizada terceiros
    prestador prestadores contratada contratante canteiro montagem desmontagem soldagem solda
    corte trabalho quente frio escavação vala valas içamento guindaste empilhadeira ponte rolante
    carga cargas movimentação transporte armazenagem armazenamento estoque almoxarifado
    caldeira caldeiras vaso vasos pressão tubulação tubulações tanque tanques silo silos
    galeria galerias poço poços reservatório reservatórios cisterna esgoto
  `);

  // Normas Regulamentadoras (títulos resumidos).
  const NRS = {
    1: 'Disposições Gerais e Gerenciamento de Riscos Ocupacionais',
    3: 'Embargo e Interdição',
    4: 'SESMT',
    5: 'CIPA',
    6: 'Equipamento de Proteção Individual',
    7: 'PCMSO',
    8: 'Edificações',
    9: 'Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos',
    10: 'Segurança em Instalações e Serviços em Eletricidade',
    11: 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais',
    12: 'Segurança no Trabalho em Máquinas e Equipamentos',
    13: 'Caldeiras, Vasos de Pressão, Tubulações e Tanques',
    14: 'Fornos',
    15: 'Atividades e Operações Insalubres',
    16: 'Atividades e Operações Perigosas',
    17: 'Ergonomia',
    18: 'Segurança e Saúde na Indústria da Construção',
    19: 'Explosivos',
    20: 'Inflamáveis e Combustíveis',
    21: 'Trabalhos a Céu Aberto',
    22: 'Mineração',
    23: 'Proteção Contra Incêndios',
    24: 'Condições Sanitárias e de Conforto',
    25: 'Resíduos Industriais',
    26: 'Sinalização de Segurança',
    28: 'Fiscalização e Penalidades',
    29: 'Trabalho Portuário',
    30: 'Trabalho Aquaviário',
    31: 'Agricultura, Pecuária e Silvicultura',
    32: 'Serviços de Saúde',
    33: 'Espaços Confinados',
    34: 'Construção e Reparação Naval',
    35: 'Trabalho em Altura',
    36: 'Abate e Processamento de Carnes',
    37: 'Plataformas de Petróleo',
    38: 'Limpeza Urbana e Manejo de Resíduos'
  };

  // Termos do domínio de SST: siglas, rótulos, gênero (para "do/da") e NR relacionada.
  const TERMOS = [
    { id: 'EPI', rotulo: 'EPI', nome: 'Equipamento de Proteção Individual', genero: 'm', nr: 6,
      padroes: ['\\bepis?\\b', 'equipamentos? de protecao individual'] },
    { id: 'EPC', rotulo: 'EPC', nome: 'Equipamento de Proteção Coletiva', genero: 'm',
      padroes: ['\\bepcs?\\b', 'equipamentos? de protecao coletiva'] },
    { id: 'APR', rotulo: 'APR', nome: 'Análise Preliminar de Risco', genero: 'f',
      padroes: ['\\baprs?\\b', 'analises? preliminar(?:es)? de riscos?', 'analises? de riscos?'] },
    { id: 'PT', rotulo: 'PT', nome: 'Permissão de Trabalho', genero: 'f',
      padroes: ['\\bpts?\\b(?! ?br)', 'permiss(?:ao|oes) de trabalho'] },
    { id: 'PET', rotulo: 'PET', nome: 'Permissão de Entrada e Trabalho', genero: 'f', nr: 33,
      padroes: ['\\bpet\\b', 'permiss(?:ao|oes) de entrada'] },
    { id: 'DDS', rotulo: 'DDS', nome: 'Diálogo Diário de Segurança', genero: 'm',
      padroes: ['\\bdds\\b', 'dialogos? diarios? de seguranca'] },
    { id: 'CAT', rotulo: 'CAT', nome: 'Comunicação de Acidente de Trabalho', genero: 'f',
      padroes: ['\\bcats?\\b', 'comunicac(?:ao|oes) de acidentes?'] },
    { id: 'CIPA', rotulo: 'CIPA', nome: 'Comissão Interna de Prevenção de Acidentes e de Assédio', genero: 'f', nr: 5,
      padroes: ['\\bcipas?\\b', '\\bcipeir[oa]s?\\b', 'comissao interna'] },
    { id: 'SESMT', rotulo: 'SESMT', nome: 'Serviço Especializado em Segurança e Medicina do Trabalho', genero: 'm', nr: 4,
      padroes: ['\\bsesmt\\b'] },
    { id: 'PGR', rotulo: 'PGR', nome: 'Programa de Gerenciamento de Riscos', genero: 'm', nr: 1,
      padroes: ['\\bpgr\\b', 'programa de gerenciamento de riscos?'] },
    { id: 'GRO', rotulo: 'GRO', nome: 'Gerenciamento de Riscos Ocupacionais', genero: 'm', nr: 1,
      padroes: ['\\bgro\\b', 'gerenciamento de riscos ocupacionais'] },
    { id: 'PCMSO', rotulo: 'PCMSO', nome: 'Programa de Controle Médico de Saúde Ocupacional', genero: 'm', nr: 7,
      padroes: ['\\bpcmso\\b'] },
    { id: 'ASO', rotulo: 'ASO', nome: 'Atestado de Saúde Ocupacional', genero: 'm', nr: 7,
      padroes: ['\\basos?\\b', 'atestados? de saude ocupacional'] },
    { id: 'LTCAT', rotulo: 'LTCAT', nome: 'Laudo Técnico das Condições Ambientais do Trabalho', genero: 'm',
      padroes: ['\\bltcat\\b'] },
    { id: 'PPP', rotulo: 'PPP', nome: 'Perfil Profissiográfico Previdenciário', genero: 'm',
      padroes: ['\\bppp\\b', 'perfil profissiografico'] },
    { id: 'FISPQ', rotulo: 'FDS/FISPQ', nome: 'Ficha com Dados de Segurança', genero: 'f',
      padroes: ['\\bfispqs?\\b', '\\bfds\\b', 'fichas? (?:com dados|de informac(?:ao|oes)) de seguranca'] },
    { id: 'LOTO', rotulo: 'bloqueio e etiquetagem (LOTO)', nome: 'Bloqueio e Etiquetagem', genero: 'm',
      padroes: ['\\bloto\\b', 'lock ?out', 'tag ?out', 'bloqueio e etiquetagem', 'bloqueio de energias?', 'bloqueio de fontes'] },
    { id: 'CA', rotulo: 'CA', nome: 'Certificado de Aprovação', genero: 'm', nr: 6,
      padroes: ['certificados? de aprovacao', '\\bca (?:do|da|de|dos) (?:epi|luva|capacete|oculos|botina|cinto|protetor|respirador)',
        '\\b(?:numero|n) do ca\\b', '\\bca (?:vencido|valido|venceu|vence|vencer)'] },
    { id: 'SPDA', rotulo: 'SPDA', nome: 'Sistema de Proteção contra Descargas Atmosféricas', genero: 'm',
      padroes: ['\\bspda\\b', 'para[ -]?raios?'] },
    { id: 'PAE', rotulo: 'PAE', nome: 'Plano de Atendimento a Emergências', genero: 'm',
      padroes: ['\\bpae\\b', 'planos? de (?:atendimento a |resposta a )?emergencias?'] },
    { id: 'SEP', rotulo: 'SEP', nome: 'Sistema Elétrico de Potência', genero: 'm', nr: 10,
      padroes: ['\\bsep\\b', 'sistema eletrico de potencia'] },
    { id: 'AET', rotulo: 'AET', nome: 'Análise Ergonômica do Trabalho', genero: 'f', nr: 17,
      padroes: ['\\baet\\b', 'analise ergonomica'] },
    { id: 'AEP', rotulo: 'AEP', nome: 'Avaliação Ergonômica Preliminar', genero: 'f', nr: 17,
      padroes: ['\\baep\\b', 'avaliacao ergonomica preliminar'] },
    { id: 'BRIGADA', rotulo: 'brigada de emergência', nome: 'Brigada de Emergência', genero: 'f', nr: 23,
      padroes: ['\\bbrigad(?:a|as|ista|istas)\\b'] },
    { id: 'EXTINTOR', rotulo: 'extintores', nome: 'Extintores de Incêndio', genero: 'm', nr: 23,
      padroes: ['\\bextintor(?:es)?\\b', 'classes? de (?:fogo|incendio)'] },
    { id: 'QUASE_ACIDENTE', rotulo: 'quase-acidente', nome: 'Quase-acidente', genero: 'm',
      padroes: ['quase[ -]?acidentes?', 'near ?miss', '\\bincidentes?\\b'] }
  ];

  // Palavras que implicam uma NR mesmo sem ela ser citada.
  const TEMAS_NR = [
    [/\b(?:altura|alturas|andaime|telhado|cinto paraquedista|cinturao|talabarte|trava ?quedas?|linha de vida|ancoragem|queda de pessoas?)\b/, 35],
    [/\b(?:eletric\w*|energizad\w*|desenergiz\w*|choque eletrico|tensao eletrica|alta tensao|baixa tensao|painel eletrico|quadro eletrico|subestac\w*)\b/, 10],
    [/\b(?:espacos? confinados?|tanques?|silos?|galerias?|pocos? de visita|vigia)\b/, 33],
    [/\b(?:maquinas?|prensas?|protec(?:ao|oes) de maquinas?|intertravamento|parada de emergencia)\b/, 12],
    [/\b(?:incendios?|fogo|extintor(?:es)?|hidrantes?|rota de fuga|saida de emergencia)\b/, 23],
    [/\b(?:ergonomi\w*|postura|levantamento de peso|mobiliario|lesao por esforco|ler|dort)\b/, 17],
    [/\b(?:insalubr\w*)\b/, 15],
    [/\b(?:periculos\w*)\b/, 16],
    [/\b(?:caldeiras?|vasos? de pressao)\b/, 13],
    [/\b(?:inflamave\w*|combustive\w*)\b/, 20],
    [/\b(?:construcao civil|canteiro de obras?|obras?)\b/, 18],
    [/\b(?:sinalizac\w*|cores de seguranca|placas? de seguranca)\b/, 26],
    [/\b(?:empilhadeiras?|ponte rolante|movimentac\w* de (?:carga|materia)\w*|icamento)\b/, 11]
  ];

  // Grupos de sinônimos (sem acentos). Ampliam a busca com peso reduzido.
  const SINONIMOS = [
    'validade vencimento vence vencer expira expirar reciclagem periodicidade renovacao renovar prazo vale valer',
    'treinamento treinar curso capacitacao capacitar qualificacao instrucao treino certificado certificacao',
    'obrigatorio obrigatoria exigido exigencia exige necessario necessaria requisito',
    'acidente acidentes sinistro ocorrencia',
    'funcionario trabalhador colaborador empregado operador profissional',
    'empresa empregador organizacao companhia',
    'risco perigo',
    'altura elevada elevado andaime telhado',
    'eletricidade eletrica eletrico energia tensao voltagem energizado',
    'cinto cinturao paraquedista',
    'incendio fogo chama',
    'documento formulario registro modelo ficha',
    'elaborar preencher emitir criar montar gerar redigir',
    'exame consulta',
    'ruido barulho decibeis',
    'multa penalidade autuacao infracao',
    'significado definicao conceito significa',
    'permissao autorizacao liberacao',
    'emergencia urgencia socorro',
    'inspecao vistoria verificacao checagem checklist auditoria',
    'bloqueio travamento cadeado',
    'responsavel responsabilidade encarregado',
    'procedimento processo metodo passo etapa',
    'mexer trabalhar intervir operar manusear manipular executar',
    'painel quadro instalacao',
    'desligar desenergizar desenergizacao seccionar',
    'gratis gratuito gratuitamente graca',
    'horas horaria duracao'
  ].map(palavras);

  // Vocabulário técnico (eleva o índice de tecnicidade da mensagem).
  const TECNICOS = new Set(palavras(`
    talabarte trava quedas ancoragem mosquetao absorvedor fator zona livre aterramento seccionamento
    desenergizacao equipotencializacao controlada sep idr dr dps spda nbr abnt iso limite tolerancia
    dosimetria decibeis db ibutg lux ppm lie lii explosividade oxigenio h2s monoxido exaustao insuflamento
    intertravamento cortina rele categoria hazop fmea bowtie hht fap rat ntep esocial loto hasp
    cinturao paraquedista inventario gro pgr pcmso ltcat ppp aso pet apr fispq ca epi epc cipa sesmt
    carga horaria reciclagem periodica nr item anexo portaria vigia supervisor entrada atmosfera
  `));

  // Palavras comuns (sem acentos) que nunca devem ser "corrigidas".
  const PALAVRAS_COMUNS = palavras(`
    fui foi fiz fez vou vai vamos estou estava tenho tinha tive teve quero queria posso pode sei sabe
    acho achei vejo vi viu falei disse pensei gosto gostei precisei trabalhei cheguei chegou sai saiu
    entrei liguei deu dei da dar ter ser ir ver vir vem veio fica ficou fiquei deixa deixei passa passou
    usa usei usou faco faz fazendo falando pensando trabalhando tentando tentei consegui conseguiu consigo
    casa carro coisa pessoa pessoas gente mundo vida tempo dia dias noite semana ano hora minuto vez parte
    lugar forma jeito caso problema chefe colega amigo amiga familia filho filha pai mae nome cidade rua
    agua comida cafe almoco janta bom boa ruim grande pequeno pequena novo nova velho certo errado errada
    facil rapido lento alto baixo cedo longe perto cheio vazio quente frio pronto pronta feliz triste
    cansado cansada ontem hoje amanha sempre nunca talvez tambem porque quando onde como qual quais quem
    quanto muito pouco mais menos nada tudo algo alguem ninguem cada outro outra mesmo mesma ainda agora
    depois antes logo tarde junto juntos sozinho aqui ali la isso isto aquilo esse essa este esta
    obrigado obrigada valeu beleza tchau oi ola bem mal sim nao claro legal otimo otima show top perfeito
    entendi entender entende explica explicar explique pergunta perguntar resposta responder responde
    quer queremos querem precisa precisam precisamos devo deve devem podemos podem sabia sabemos
    duvida duvidas ajuda ajudar ajude obrigatorio certeza verdade exemplo exemplos tipo tipos jeito
    melhor pior maior menor primeiro primeira segundo segunda terceiro ultimo ultima proximo proxima
    semana mes meses anos horas minutos segundos dias vezes coisas pessoas lugares partes formas
    aurora ops safety first sistema app aplicativo site tela botao chat conversa mensagem texto
    conta contas conte contar contou contei piada historia fala falo diz dizer disse manda mande mandar
    mandei olha olhe olhar veja vejo pega pegar peguei bota botar coloca colocar coloquei abre abrir abri
    fecha fechar liga desliga sobe desce entra sai volta voltar voltei espera esperar esperei chama chamar
    chamei pede pedir pedi paga pagar compra comprar joga jogar ler li escreve escrever escrevi aprende
    aprender aprendi ensina ensinar estuda estudar mora morar gosta gostar ama amar pensa pensar acha achar
    conhece conhecer lembra lembrar lembrei esquece esquecer esqueci perde perder perdi ganha ganhar
    tenta tentar conseguir deixar ficar chega chegar passar leva levar levei traz trazer trouxe usar
    dinheiro turno escala folga salario pagamento banco celular telefone email senha login arquivo
    planilha projeto tarefa solucao ideia numero lugar escola faculdade aula prova musica filme jogo
    futebol time cerveja bonito bonita feio feia verdadeiro falso importante diferente igual anterior
    seguinte algum alguma nenhum nenhuma todo toda todos todas cada varios varias tanto tanta
    equipe grupo pessoal galera colegas chefia gerencia diretoria cliente clientes fornecedor
    manha meio dia madrugada cedo tarde hoje agora ja logo depois antes enquanto durante apenas
    sim claro certo certeza exato verdade mentira talvez nunca sempre jamais quase bastante demais
    curto curta curtos curtas longo longa longos longas breve breves direto direta diretos objetivo
    objetiva simples complexo complicado rapido rapida devagar socorro urgente ajuda perigo cuidado
    tecnica tecnico mais menos junto separado aberto aberta fechado fechada ligado ligada desligado
    cheia vazia alta alto baixa baixo forte fraco leve pesada pesado quente fria morno seco molhado
    responda responde respondi resumo resuma resume explica explique explicar detalha detalhe
    nome sobrenome idade apelido chamo chama chamada chamado conheco prazer
  `);

  const UNIDADES = new Set(palavras(`
    m metro metros cm mm km kg g t v kv a ma w kw h hs hr hrs horas min s seg db dba lux ppm c graus bar psi
  `));

  // ===========================================================================
  // 3. Radicalização (stemmer) — adaptação do Snowball para português sem acentos
  // ===========================================================================

  const ehVogal = (c) => c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u';

  const EXCECOES_PLURAL = new Set(palavras(`
    mais menos lapis onibus virus bonus status campus pires tenis atraves apos depois pois simples
    ferias oculos gas mes tres jamais demais cais pais seis alias ingles portugues frances antes
  `));

  function singular(w) {
    if (w.length < 4 || EXCECOES_PLURAL.has(w)) return w;
    if (w.endsWith('ns')) return w.slice(0, -2) + 'm';
    if (w.endsWith('oes') || w.endsWith('aes')) return w.slice(0, -3) + 'ao';
    if (w.endsWith('ais') && w.length > 4) return w.slice(0, -3) + 'al';
    if (w.endsWith('eis') && w.length > 5) return w.slice(0, -3) + 'el';
    if ((w.endsWith('res') || w.endsWith('ses')) && w.length > 5) return w.slice(0, -2);
    if (w.endsWith('zes') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('s') && ehVogal(w[w.length - 2])) return w.slice(0, -1);
    return w;
  }

  function regioes(w) {
    const n = w.length;
    let r1 = n;
    let r2 = n;
    let rv = n;
    for (let i = 1; i < n; i++) if (!ehVogal(w[i]) && ehVogal(w[i - 1])) { r1 = i + 1; break; }
    for (let i = r1 + 1; i < n; i++) if (!ehVogal(w[i]) && ehVogal(w[i - 1])) { r2 = i + 1; break; }
    if (n >= 2) {
      if (!ehVogal(w[1])) {
        for (let i = 2; i < n; i++) if (ehVogal(w[i])) { rv = i + 1; break; }
      } else if (ehVogal(w[0])) {
        for (let i = 2; i < n; i++) if (!ehVogal(w[i])) { rv = i + 1; break; }
      } else {
        rv = Math.min(3, n);
      }
    }
    return { r1, r2, rv };
  }

  const SUFIXOS_1 = [];
  [
    ['r2', 'eza ezas ico ica icos icas ismo ismos avel ivel ista istas oso osa osos osas amento amentos imento imentos adora ador acao adoras adores acoes ante antes ancia'],
    ['logia', 'logia logias'], ['ucao', 'ucao ucoes'], ['encia', 'encia encias'], ['amente', 'amente'],
    ['mente', 'mente'], ['idade', 'idade idades'], ['iva', 'iva ivo ivas ivos'], ['ira', 'ira iras']
  ].forEach(([tipo, lista]) => palavras(lista).forEach((suf) => SUFIXOS_1.push({ suf, tipo })));
  SUFIXOS_1.sort((a, b) => b.suf.length - a.suf.length);

  const SUFIXOS_2 = palavras(`
    ada ida ia aria eria iria ara era ira ava asse esse isse aste este iste ei arei erei irei am iam ariam
    eriam iriam aram eram iram avam em arem erem irem assem essem issem ado ido ando endo indo arao erao
    irao ar er ir as adas idas ias arias erias irias aras eras iras avas es ardes erdes irdes ares eres
    ires asses esses isses astes estes istes is ais eis ieis arieis erieis irieis areis ereis ireis asseis
    esseis isseis aveis ados idos amos iamos ariamos eriamos iriamos aramos eramos iramos avamos emos
    aremos eremos iremos assemos essemos issemos imos armos ermos irmos eu iu ou
  `).sort((a, b) => b.length - a.length);

  function cortarSe(x, sufixos, limite) {
    for (const s of sufixos) if (x.endsWith(s) && x.length - s.length >= limite) return x.slice(0, -s.length);
    return x;
  }

  function passo1(w, R) {
    const m = SUFIXOS_1.find((s) => w.endsWith(s.suf));
    if (!m) return null;
    const i = w.length - m.suf.length;
    const x = w.slice(0, i);
    switch (m.tipo) {
      case 'r2': return i >= R.r2 ? x : null;
      case 'logia': return i >= R.r2 ? x + 'log' : null;
      case 'ucao': return i >= R.r2 ? x + 'u' : null;
      case 'encia': return i >= R.r2 ? x + 'ente' : null;
      case 'amente': {
        if (i < R.r1) return null;
        if (x.endsWith('iv') && x.length - 2 >= R.r2) return cortarSe(x.slice(0, -2), ['at'], R.r2);
        return cortarSe(x, ['os', 'ic', 'ad'], R.r2);
      }
      case 'mente': return i >= R.r2 ? cortarSe(x, ['ante', 'avel', 'ivel'], R.r2) : null;
      case 'idade': return i >= R.r2 ? cortarSe(x, ['abil', 'ic', 'iv'], R.r2) : null;
      case 'iva': return i >= R.r2 ? cortarSe(x, ['at'], R.r2) : null;
      case 'ira': return i >= R.rv && w[i - 1] === 'e' ? x + 'ir' : null;
      default: return null;
    }
  }

  function passo2(w, R) {
    const s = SUFIXOS_2.find((suf) => w.endsWith(suf));
    if (!s) return null;
    const i = w.length - s.length;
    return i >= R.rv ? w.slice(0, i) : null;
  }

  const cacheRadical = new Map();

  function radical(palavra) {
    if (palavra.length <= 3 || /\d/.test(palavra)) return palavra;
    const guardado = cacheRadical.get(palavra);
    if (guardado) return guardado;
    let w = singular(palavra);
    const R = regioes(w);
    let alterada = false;
    const p1 = passo1(w, R);
    if (p1 != null) {
      w = p1;
      alterada = true;
    } else {
      const p2 = passo2(w, R);
      if (p2 != null) {
        w = p2;
        alterada = true;
      }
    }
    if (alterada) {
      if (w.endsWith('ci') && w.length - 1 >= R.rv) w = w.slice(0, -1);
    } else {
      w = cortarSe(w, ['os', 'a', 'i', 'o'], R.rv);
    }
    if (w.endsWith('e') && w.length - 1 >= R.rv) {
      w = w.slice(0, -1);
      if ((w.endsWith('gu') || w.endsWith('ci')) && w.length - 1 >= R.rv) w = w.slice(0, -1);
    }
    if (w.length < 2) w = palavra;
    if (cacheRadical.size > 20000) cacheRadical.clear();
    cacheRadical.set(palavra, w);
    return w;
  }

  // Mapa radical → grupo de sinônimos (radicais).
  const SINONIMOS_RADICAIS = new Map();
  SINONIMOS.forEach((grupo) => {
    const radicais = [...new Set(grupo.map(radical))];
    radicais.forEach((r) => {
      const atual = SINONIMOS_RADICAIS.get(r) || new Set();
      radicais.forEach((o) => { if (o !== r) atual.add(o); });
      SINONIMOS_RADICAIS.set(r, atual);
    });
  });

  // ===========================================================================
  // 4. Léxico dinâmico (vocabulário conhecido, acentos e alvos de correção)
  // ===========================================================================

  const TERMOS_COMPILADOS = TERMOS.map((t) => Object.assign({}, t, { re: new RegExp(t.padroes.join('|')) }));

  function criarLexico() {
    const lexico = {
      conhecidas: new Set(),
      acentuadas: new Map(),
      alvos: new Map(),
      pesos: new Map()
    };
    [STOPWORDS, PALAVRAS_COMUNS, Object.keys(GIRIAS), Object.keys(ABREVIACOES), UNIDADES, TECNICOS]
      .forEach((lista) => lista.forEach((w) => lexico.conhecidas.add(w)));
    VOCABULARIO.forEach((w) => adicionarPalavra(lexico, w, 1));
    // Nomes das siglas: só restauram acentos (não viram alvo de correção).
    TERMOS.forEach((t) => (t.nome + ' ' + t.rotulo).toLowerCase().split(/[^\p{L}\p{N}]+/u).forEach((w) => {
      const base = semAcentos(w);
      if (!base) return;
      lexico.conhecidas.add(base);
      if (w !== base && !lexico.acentuadas.has(base)) lexico.acentuadas.set(base, w);
    }));
    return lexico;
  }

  function adicionarPalavra(lexico, exibicao, peso) {
    exibicao.toLowerCase().split(/[^\p{L}\p{N}]+/u).forEach((parte) => {
      if (!parte || parte.length < 2 || /\d/.test(parte)) return;
      const base = semAcentos(parte);
      lexico.conhecidas.add(base);
      if (parte !== base && !lexico.acentuadas.has(base)) lexico.acentuadas.set(base, parte);
      if (base.length >= 4) {
        const anterior = lexico.pesos.get(base) || 0;
        lexico.pesos.set(base, anterior + peso);
        if (!anterior) {
          const inicial = base[0];
          if (!lexico.alvos.has(inicial)) lexico.alvos.set(inicial, []);
          lexico.alvos.get(inicial).push(base);
        }
      }
    });
  }

  // Troca de duas letras vizinhas ("nroma" → "norma") ou uma letra faltando ("cuso" → "curso").
  function erroSeguroCurto(token, alvo) {
    if (alvo.length === token.length + 1) {
      for (let i = 0; i < alvo.length; i++) if (alvo.slice(0, i) + alvo.slice(i + 1) === token) return true;
      return false;
    }
    if (alvo.length !== token.length) return false;
    const dif = [];
    for (let i = 0; i < token.length; i++) if (token[i] !== alvo[i]) dif.push(i);
    return dif.length === 2 && dif[1] === dif[0] + 1 && token[dif[0]] === alvo[dif[1]] && token[dif[1]] === alvo[dif[0]];
  }

  function corrigirPalavra(base, lexico) {
    const n = base.length;
    if (n < 4 || n > 24) return null;
    const max = n >= 10 ? 2 : 1;
    const candidatos = lexico.alvos.get(base[0]);
    if (!candidatos) return null;
    let melhor = null;
    let melhorD = max + 1;
    let melhorPeso = -1;
    for (const c of candidatos) {
      if (Math.abs(c.length - n) > max) continue;
      if (c === base + 's' || base === c + 's') continue;
      if (n <= 5 && !erroSeguroCurto(base, c)) continue;
      const d = distancia(base, c, max);
      if (d > max) continue;
      const peso = lexico.pesos.get(c) || 0;
      if (d < melhorD || (d === melhorD && peso > melhorPeso)) {
        melhor = c;
        melhorD = d;
        melhorPeso = peso;
      }
    }
    return melhor;
  }

  // ===========================================================================
  // 5. Análise do texto: sinais, tokens, gírias, correções e entidades
  // ===========================================================================

  const EMOJIS_POSITIVOS = '😀😃😄😁😆😊🙂😉😍🥰😘👍👏🙏💪🎉✅❤💚💙😂🤣🤗😎🥳⭐✨👌🙌';
  const EMOJIS_NEGATIVOS = '😠😡🤬😤😞😔😟😢😭😩😫👎💔😒🙄😕☹😣😖😰😨😱🤦';
  const RE_EMOJI = /\p{Extended_Pictographic}/gu;
  const RE_RISO = /(?:^|\s)(?:k{3,}|(?:ha){2,}h?|(?:he){2,}h?|(?:hu?a){2,}h?|(?:rs){1,}|(?:hi){2,}|lol)(?=\s|$)/;
  const GIRIAS_NEUTRAS = new Set(['d', 'p', 'pra', 'pro', 'pras', 'pros', 'q', 'ok']);

  function extrairSinais(texto) {
    const letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, '');
    const maiusculas = texto.replace(/[^A-ZÀ-Þ]/g, '').length;
    const emojis = texto.match(RE_EMOJI) || [];
    const minus = semAcentos(texto.toLowerCase());
    return {
      pergunta: /\?/.test(texto),
      exclamacoes: (texto.match(/!/g) || []).length,
      gritando: letras.length >= 8 && maiusculas / letras.length > 0.7,
      reticencias: /\.\.\.|…/.test(texto),
      risos: RE_RISO.test(' ' + minus.replace(/[^a-z0-9\s]/g, ' ') + ' '),
      emojisPositivos: emojis.filter((e) => EMOJIS_POSITIVOS.includes(e)).length,
      emojisNegativos: emojis.filter((e) => EMOJIS_NEGATIVOS.includes(e)).length,
      emojis: emojis.length,
      alongamentos: (minus.match(/([a-z])\1{2,}/g) || []).filter((m) => m[0] !== 'k').length,
      maiusculaInicial: /^[A-ZÀ-Þ]/.test(texto.trim()),
      pontuacaoFinal: /[.!?…]$/.test(texto.trim()),
      tamanho: texto.trim().length
    };
  }

  // Palavras escritas com inicial maiúscula no meio da frase (provável nome próprio).
  function nomesProprios(texto) {
    const nomes = new Set();
    texto.split(/[.!?\n]+/).forEach((frase) => {
      const ps = frase.trim().split(/\s+/);
      ps.slice(1).forEach((p) => {
        const limpa = p.replace(/[^\p{L}]/gu, '');
        if (/^\p{Lu}\p{Ll}+$/u.test(limpa)) nomes.add(semAcentos(limpa.toLowerCase()));
      });
    });
    return nomes;
  }

  function normalizarNRs(s) {
    return s
      .replace(/\bnormas? regulamentadoras? (?:n[oº°]?\.?\s*)?(\d{1,2})\b/g, ' nr$1 ')
      .replace(/\bn\.?\s?r\.?\s*(?:[-–—]|n[oº°]\.?)?\s*(\d{1,2})\b/g, ' nr$1 ')
      .replace(/\bnorma (?:n[oº°]?\.?\s*)?(\d{1,2})\b/g, ' nr$1 ');
  }

  function formatarNR(num, formato) {
    if (formato === 'NR 35') return 'NR ' + num;
    if (formato === 'NR35') return 'NR' + num;
    return 'NR-' + num;
  }

  function analisarTexto(texto, lexico, opcoes) {
    const original = String(texto == null ? '' : texto);
    const sinais = extrairSinais(original);
    const nomes = nomesProprios(original);
    let minusculo = original.normalize('NFC').toLowerCase().replace(/['’]s\b/g, 's');
    minusculo = normalizarNRs(minusculo);
    minusculo = minusculo.replace(/(\p{L})\1{2,}/gu, (m, c) => (c === 'r' || c === 's' ? c + c : c));
    const brutos = minusculo.match(/[\p{L}\p{N}]+/gu) || [];
    const curta = brutos.length <= 3;
    const tokens = [];
    const correcoes = [];
    let girias = 0;

    const empurrar = (exib, base, extra) => tokens.push(Object.assign({ exib, base }, extra || {}));

    brutos.forEach((bruto, i) => {
      const base = semAcentos(bruto);
      const anterior = i > 0 ? semAcentos(brutos[i - 1]) : '';
      const aposNumero = /^\d+([.,]\d+)?$/.test(anterior);
      if (/^\d+$/.test(base)) return empurrar(bruto, base, { tipo: 'numero' });
      const nr = base.match(/^nr(\d{1,2})$/);
      if (nr) return empurrar(formatarNR(parseInt(nr[1], 10), opcoes.formatoNR), base, { tipo: 'nr' });
      if (aposNumero && UNIDADES.has(base)) return empurrar(bruto, base, { tipo: 'unidade' });
      if (base === 'cm') return empurrar('como', 'como', { giria: true });
      if ((base === 's' || base === 'ss') && !curta) return empurrar(bruto, base);
      if (Object.prototype.hasOwnProperty.call(GIRIAS, base) && GIRIAS[base] !== base) {
        if (!GIRIAS_NEUTRAS.has(base)) girias++;
        return GIRIAS[base].split(' ').forEach((p) => empurrar(p, semAcentos(p), { giria: true, de: bruto }));
      }
      if (Object.prototype.hasOwnProperty.call(GIRIAS, base)) girias++;
      if (Object.prototype.hasOwnProperty.call(ABREVIACOES, base) && ABREVIACOES[base] !== base) {
        return ABREVIACOES[base].split(' ').forEach((p) => empurrar(p, semAcentos(p), { de: bruto }));
      }
      if (lexico.conhecidas.has(base)) {
        const exib = bruto === base ? lexico.acentuadas.get(base) || bruto : bruto;
        return empurrar(exib, base);
      }
      if (!nomes.has(base)) {
        const corrigida = corrigirPalavra(base, lexico);
        if (corrigida) {
          const exib = lexico.acentuadas.get(corrigida) || corrigida;
          correcoes.push({ de: bruto, para: exib });
          return empurrar(exib, corrigida, { corrigida: true, de: bruto });
        }
      }
      return empurrar(bruto, base, { desconhecida: true });
    });

    const expandido = tokens.map((t) => t.base).join(' ');
    // Versão sem as correções ortográficas: as intenções são testadas nas duas.
    const expandidoBruto = correcoes.length ? tokens.map((t) => (t.corrigida ? semAcentos(t.de.toLowerCase()) : t.base)).join(' ') : expandido;
    return { original, minusculo, sinais, tokens, correcoes, girias, expandido, expandidoBruto, nomes };
  }

  function detectarEntidades(expandido) {
    const entidades = [];
    const vistos = new Set();
    const add = (e) => { if (!vistos.has(e.id)) { vistos.add(e.id); entidades.push(e); } };
    for (const m of expandido.matchAll(/\bnr(\d{1,2})\b/g)) {
      const num = parseInt(m[1], 10);
      add({ tipo: 'nr', id: 'NR-' + num, num, rotulo: 'NR-' + num, nome: NRS[num] || null, genero: 'f', explicita: true });
    }
    TERMOS_COMPILADOS.forEach((t) => {
      if (t.re.test(expandido)) add({ tipo: 'termo', id: t.id, rotulo: t.rotulo, nome: t.nome, genero: t.genero, nr: t.nr || null });
    });
    const implicitas = [];
    TEMAS_NR.forEach(([re, num]) => { if (re.test(expandido)) implicitas.push(num); });
    entidades.filter((e) => e.nr).forEach((e) => implicitas.push(e.nr));
    implicitas.forEach((num) => add({ tipo: 'nr', id: 'NR-' + num, num, rotulo: 'NR-' + num, nome: NRS[num] || null, genero: 'f', implicita: true }));
    return entidades;
  }

  // ===========================================================================
  // 6. Intenções (atos de conversa) — avaliadas sobre o texto já normalizado
  // ===========================================================================

  const INTENCOES = [
    ['saudacao', [
      [/^(?:ola|oi|opa|alo|salve|hello|e ai|bom dia|boa tarde|boa noite|boa madrugada|saudacoes|prezad[oa]s?|hey)\b/, 0.9],
      [/^fala(?: (?:ai|ae|aurora|tu|galera|pessoal))?$/, 0.85],
      [/\b(?:bom dia|boa tarde|boa noite)\b/, 0.75],
      [/\b(?:ola|oi)\b/, 0.6]
    ]],
    ['como_vai', [
      [/\b(?:tudo (?:bem|bom|certo|tranquilo|joia|beleza|ok|em cima|na paz|certinho)|como (?:vai|voce esta|voce vai|esta voce|voce ta|estas|anda voce|tem passado|esta o seu dia|esta seu dia|foi seu dia)|(?:e )?voce (?:esta|ta|vai) bem|ta tudo bem|esta tudo bem|como e que (?:voce )?(?:esta|vai))\b/, 0.8],
      [/^(?:como (?:voce )?(?:esta|ta)|beleza|firmeza|suave|de boa|tudo joia|td bem)$/, 0.7],
      [/^(?:oi|ola|opa|e ai|fala|salve|bom dia|boa tarde|boa noite)\b.*\b(?:beleza|firmeza|suave|de boa|tudo joia|tudo certo|tudo bem|tudo bom)$/, 0.75],
      [/\b(?:e (?:voce|contigo|com voce|tu))$/, 0.7]
    ]],
    ['estado_positivo', [
      [/\b(?:(?:estou|ando|tudo|ta tudo|esta tudo|vou|estamos) (?:bem|otimo|otima|bom|tranquilo|tranquila|joia|beleza|de boa|suave|feliz|animad[oa]|na paz|certo|em cima|show|perfeito)|tudo (?:otimo|certo|tranquilo|joia|beleza|em cima|na paz|sim|bem sim|bem e voce|bem e com voce|bem por aqui)|(?:bem|otimo|otima|tranquilo|de boa|suave) (?:e voce|e com voce|obrigad[oa]|gracas|valeu|tambem)|gracas a deus|vou bem|melhor agora|bem tambem|tudo sim|estou bem)\b/, 0.8]
    ]],
    ['estado_negativo', [
      [/\b(?:(?:estou|ando|me sinto|sinto me|fiquei|me sentindo|estamos) (?:mal|meio mal|cansad[oa]s?|triste|estressad[oa]|preocupad[oa]|ansios[oa]|chatead[oa]|irritad[oa]|doente|exaust[oa]|esgotad[oa]|desanimad[oa]|sobrecarregad[oa]|com medo|nervos[oa]|frustrad[oa]|sem paciencia|sem energia|com sono|com dor)|dia (?:dificil|pesado|ruim|complicado|corrido|puxado|cheio|tenso|cansativo|longo)|nao (?:estou|ando) (?:bem|muito bem|legal|nada bem)|mais ou menos|vou indo|levando|sobrevivendo|ja estive melhor|podia estar melhor|poderia estar melhor)\b/, 0.8]
    ]],
    ['agradecimento', [
      [/\b(?:obrigad[oa]s?|valeu|agradec\w*|grat[oa]|gratidao|thanks|thank you|tamo junto|obrigadao|me ajudou|ajudou (?:muito|demais|bastante)|salvou)\b/, 0.9]
    ]],
    ['elogio', [
      [/\b(?:voce e|voce eh|es) (?:(?:muito|super|bem|demais|mesmo) )?(?:otima|incrivel|demais|sensacional|fantastica|excelente|maravilhosa|inteligente|esperta|top|show|brilhante|genial|a melhor|perfeita|boa|fera|craque|util)\b/, 0.9],
      [/\b(?:mandou bem|arrasou|gostei (?:muito )?(?:da|de|dessa) (?:resposta|explicacao)|adorei|amei|excelente (?:resposta|explicacao)|resposta (?:perfeita|excelente|otima|completa|boa)|muito util|me salvou|explicou (?:muito )?bem|boa resposta|otima resposta|show de bola)\b/, 0.85],
      [/^(?:muito )?(?:bom|boa|otimo|otima|excelente|perfeito|perfeita|show|top|massa|legal|incrivel|sensacional|maravilha|fantastico|demais|dahora|daora|bacana|genial|lindo)(?: demais| mesmo| de bola)?$/, 0.7]
    ]],
    ['despedida', [
      [/\b(?:tchau|ate (?:mais|logo|amanha|breve|a proxima|depois|segunda|semana que vem|outro dia|mais tarde)|falou|adeus|bom descanso|bom fim de semana|boa semana|tenha um bom dia|tenha uma boa (?:tarde|noite)|beijos|abracos|abraco|por hoje e so|era so isso|so isso mesmo|e so isso|encerrar (?:a )?conversa)\b/, 0.85],
      [/^fui$/, 0.8]
    ]],
    ['identidade', [
      [/\b(?:quem (?:e|eh) (?:voce|tu|a aurora)|quem (?:e )?voce|qual (?:e )?(?:o )?seu nome|como (?:voce )?se chama|como (?:devo )?te chamar|voce (?:e|eh) (?:um |uma )?(?:robo|bot|humana|humano|pessoa|ia|inteligencia artificial|maquina|real|de verdade|gente|chatgpt|gpt|virtual|programa)|o que (?:e|eh) voce|o que voce e|se apresenta|apresente se|fale (?:um pouco )?sobre voce|me fala (?:de|sobre) voce|quem te (?:criou|fez|desenvolveu|programou)|quem (?:criou|fez|desenvolveu|programou) voce)\b/, 0.9]
    ]],
    ['capacidades', [
      [/\b(?:o que (?:voce )?(?:faz|sabe|pode|consegue)(?: fazer)?$|(?:como|em que|no que) (?:voce )?(?:pode|consegue) (?:me )?ajudar|para que (?:voce )?serve$|quais (?:sao )?(?:as )?(?:suas )?(?:funcoes|funcionalidades|habilidades|capacidades)|(?:que|quais) (?:assuntos|temas|topicos|perguntas) (?:voce )?(?:sabe|conhece|domina|responde)|o que (?:eu )?(?:posso|da para) (?:te )?perguntar|como (?:voce )?funciona$|como (?:te )?usar|como usar voce)/, 0.85],
      [/^(?:ajuda|help|menu|opcoes|comandos)$/, 0.8]
    ]],
    ['ajuda', [
      [/\b(?:(?:voce )?(?:pode|poderia|consegue) me ajudar|me ajuda|preciso de (?:uma )?(?:ajuda|forca|help|auxilio|apoio)|me (?:da|de) uma (?:forca|mao|ajuda)|(?:tenho|estou com) (?:uma )?(?:duvida|pergunta|questao))\b/, 0.6]
    ]],
    ['solicitacao', [
      [/^(?:(?:por favor|voce pode|pode|poderia) )?(?:crie|cria|gere|gera|faca|monte|monta|elabore|elabora|escreva|escreve|redija|prepare|prepara|mande|manda|envie|envia|mostre|mostra|liste|lista|calcule|calcula|revise|revisa|corrija|corrige|preencha|organize|sugira)\b/, 0.7],
      [/\b(?:preciso|quero|queria|gostaria|necessito) (?:de )?(?:um|uma|uns|umas|saber|entender|ver|fazer|criar|montar|elaborar)\b/, 0.6],
      [/\b(?:pode|poderia|consegue|conseguiria|da para|daria para) (?:me )?(?:fazer|criar|gerar|montar|mandar|enviar|mostrar|listar|elaborar|escrever|explicar|passar|dizer|falar|informar)\b/, 0.6]
    ]],
    ['esclarecer', [
      [/\b(?:nao entendi|nao compreendi|nao ficou claro|ficou confuso|nao captei|nao peguei|como assim|nao consegui entender|explica de novo|de outra forma|de outro jeito|mais simples|nao sei se entendi|pode simplificar)\b/, 0.9],
      [/^(?:hein|que|como|o que)$/, 0.6]
    ]],
    ['detalhar', [
      [/\b(?:(?:explicar|explique|explica|detalhar|detalhe|detalha|aprofundar|aprofunda|desenvolver|desenvolve)(?: melhor| mais| isso| esse ponto)?|mais detalhes|mais detalhado|com mais detalhes|fala mais|me fala mais|conta mais|me conta mais|quero saber mais|saber mais|pode continuar|continua|continue|prossiga|o que mais)\b/, 0.8]
    ]],
    ['resumo', [
      [/\b(?:resum\w*|em poucas palavras|de forma (?:curta|breve|resumida|simples|objetiva)|bem (?:rapido|resumido|curto)|so o (?:principal|basico|essencial)|direto ao ponto|sem enrolar|tldr|versao curta)\b/, 0.9]
    ]],
    ['exemplo', [
      [/\b(?:(?:me )?(?:da|de|mostra|mostre|tem|passa) (?:um )?exemplo|exemplifica\w*|na pratica|caso pratico|por exemplo)\b/, 0.85]
    ]],
    ['repetir', [
      [/\b(?:repete|repita|repetir|fala de novo|diz de novo|o que voce (?:disse|falou)|nao vi|nao li|perdi a resposta|manda de novo|envia de novo|mostra de novo)\b/, 0.85]
    ]],
    ['confirmacao', [
      [/^(?:sim|isso|isso mesmo|isso ai|exato|exatamente|correto|certo|certissimo|claro|com certeza|pode ser|pode|pode sim|ok|beleza|uhum|aham|ahan|yes|positivo|afirmativo|perfeito|perfeitamente|combinado|fechado|fechou|vamos|quero|quero sim|por favor|manda|manda ver|pode mandar|pode falar|claro que sim|sim por favor|sem duvida|justamente|verdade|e isso|acertou|tambem|quero ver|mostra|pode mostrar|sim quero|sim sim|s|ss)$/, 0.9],
      [/^(?:sim|isso|exato|claro|ok|pode|beleza|perfeito|certo)\b/, 0.55]
    ]],
    ['negacao', [
      [/^(?:nao|nope|negativo|nada|nenhum|nenhuma|nao precisa|nao obrigad[oa]|nao quero|agora nao|deixa|deixa para la|esquece|esqueca|dispenso|nao precisa nao|nem|nunca|de jeito nenhum|melhor nao|acho que nao|ainda nao|por enquanto nao|so isso|era so isso|nao nao|nao valeu)$/, 0.9],
      [/^nao\b/, 0.45]
    ]],
    ['insatisfacao', [
      [/\b(?:nao (?:e|eh|era|foi) (?:isso|isto|essa|esse|bem isso|o que (?:eu )?(?:perguntei|pedi|quis dizer|queria))|nao foi (?:isso )?o que (?:eu )?(?:perguntei|pedi)|voce nao (?:entendeu|compreendeu|me entendeu|esta entendendo|entende|respondeu|leu)|(?:esta|resposta|isso|isso esta) (?:errad[oa]|incorret[oa]|equivocad[oa])|errou|resposta errada|nao respondeu|nao responde|fugiu (?:da|do) (?:pergunta|assunto)|nada a ver|nada haver|de novo (?:isso|a mesma|o mesmo|essa)|(?:mesma|mesmo) (?:coisa|resposta|texto)|ja (?:disse|falou|respondeu) isso|repetindo|repetiu|sempre (?:a mesma|responde)|respost\w* (?:padrao|pronta|generica|robotica)|robotic\w*|parece (?:um )?robo|nao ajudou|nao me ajudou|nao serviu|inutil|nao funciona|entendeu (?:tudo )?errado)\b/, 0.9]
    ]],
    ['frustracao', [
      [/\b(?:aff|afe|affs|pqp|puta|merda|droga|porra|caramba|que saco|saco|argh|putz|pelo amor de deus|plmds|desisto|ridicul\w*|pessim\w*|horrivel|lixo|burra|burro|idiota|estupid\w*|incompetente|nao aguento|cansei|irritante)\b/, 0.8]
    ]],
    ['piada', [[/\b(?:piadas?|me fa(?:z|ca) rir|algo engracado)\b/, 0.9]]],
    ['horario', [[/\b(?:que horas? (?:sao|e agora)|hora certa)\b|^que horas$/, 0.9]]],
    ['data', [[/\b(?:que dia (?:e|eh) hoje|qual (?:a )?data (?:de )?hoje|data de hoje|hoje (?:e|eh) que dia|em que dia estamos|que dia da semana e hoje)\b/, 0.9]]],
    ['clima', [[/\b(?:como (?:esta|ta) o (?:tempo|clima)|vai chover|previsao do tempo)\b/, 0.9]]],
    ['sobre_ia', [[/\b(?:voce (?:tem|sente) (?:sentimentos?|emocoes?)|voce (?:e|esta|fica) (?:feliz|triste)|voce dorme|voce come|voce (?:se )?cansa|voce sonha|quantos anos voce tem|sua idade|onde voce mora|de onde voce e|voce gosta de|voce tem (?:namorad[oa]|familia|amigos))\b/, 0.9]]],
    ['flerte', [[/\b(?:te amo|eu te amo|amo voce|casa comigo|quer namorar|voce e linda|gata|gostosa|namora comigo)\b/, 0.9]]],
    ['teste', [[/^(?:teste|testando|test|alo|tem alguem ai|esta ai|voce esta ai|esta me ouvindo|esta funcionando|funciona|oi oi|alo alo)$/, 0.9]]]
  ];

  // Intenções puramente sociais (não pedem consulta à base).
  const SOCIAIS = new Set(palavras(`
    saudacao como_vai estado_positivo estado_negativo agradecimento elogio despedida identidade capacidades
    ajuda confirmacao negacao piada horario data clima sobre_ia flerte teste frustracao insatisfacao
  `));

  const FOCOS = [
    ['prazo', [
      [/\b(?:quanto tempo|de quanto em quanto tempo|cada quanto tempo|com que frequencia|qual (?:o |a )?(?:prazo|validade|periodicidade|frequencia|vencimento|duracao)|dura quanto|quantos (?:dias|meses|anos))\b/, 0.95],
      [/\b(?:validade|vence|vencimento|expira|prazo|periodicidade|reciclagem|renova\w*|quando)\b/, 0.8]
    ]],
    ['definicao', [
      [/\b(?:o que (?:e|eh|significa|quer dizer|seria|sao|vem a ser)|que (?:e|eh) (?:um|uma|o|a)|qual (?:o )?(?:significado|conceito|definicao)|significado d[aeo]|conceito d[aeo]|defin[ae]\w*|do que se trata|para que serve[m]?|qual (?:a|e a) (?:finalidade|funcao|objetivo)|qual o objetivo|sigla)\b/, 0.9]
    ]],
    ['procedimento', [
      [/\b(?:como (?:eu |que |se |a gente )?(?:devo |posso |faco|faz|fazer|deve|funciona|elaborar|preencher|emitir|montar|realizar|executar|aplicar|usar|utilizar|calcular|proceder|agir|abrir|solicitar|pedir|registrar|comunicar|treinar|inspecionar|verificar|bloquear|instalar|escolher|identificar|evitar|prevenir|e feit[oa]|sao feit[oa]s)|passo a passo|qual (?:e )?o (?:procedimento|processo|metodo|caminho|jeito)|quais (?:sao )?(?:os )?(?:passos|etapas)|de que (?:forma|maneira|jeito)|me ensin\w*|tutorial)\b/, 0.9],
      [/^como\b/, 0.6]
    ]],
    ['requisito', [
      [/\b(?:(?:e|eh) obrigatori[oa]|obrigatori\w*|precis[ao] (?:de|ter|fazer|usar|tirar)|(?:e|eh) necessari[oa]|exig\w*|requisit\w*|tem que|tenho que|temos que|(?:e|eh) permitido|(?:e|eh) proibido|pode(?:mos|m)? (?:trabalhar|usar|fazer|subir|entrar|operar)|posso (?:trabalhar|usar|fazer|subir|entrar|operar)|o que (?:a norma|a nr|a lei) (?:diz|exige|fala))\b/, 0.85]
    ]],
    ['responsavel', [
      [/\b(?:quem (?:deve|pode|precisa|faz|assina|emite|aprova|autoriza|libera|elabora|preenche|fica|tem que|responde|e o responsavel|e responsavel)|de quem (?:e|eh) a responsabilidade|responsab\w*)\b|^quem\b(?! (?:e|eh|es|sao) (?:voce|voces|tu|a aurora)\b)(?! (?:te )?(?:criou|fez|desenvolveu|programou))/, 0.85]
    ]],
    ['motivo', [[/^(?:mas )?(?:por que|porque)\b|\bpor que\b|\bqual (?:o )?motivo\b|\bqual (?:a )?razao\b|\bimportancia\b/, 0.85]]],
    ['local', [[/\b(?:onde|aonde|em que (?:lugar|local|setor)|qual (?:o )?(?:local|lugar|setor))\b/, 0.85]]],
    ['quantidade', [
      [/\b(?:qual (?:a )?(?:quantidade|carga horaria|altura|distancia|tensao|valor|limite|numero|capacidade|pressao)|qual o (?:minimo|maximo)|no minimo|no maximo|carga horaria|quantas horas)\b/, 0.9],
      [/\bquant[oa]s?\b/, 0.6]
    ]],
    ['lista', [[/\b(?:quais (?:sao|os|as)|liste|listar|lista (?:de|dos|das)|tipos de|classes de|categorias de|principais)\b/, 0.75]]],
    ['comparacao', [[/\b(?:diferenca|diferencas|diferem|comparar|compare|comparacao|versus|vs|(?:e|eh) a mesma coisa|mesma coisa que|(?:e|eh) igual)\b/, 0.9]]],
    ['opiniao', [[/\b(?:o que (?:voce )?acha|sua opiniao|voce acha|recomenda\w*|sugere|sugestao|vale a pena|qual o melhor|qual a melhor)\b/, 0.8]]]
  ];

  // Palavras sociais/de conversa que não contam como "conteúdo" de uma dúvida.
  const CONVERSA = new Set(palavras(`
    obrigado obrigada obrigados valeu tchau legal otimo otima perfeito perfeita show top beleza gostei adorei
    amei excelente tudo falou ate logo entendi certo blz robo humana humano inteligente incrivel maravilha
    gratidao agradeco grato grata abraco abracos beijos mandou arrasou resposta explicacao ajudou demais
    bola descanso semana fim tenha piada piadas testando nome chama criou tranquilo
    tranquila joia suave firmeza paz cima ajuda duvida pergunta questao exato exatamente correto claro
    isso mesmo continua continue detalhes detalhado resumo resumido resuma resume exemplo errado errada
    errou repetindo repetiu mesma entendeu compreendi captei peguei confuso claro simples jeito
    novo repete repita repetir aff pqp saco putz caramba droga lixo burra burro cansado cansada mal
    triste estressado preocupado dificil pesado corrido puxado funciona funcionando alo
    lindo linda gata amo namorar feliz sentimentos mora gosta chover clima previsao
    responda responde curto curta direto direta objetivo objetiva breve longo longa detalhada completa
    emoji emojis formal informal linguagem
    quero sim nao pode ser bom boa dia tarde noite madrugada oi ola aurora voce seu sua
  `));

  function avaliarPadroes(lista, texto) {
    let melhor = 0;
    for (const [re, peso] of lista) if (peso > melhor && re.test(texto)) melhor = peso;
    return melhor;
  }

  function detectarIntencoes(expandido, sinais, bruto) {
    const resultado = [];
    for (const [nome, padroes] of INTENCOES) {
      let score = avaliarPadroes(padroes, expandido);
      if (bruto && bruto !== expandido) score = Math.max(score, avaliarPadroes(padroes, bruto));
      if (!score) continue;
      if (nome === 'como_vai' && !sinais.pergunta && !/^(?:oi|ola|opa|e ai|bom dia|boa tarde|boa noite)\b/.test(expandido)) score *= 0.7;
      resultado.push({ nome, score });
    }
    if (sinais.risos && expandido.split(' ').length <= 4) resultado.push({ nome: 'riso', score: 0.7 });
    return resultado.sort((a, b) => b.score - a.score);
  }

  function detectarFoco(expandido) {
    let melhor = null;
    for (const [tipo, padroes] of FOCOS) {
      const score = avaliarPadroes(padroes, expandido);
      if (score && (!melhor || score > melhor.score)) melhor = { tipo, score };
    }
    return melhor;
  }

  const RE_PERGUNTA = /^(?:que|qual|quais|quem|quando|onde|como|por que|porque|quanto|quantos|quantas|sera que|pode|posso|devo|tem|existe|existem|precisa|preciso|e obrigatorio|e necessario|e permitido|e proibido)\b|\b(?:gostaria de saber|queria saber|quero saber|me diz|me fala|me explica|sabe me dizer|sabe informar|tenho uma duvida|duvida sobre)\b/;

  // ===========================================================================
  // 7. Registro de linguagem, sentimento e urgência
  // ===========================================================================

  const MARCAS_FORMAIS = [
    [/\b(?:senhor|senhora|sr|sra|prezad[oa]s?|estimad[oa])\b/, 0.35],
    [/\b(?:gostaria|poderia|poderiam|seria possivel|teria como|solicito|solicitar|solicitacao)\b/, 0.3],
    [/\b(?:por gentileza|gentileza|por obsequio|cordialmente|atenciosamente|encarecidamente|desde ja|venho por meio)\b/, 0.4],
    [/\b(?:agradeco|grato|grata|agradecemos)\b/, 0.25],
    [/\b(?:referente|mediante|conforme|tendo em vista|no que tange|acerca|outrossim|ademais)\b/, 0.25],
    [/\b(?:bom dia|boa tarde|boa noite)\b/, 0.1],
    [/\bpor favor\b/, 0.1]
  ];

  const MARCAS_INFORMAIS = [
    [/\b(?:mano|mana|cara|vei|brother|bro|parca|mina|galera|amigao|chefia)\b/, 0.35],
    [/\b(?:tipo assim|ta ligado|sei la|pode crer|tamo junto|de boa|suave|firmeza|valeu|falou|bora|partiu|massa|dahora|daora|show de bola|putz|poxa|po|caraca|nossa|eita|vixe|oxe|uai|bah|tri|aff|afe)\b/, 0.25],
    [/^(?:e ai|fala|opa|salve)\b/, 0.2]
  ];

  const RE_POSITIVAS = /\b(?:obrigad\w*|valeu|otim[oa]|excelente|perfeit[oa]|legal|bacana|gostei|adorei|amei|maravilh\w*|incrivel|show|top|massa|feliz|alegre|ajudou|sensacional|parabens|genial|tranquil[oa])\b/g;
  const RE_NEGATIVAS = /\b(?:ruim|pessim\w*|horrivel|chat[oa]|problema|errad[oa]|erro|triste|cansad[oa]|preocupad[oa]|medo|raiva|odio|irritad[oa]|inutil|lixo|burr[oa]|droga|merda|aff|pqp|saco|estressad[oa]|desanimad[oa])\b/g;

  function somarMarcas(lista, texto) {
    return lista.reduce((soma, [re, peso]) => soma + (re.test(texto) ? peso : 0), 0);
  }

  function avaliarRegistro(analise, entidades) {
    const t = analise.expandido;
    const s = analise.sinais;
    let formalidade = somarMarcas(MARCAS_FORMAIS, t) - somarMarcas(MARCAS_INFORMAIS, t);
    formalidade -= Math.min(0.6, analise.girias * 0.2);
    if (s.emojis) formalidade -= 0.15;
    if (s.risos) formalidade -= 0.2;
    if (s.maiusculaInicial && s.pontuacaoFinal && s.tamanho > 25) formalidade += 0.15;
    if (!s.maiusculaInicial && s.tamanho > 15) formalidade -= 0.1;
    formalidade = Math.max(-1, Math.min(1, formalidade));

    const tecnicos = analise.tokens.filter((tk) => TECNICOS.has(tk.base)).length;
    const unidades = analise.tokens.filter((tk) => tk.tipo === 'unidade').length;
    const nrs = entidades.filter((e) => e.tipo === 'nr' && e.explicita).length;
    const termos = entidades.filter((e) => e.tipo === 'termo').length;
    const tecnicidade = Math.min(1, nrs * 0.3 + termos * 0.15 + tecnicos * 0.12 + unidades * 0.1);

    let registro = 'neutro';
    if (tecnicidade >= 0.5 && formalidade > -0.25) registro = 'tecnico';
    else if (formalidade >= 0.3) registro = 'formal';
    else if (formalidade <= -0.2) registro = 'informal';
    return { registro, formalidade, tecnicidade };
  }

  function avaliarSentimento(analise, intencoes) {
    const t = analise.expandido;
    const s = analise.sinais;
    const tem = (nome) => intencoes.some((i) => i.nome === nome);
    let valor = 0;
    valor += (t.match(RE_POSITIVAS) || []).length * 0.3;
    valor -= (t.match(RE_NEGATIVAS) || []).length * 0.3;
    valor += s.emojisPositivos * 0.25 - s.emojisNegativos * 0.3;
    if (s.risos) valor += 0.2;
    if (tem('insatisfacao')) valor -= 0.5;
    if (tem('frustracao')) valor -= 0.5;
    if (tem('estado_negativo')) valor -= 0.4;
    if (s.gritando && valor < 0) valor -= 0.3;
    valor = Math.max(-1, Math.min(1, valor));
    let frustracao = 0;
    if (tem('frustracao')) frustracao += 0.6;
    if (tem('insatisfacao')) frustracao += 0.4;
    if (s.gritando) frustracao += 0.3;
    if (s.exclamacoes >= 3) frustracao += 0.2;
    return {
      valor,
      rotulo: valor > 0.25 ? 'positivo' : valor < -0.25 ? 'negativo' : 'neutro',
      frustracao: Math.min(1, frustracao)
    };
  }

  const RE_EMERGENCIA_FORTE = /\b(?:(?:alguem|colega|trabalhador|funcionario|operador|pessoa|companheiro|ele|ela|o rapaz|a moca|meu colega|minha colega) (?:caiu|se machucou|machucou|se feriu|feriu|desmaiou|nao respira|parou de respirar|esta sangrando|sangrando|levou (?:um )?choque|tomou (?:um )?choque|se queimou|esta preso|ficou preso|esta inconsciente|inconsciente|esta passando mal|passando mal|convulsionando|se acidentou|foi atingido|foi prensado|prensou)|(?:tomei|levei) (?:um )?choque|(?:pegando|pegou) fogo|(?:tem|ha|esta tendo|comecou) (?:um )?(?:incendio|fogo|vazamento|explosao)|incendio agora|vazamento de (?:gas|amonia|produto quimico)|cheiro (?:forte )?de gas|explodiu|desabou|desabamento|soterrad\w*|parada cardiaca|nao esta respirando|acidente (?:agora|grave|aqui)|acabou de (?:cair|acontecer um acidente|se machucar))\b/;
  const RE_EMERGENCIA_MEDIA = /\b(?:socorro|urgente|urgencia|emergencia|ajuda rapido|rapido por favor)\b/;
  const RE_EMERGENCIA_INFO = /\b(?:plano|planos|brigada|saida|saidas|iluminacao|chuveiro|lava olhos|parada|botao|numero|numeros|telefone|telefones|procedimento|procedimentos|rota|kit|treinamento|simulado|equipe|situacao|situacoes|caso|casos) (?:de )?emergencia|\bemergencia (?:medica )?(?:plano|procedimento)|\bo que fazer (?:em caso|se|quando)\b|\bcomo (?:agir|proceder)\b/;

  function avaliarUrgencia(analise) {
    const t = analise.expandido;
    if (RE_EMERGENCIA_FORTE.test(t)) return 1;
    if (RE_EMERGENCIA_INFO.test(t)) return 0.2;
    let u = RE_EMERGENCIA_MEDIA.test(t) ? 0.7 : 0;
    if (u && (analise.sinais.exclamacoes >= 1 || analise.sinais.gritando)) u = 0.85;
    return u;
  }

  function tipoEmergencia(t) {
    if (/\bchoque\b/.test(t)) return 'choque';
    if (/\b(?:fogo|incendio|explos\w*|explodiu)\b/.test(t)) return 'incendio';
    if (/\b(?:gas|vazamento|amonia|quimico)\b/.test(t)) return 'vazamento';
    if (/\b(?:caiu|queda|cair)\b/.test(t)) return 'queda';
    if (/\b(?:sangr\w*|hemorragia|corte)\b/.test(t)) return 'sangramento';
    if (/\b(?:desmai\w*|respira\w*|inconsciente|parada cardiaca|convuls\w*)\b/.test(t)) return 'respiracao';
    if (/\b(?:confinad\w*|tanque|silo|preso)\b/.test(t)) return 'confinado';
    return 'geral';
  }

  // ===========================================================================
  // 8. Conteúdo, radicais e base de conhecimento (BM25F + sinônimos + prefixos)
  // ===========================================================================

  function extrairConteudo(tokens) {
    const conteudo = [];
    for (const tk of tokens) {
      if (tk.tipo === 'unidade') continue;
      if (tk.tipo === 'nr' || tk.tipo === 'numero') {
        if (tk.base.length >= 2) conteudo.push({ base: tk.base, radical: tk.base, exib: tk.exib });
        continue;
      }
      if (STOPWORDS.has(tk.base) || tk.base.length < 2) continue;
      conteudo.push({ base: tk.base, radical: radical(tk.base), exib: tk.exib });
    }
    return conteudo;
  }

  // Nomes de campos aceitos — a base do OPS 360° pode usar qualquer um deles.
  const CAMPOS = {
    perguntas: ['perguntas', 'pergunta', 'patterns', 'padroes', 'questions', 'question', 'exemplos', 'examples', 'triggers', 'gatilhos', 'frases', 'q', 'input', 'inputs', 'intencoes'],
    palavras: ['palavrasChave', 'palavras_chave', 'palavraschave', 'keywords', 'palavras', 'tags', 'termos', 'chaves', 'keys', 'key'],
    titulo: ['titulo', 'title', 'nome', 'name', 'topico', 'topic', 'assunto', 'tema', 'tag'],
    categoria: ['categoria', 'category', 'grupo', 'group', 'secao', 'section'],
    resposta: ['resposta', 'respostas', 'answer', 'answers', 'response', 'responses', 'texto', 'text', 'conteudo', 'content', 'a', 'output', 'reply', 'mensagem'],
    detalhes: ['detalhes', 'details', 'detalhe', 'explicacao', 'extended', 'maisInfo'],
    exemplo: ['exemplo', 'example', 'exemploPratico', 'exemplo_pratico'],
    resumo: ['resumo', 'summary', 'curta', 'short'],
    relacionados: ['relacionados', 'related', 'vejaTambem', 'veja_tambem', 'verTambem']
  };

  function lerCampo(obj, nomes) {
    for (const n of nomes) if (obj[n] != null && obj[n] !== '') return obj[n];
    const chaves = Object.keys(obj);
    for (const n of nomes) {
      const k = chaves.find((c) => c.toLowerCase() === n.toLowerCase());
      if (k && obj[k] != null && obj[k] !== '') return obj[k];
    }
    return null;
  }

  function comoLista(v, separar) {
    if (v == null) return [];
    if (Array.isArray(v)) return v.flat(Infinity).filter((x) => x != null && x !== '').map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x)));
    if (typeof v === 'string') return separar ? v.split(separar).map((x) => x.trim()).filter(Boolean) : [v];
    return [String(v)];
  }

  function textoPuro(s) {
    return String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[*_#`>]/g, ' ');
  }

  function normalizarEntrada(bruta, idPadrao) {
    if (typeof bruta === 'string') bruta = { resposta: bruta };
    if (!bruta || typeof bruta !== 'object') return null;
    const respostaBruta = lerCampo(bruta, CAMPOS.resposta);
    const respostas = typeof respostaBruta === 'function' ? [respostaBruta] : comoLista(respostaBruta);
    if (!respostas.length) return null;
    const titulo = lerCampo(bruta, CAMPOS.titulo);
    const id = String(bruta.id != null ? bruta.id : idPadrao);
    return {
      id,
      titulo: titulo != null ? String(titulo) : null,
      categoria: lerCampo(bruta, CAMPOS.categoria),
      perguntas: comoLista(lerCampo(bruta, CAMPOS.perguntas), /\n|\|/),
      palavras: comoLista(lerCampo(bruta, CAMPOS.palavras), /[,;|\n]/),
      respostas,
      detalhes: lerCampo(bruta, CAMPOS.detalhes),
      exemplo: lerCampo(bruta, CAMPOS.exemplo),
      resumo: lerCampo(bruta, CAMPOS.resumo),
      relacionados: comoLista(lerCampo(bruta, CAMPOS.relacionados), /[,;|]/),
      original: bruta
    };
  }

  function lerFonte(fonte) {
    if (!fonte) return [];
    if (typeof Map !== 'undefined' && fonte instanceof Map) fonte = Object.fromEntries(fonte);
    if (Array.isArray(fonte)) return fonte.map((e, i) => normalizarEntrada(e, 'item' + i)).filter(Boolean);
    if (typeof fonte === 'object') {
      for (const chave of ['intents', 'intencoes', 'entradas', 'itens', 'items', 'base', 'dados', 'data', 'faq', 'perguntas']) {
        if (Array.isArray(fonte[chave])) return lerFonte(fonte[chave]);
      }
      return Object.keys(fonte).map((k) => {
        const v = fonte[k];
        const e = normalizarEntrada(v, k);
        if (e && !e.titulo && !/^item\d+$/.test(k)) e.titulo = k.replace(/[_-]+/g, ' ');
        if (e && !e.palavras.length && !e.perguntas.length) e.palavras = [k.replace(/[_-]+/g, ' ')];
        return e;
      }).filter(Boolean);
    }
    return [];
  }

  const PESOS_CAMPO = { perguntas: 1.0, palavras: 1.4, titulo: 1.2, categoria: 0.6, resposta: 0.35, resumo: 0.3, detalhes: 0.2, exemplo: 0.2 };

  class BaseConhecimento {
    constructor(lexico, opcoes) {
      this.lexico = lexico;
      this.opcoes = opcoes || {};
      this.limpar();
    }

    limpar() {
      this.docs = [];
      this.porId = new Map();
      this.postings = new Map();
      this.entPostings = new Map();
      this.vocab = [];
      this.N = 0;
      this.mediaTam = 1;
    }

    get tamanho() {
      return this.docs.length;
    }

    carregar(fonte, acrescentar) {
      if (!acrescentar) this.limpar();
      const entradas = lerFonte(fonte);
      entradas.forEach((e) => {
        [e.titulo, e.categoria, ...e.perguntas, ...e.palavras].filter(Boolean).forEach((txt) => adicionarPalavra(this.lexico, textoPuro(txt), 3));
        e.respostas.filter((r) => typeof r === 'string').forEach((txt) => adicionarPalavra(this.lexico, textoPuro(txt), 1));
      });
      entradas.forEach((e) => this._indexar(e));
      this._finalizar();
      return entradas.length;
    }

    _analisar(texto) {
      const a = analisarTexto(textoPuro(texto), this.lexico, this.opcoes);
      return { conteudo: extrairConteudo(a.tokens), entidades: detectarEntidades(a.expandido), expandido: a.expandido };
    }

    _indexar(e) {
      if (this.porId.has(e.id)) e.id = e.id + '_' + this.docs.length;
      const doc = { entrada: e, tf: new Map(), campo: new Map(), tam: 0, entidades: new Set(), entPrincipais: new Set(), padroes: [], focos: new Set(), idx: this.docs.length };
      const somar = (campo, texto, principal) => {
        if (texto == null || typeof texto === 'function') return null;
        const a = this._analisar(texto);
        const peso = PESOS_CAMPO[campo];
        a.conteudo.forEach((c) => {
          doc.tf.set(c.radical, (doc.tf.get(c.radical) || 0) + peso);
          doc.campo.set(c.radical, Math.max(doc.campo.get(c.radical) || 0, peso));
          doc.tam += peso;
        });
        a.entidades.forEach((ent) => {
          if (ent.implicita && !principal) return;
          doc.entidades.add(ent.id);
          if (principal && !ent.implicita) doc.entPrincipais.add(ent.id);
        });
        return a;
      };
      const padroesTexto = [...e.perguntas, e.titulo, e.palavras.join(' ')].filter(Boolean);
      e.perguntas.forEach((p) => somar('perguntas', p, true));
      e.palavras.forEach((p) => somar('palavras', p, true));
      if (e.titulo) somar('titulo', e.titulo, true);
      if (e.categoria) somar('categoria', String(e.categoria), false);
      e.respostas.forEach((r) => somar('resposta', r, false));
      if (e.resumo) somar('resumo', String(e.resumo), false);
      if (e.detalhes) somar('detalhes', String(e.detalhes), false);
      if (e.exemplo) somar('exemplo', String(e.exemplo), false);
      padroesTexto.forEach((p) => {
        const a = this._analisar(p);
        const set = new Set(a.conteudo.map((c) => c.radical));
        if (set.size) doc.padroes.push(set);
        const foco = detectarFoco(a.expandido);
        if (foco) doc.focos.add(foco.tipo);
      });
      const chaves = semAcentos(e.palavras.join(' ').toLowerCase());
      if (/\b(?:validade|prazo|periodicidade|reciclagem|vencimento)\b/.test(chaves)) doc.focos.add('prazo');
      if (/\b(?:responsavel|responsabilidade|quem)\b/.test(chaves)) doc.focos.add('responsavel');
      if (/\b(?:carga horaria|horas|quantidade)\b/.test(chaves)) doc.focos.add('quantidade');
      if (/\b(?:passo|procedimento|como fazer|etapas)\b/.test(chaves)) doc.focos.add('procedimento');
      if (!doc.entPrincipais.size) doc.entidades.forEach((id) => doc.entPrincipais.add(id));
      this.docs.push(doc);
      this.porId.set(e.id, doc);
    }

    _finalizar() {
      this.postings = new Map();
      this.entPostings = new Map();
      let total = 0;
      this.docs.forEach((doc, idx) => {
        doc.idx = idx;
        total += doc.tam;
        doc.tf.forEach((tf, t) => {
          if (!this.postings.has(t)) this.postings.set(t, []);
          this.postings.get(t).push([idx, tf]);
        });
        doc.entidades.forEach((id) => {
          if (!this.entPostings.has(id)) this.entPostings.set(id, []);
          this.entPostings.get(id).push(idx);
        });
      });
      this.N = this.docs.length;
      this.mediaTam = this.N ? total / this.N : 1;
      this.vocab = [...this.postings.keys()];
    }

    idf(t) {
      const df = (this.postings.get(t) || []).length;
      if (!df) return Math.log(1 + this.N) * 0.6 + 0.2;
      return Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
    }

    // consulta: { radicais: [{radical, peso}], entidades, foco, aprendido, rejeitados }
    buscar(consulta, limite) {
      if (!this.N) return [];
      const k1 = 1.2;
      const b = 0.5;
      const termos = new Map();
      const add = (t, peso, origem, fator) => {
        const atual = termos.get(t);
        if (!atual || atual.peso < peso) termos.set(t, { peso, origem, fator });
      };
      consulta.radicais.forEach(({ radical: r, peso }) => {
        add(r, peso, r, 1);
        (SINONIMOS_RADICAIS.get(r) || []).forEach((s) => add(s, peso * 0.5, r, 0.5));
        if (r.length >= 4 && !/\d/.test(r)) {
          this.vocab.forEach((v) => {
            if (v !== r && v.length >= 4 && (v.startsWith(r) || (r.startsWith(v) && v.length >= 5))) add(v, peso * 0.6, r, 0.6);
          });
        }
      });

      const docs = new Map();
      const pegar = (idx) => {
        let d = docs.get(idx);
        if (!d) docs.set(idx, (d = { idx, score: 0, cobertos: new Map() }));
        return d;
      };
      termos.forEach(({ peso, origem, fator }, t) => {
        const post = this.postings.get(t);
        if (!post) return;
        const idf = this.idf(t);
        post.forEach(([idx, tf]) => {
          const doc = this.docs[idx];
          const norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * doc.tam) / this.mediaTam));
          const d = pegar(idx);
          d.score += peso * idf * norm;
          // Termo presente só no corpo da resposta conta menos para a confiança.
          const noTopo = (doc.campo.get(t) || 0) >= 0.6;
          d.cobertos.set(origem, Math.max(d.cobertos.get(origem) || 0, fator * (noTopo ? 1 : 0.55)));
        });
      });

      // O que já foi aprendido com este usuário entra na disputa mesmo sem palavras em comum.
      if (consulta.aprendido && this.porId.has(consulta.aprendido)) pegar(this.porId.get(consulta.aprendido).idx);
      const entQ = consulta.entidades.filter((e) => !e.implicita);
      consulta.entidades.forEach((e) => {
        const bonus = e.implicita ? 0.8 : e.tipo === 'nr' ? 2.2 : 1.8;
        (this.entPostings.get(e.id) || []).forEach((idx) => {
          const d = pegar(idx);
          d.score += bonus * (this.docs[idx].entPrincipais.has(e.id) ? 1.3 : 0.6);
        });
      });

      const nrsConsulta = entQ.filter((e) => e.tipo === 'nr').map((e) => e.id);
      const qset = new Set(consulta.radicais.map((r) => r.radical));
      const resultados = [];
      docs.forEach((d) => {
        const doc = this.docs[d.idx];
        if (nrsConsulta.length) {
          const nrsDoc = [...doc.entPrincipais].filter((id) => id.startsWith('NR-'));
          if (nrsDoc.length && !nrsDoc.some((id) => nrsConsulta.includes(id))) d.score -= 2.5;
        }
        let dice = 0;
        doc.padroes.forEach((p) => {
          let inter = 0;
          qset.forEach((r) => { if (p.has(r)) inter++; });
          if (inter) dice = Math.max(dice, (2 * inter) / (qset.size + p.size));
        });
        d.score += 2.4 * dice;
        const focoOk = consulta.foco && doc.focos.has(consulta.foco.tipo);
        if (focoOk) d.score += 1.4 * consulta.foco.score;

        let totalIdf = 0;
        let cobertoIdf = 0;
        consulta.radicais.forEach(({ radical: r, peso }) => {
          const w = this.idf(r) * peso;
          totalIdf += w;
          cobertoIdf += w * Math.min(1, d.cobertos.get(r) || 0);
        });
        const cobertura = totalIdf ? cobertoIdf / totalIdf : 0;
        let conf;
        if (entQ.length) {
          const em = entQ.filter((e) => doc.entidades.has(e.id)).length / entQ.length;
          conf = totalIdf ? 0.5 * cobertura + 0.3 * dice + 0.2 * em : 0.35 + 0.45 * em;
          if (em === 0) conf *= 0.6;
        } else {
          conf = 0.65 * cobertura + 0.35 * dice;
        }
        if (focoOk) conf += 0.07;
        // Tema implícito ("painel elétrico" → NR-10) ou herdado do contexto que bate com a entrada.
        const implicitas = consulta.entidades.filter((e) => e.implicita);
        if (implicitas.some((e) => !e.herdada && doc.entidades.has(e.id))) conf += 0.1;
        else if (implicitas.some((e) => e.herdada && doc.entidades.has(e.id))) conf += 0.06;
        const id = doc.entrada.id;
        if (consulta.aprendido === id) {
          d.score += 4;
          conf = Math.max(conf, 0.9);
        }
        if (consulta.rejeitados && consulta.rejeitados.includes(id)) {
          d.score -= 4;
          conf *= 0.3;
        }
        resultados.push({ entrada: doc.entrada, score: d.score, confianca: Math.max(0, Math.min(1, conf)), cobertura, dice });
      });
      // Ordena combinando relevância (BM25F) e confiança (cobertura, semelhança com as perguntas, foco).
      const maior = resultados.reduce((m, r) => Math.max(m, r.score), 0) || 1;
      resultados.forEach((r) => { r.ordem = 0.55 * (Math.max(0, r.score) / maior) + 0.45 * r.confianca; });
      resultados.sort((a, b2) => b2.ordem - a.ordem);
      return resultados.slice(0, limite || 5);
    }

    relacionados(id, limite) {
      const doc = this.porId.get(id);
      if (!doc) return [];
      const explicitos = doc.entrada.relacionados.map((r) => this.porId.get(r) || this.docs.find((d) => d.entrada.titulo === r)).filter(Boolean);
      const porEntidade = this.docs
        .filter((d) => d !== doc && !explicitos.includes(d))
        .map((d) => ({ d, n: [...d.entPrincipais].filter((x) => doc.entPrincipais.has(x)).length }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .map((x) => x.d);
      return [...explicitos, ...porEntidade].slice(0, limite || 3).map((d) => d.entrada);
    }

    temas(limite) {
      const contagem = new Map();
      this.docs.forEach((d) => {
        const rotulo = d.entrada.categoria || d.entrada.titulo;
        if (rotulo) contagem.set(String(rotulo), (contagem.get(String(rotulo)) || 0) + 1);
      });
      return [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite || 6).map((x) => x[0]);
    }
  }

  // ===========================================================================
  // 9. Memória: perfil do usuário e aprendizado (persistidos no navegador)
  // ===========================================================================

  function criarArmazenamento(opcao) {
    if (opcao === false || opcao === null) return null;
    if (opcao && typeof opcao.getItem === 'function') return opcao;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__aurora__', '1');
        localStorage.removeItem('__aurora__');
        return localStorage;
      }
    } catch (e) { /* navegação privada ou bloqueio */ }
    return null;
  }

  function perfilPadrao() {
    return {
      versao: 1, nome: null, papel: null, formalidade: 0, tecnicidade: 0, verbosidade: 'normal',
      emoji: null, tom: null, simples: false, temas: {}, visitas: 0, ultimaVisita: null,
      mensagens: 0, aprendidos: {}, rejeitados: {}
    };
  }

  class Memoria {
    constructor(armazenamento, chave) {
      this.arm = armazenamento;
      this.chave = chave;
      this.perfil = perfilPadrao();
      try {
        const bruto = this.arm && this.arm.getItem(this.chave);
        if (bruto) this.perfil = Object.assign(perfilPadrao(), JSON.parse(bruto));
      } catch (e) { /* dados corrompidos: recomeça */ }
    }

    salvar() {
      if (!this.arm) return;
      try { this.arm.setItem(this.chave, JSON.stringify(this.perfil)); } catch (e) { /* cota cheia */ }
    }

    esquecer() {
      this.perfil = perfilPadrao();
      try { if (this.arm) this.arm.removeItem(this.chave); } catch (e) { /* ignora */ }
    }

    aprender(assinatura, registro) {
      if (!assinatura || !registro) return;
      const atual = this.perfil.aprendidos[assinatura];
      const mesmo = atual && atual.id === registro.id && atual.consulta === registro.consulta;
      this.perfil.aprendidos[assinatura] = Object.assign({}, registro, { n: mesmo ? atual.n + 1 : 1, t: Date.now() });
      const rej = this.perfil.rejeitados[assinatura];
      if (rej && registro.id) this.perfil.rejeitados[assinatura] = rej.filter((x) => x !== registro.id);
      this._podar();
    }

    rejeitar(assinatura, id) {
      if (!assinatura || !id) return;
      const lista = this.perfil.rejeitados[assinatura] || [];
      if (!lista.includes(id)) lista.push(id);
      this.perfil.rejeitados[assinatura] = lista.slice(-5);
      const ap = this.perfil.aprendidos[assinatura];
      if (ap && ap.id === id) delete this.perfil.aprendidos[assinatura];
      this._podar();
    }

    aprendido(assinatura) {
      return this.perfil.aprendidos[assinatura] || null;
    }

    rejeitados(assinatura) {
      return this.perfil.rejeitados[assinatura] || [];
    }

    _podar() {
      const LIMITE = 400;
      const ap = Object.entries(this.perfil.aprendidos);
      if (ap.length > LIMITE) {
        ap.sort((a, b) => a[1].t - b[1].t).slice(0, ap.length - LIMITE).forEach(([k]) => delete this.perfil.aprendidos[k]);
      }
      const rj = Object.keys(this.perfil.rejeitados);
      if (rj.length > LIMITE) rj.slice(0, rj.length - LIMITE).forEach((k) => delete this.perfil.rejeitados[k]);
    }
  }

  // ===========================================================================
  // 10. Banco de frases — várias formas de dizer a mesma coisa, por registro
  // ===========================================================================

  const FRASES = {
    saudacao: {
      neutro: ['{Saudacao}{,nome}! Como posso te ajudar hoje?', 'Oi{,nome}! Que bom te ver por aqui. Em que posso ajudar?', '{Saudacao}! Estou por aqui — pode mandar sua dúvida.', 'Olá{,nome}! Me conta: o que você precisa hoje?', '{Saudacao}{,nome}! No que posso ser útil?'],
      formal: ['{Saudacao}{,nome}. Em que posso ser útil?', '{Saudacao}! Estou à disposição para ajudar.', '{Saudacao}{,nome}. Como posso ajudar hoje?', 'Olá{,nome}! Fico à disposição para o que precisar.'],
      informal: ['Oi{,nome}! 😊 No que posso te ajudar?', 'E aí{,nome}! Bora lá — o que você precisa?', 'Opa{,nome}! Manda aí sua dúvida.', 'Oi, oi! Tô por aqui. Em que posso ajudar?', 'Fala{,nome}! Como posso te ajudar hoje?']
    },
    saudacao_retorno: ['Que bom te ver de novo{,nome}! Em que posso ajudar agora?', 'Oi de novo{,nome}! 😊 O que vamos resolver hoje?', '{Saudacao}{,nome}! Bom te ver por aqui outra vez. No que posso ajudar?'],
    saudacao_curta: {
      neutro: ['{Saudacao}{,nome}!', 'Oi{,nome}!', 'Olá{,nome}!'],
      formal: ['{Saudacao}{,nome}.', 'Olá{,nome}.'],
      informal: ['Oi{,nome}! 😊', 'E aí{,nome}!', 'Opa{,nome}!']
    },
    como_vai: {
      neutro: ['Tudo ótimo por aqui, obrigada por perguntar! E com você, tudo bem?', 'Estou bem e pronta pra ajudar! 😊 E você, como está?', 'Tudo certo por aqui! E você, como está o seu dia?'],
      formal: ['Estou muito bem, obrigada pela gentileza. E você, como está?', 'Vou muito bem, obrigada! E você, tudo bem?'],
      informal: ['Tudo ótimo, e contigo? 😄', 'Tô bem demais, valeu por perguntar! E você, tudo certo?', 'Tudo tranquilo por aqui! E aí, como tá o dia?']
    },
    como_vai_curto: ['Tudo ótimo por aqui, obrigada!', 'Tudo certo, obrigada por perguntar!', 'Estou bem, obrigada!'],
    estado_positivo: {
      neutro: ['Que bom! Fico feliz em saber. 😊 Em que posso te ajudar?', 'Ótimo! Então vamos lá: no que posso ajudar hoje?', 'Que bom ouvir isso! Me conta, o que você precisa?'],
      formal: ['Que ótimo! Em que posso ser útil?', 'Fico contente em saber. Como posso ajudar?'],
      informal: ['Aí sim! 😄 Bora lá, o que você precisa?', 'Que bom! Manda aí, no que posso ajudar?']
    },
    estado_negativo: {
      neutro: ['Poxa, sinto muito. Dias assim são puxados mesmo. Se eu puder facilitar alguma coisa por aqui, é só falar.', 'Sinto muito por isso. 💙 Estou aqui pra ajudar no que for preciso — quer me contar o que está pegando?', 'Entendo… às vezes o dia pesa mesmo. Conte comigo pra agilizar o que for possível.'],
      formal: ['Sinto muito em saber. Se houver algo em que eu possa ajudar, estou à disposição.', 'Lamento ouvir isso. Conte comigo no que for preciso.'],
      informal: ['Poxa… sinto muito. 💙 Tô aqui, se precisar de uma força é só falar.', 'Ah, que chato… Se eu puder ajudar em algo, manda aí.']
    },
    cansaco: ['E lembre-se: cansaço também é fator de risco. Se puder, faça uma pausa e se hidrate. 💧', 'Ah, e fadiga aumenta o risco de acidentes — respeite suas pausas, combinado?'],
    agradecimento: {
      neutro: ['Por nada! 😊', 'Imagina, foi um prazer ajudar!', 'Disponha! Qualquer coisa, é só chamar.', 'De nada! Fico feliz que tenha ajudado.', 'Eu que agradeço! Estou por aqui sempre que precisar.'],
      formal: ['Por nada. Fico à disposição.', 'Disponha. Sempre que precisar, estarei aqui.', 'Foi um prazer ajudar.'],
      informal: ['Tamo junto! 😄', 'Imagina! Precisando, é só chamar.', 'De nada! 👊', 'Que isso! Tô aqui pra isso.']
    },
    agradecimento_curto: ['Imagina!', 'De nada!', 'Por nada!'],
    elogio: {
      neutro: ['Que bom que gostou! 😊', 'Obrigada! Fico feliz em ajudar.', 'Ah, assim eu fico sem graça! 😄 Obrigada!', 'Valeu pelo retorno! Isso me ajuda a melhorar.'],
      formal: ['Agradeço o retorno! Fico satisfeita em ajudar.', 'Muito obrigada pelo reconhecimento.'],
      informal: ['Ahh, valeu! 😄', 'Que bom que curtiu! 🙌', 'Opa, obrigada! Tamo junto.']
    },
    despedida: {
      neutro: ['Até mais{,nome}! Trabalhe com segurança. 🦺', 'Tchau{,nome}! Foi ótimo conversar com você.', 'Até logo! Qualquer dúvida, estarei por aqui.', 'Até a próxima! Segurança em primeiro lugar. 👷'],
      formal: ['Até logo{,nome}. Tenha um excelente dia, com segurança.', 'Até breve! Fico à disposição sempre que precisar.'],
      informal: ['Falou{,nome}! Se cuida e bom trabalho! 🦺', 'Tchau, tchau! Qualquer coisa, só chamar. 😉', 'Até mais! Vai com segurança! 👷']
    },
    despedida_noite: ['Boa noite{,nome}! Bom descanso. 🌙', 'Boa noite! Descanse bem — amanhã tem mais. 😊'],
    identidade: {
      neutro: ['Eu sou a {assistente}, a inteligência artificial do {produto}. Estou aqui pra te ajudar com segurança do trabalho: normas, procedimentos, documentos e o que mais você precisar no dia a dia.', 'Sou a {assistente}! Faço parte do {produto} e minha missão é te ajudar com tudo que envolve segurança do trabalho — do jeito que for mais fácil pra você.'],
      formal: ['Sou a {assistente}, a inteligência artificial do {produto}. Posso apoiar em normas, procedimentos, documentos e demais temas de segurança do trabalho.'],
      informal: ['Eu sou a {assistente}! 😊 A IA do {produto}. Tô aqui pra te dar uma força com segurança do trabalho — normas, EPIs, documentos, procedimentos…']
    },
    humana: ['Não sou humana — sou uma inteligência artificial. 😊 Mas estou aqui pra conversar com você de forma natural e ajudar no que precisar.', 'Sou uma IA, não uma pessoa. Mesmo assim, faço questão de entender direitinho o que você precisa!'],
    criador: ['Fui desenvolvida para o {produto}, para apoiar as equipes em segurança do trabalho. 😊'],
    capacidades: {
      neutro: ['Posso te ajudar com {temas}. Pode perguntar do seu jeito — formal, informal ou técnico, eu entendo. 😊', 'Estou aqui pra tirar dúvidas sobre {temas}. É só perguntar, do jeito que você falaria com um colega.'],
      formal: ['Posso auxiliar em temas como {temas}. Fique à vontade para perguntar.'],
      informal: ['Manjo de {temas}! 😄 Pode perguntar do jeito que você falaria no dia a dia.']
    },
    ajuda: {
      neutro: ['Claro! Me conta o que você precisa — pode ser uma dúvida sobre norma, EPI, documento, procedimento…', 'Estou aqui pra isso! Qual é a sua dúvida?', 'Com certeza. Me diga o que está acontecendo que eu te ajudo.'],
      formal: ['Certamente. Por favor, descreva sua dúvida.', 'Com prazer. Em que posso ajudar?'],
      informal: ['Bora! Me fala o que tá pegando.', 'Claro! Manda a dúvida aí.']
    },
    confirmacao: {
      neutro: ['Combinado! 👍 Se precisar de algo, é só falar.', 'Perfeito! Em que mais posso ajudar?', 'Ótimo! Estou por aqui.'],
      formal: ['Perfeito. Fico à disposição.', 'Combinado. Em que mais posso ajudar?'],
      informal: ['Fechou! 👍', 'Beleza! Qualquer coisa, chama.']
    },
    negacao: {
      neutro: ['Tudo bem! Se mudar de ideia, estou por aqui.', 'Sem problemas! Qualquer coisa, é só chamar.', 'Tranquilo! Posso ajudar com outra coisa?'],
      formal: ['Sem problemas. Fico à disposição.', 'Entendido. Estou à disposição se precisar.'],
      informal: ['De boa! Qualquer coisa, só chamar. 😉', 'Tranquilo! Tô por aqui.']
    },
    entendimento_ok: ['Ótimo! 😊 Se surgir outra dúvida, é só chamar.', 'Que bom que ficou claro!', 'Perfeito! Qualquer coisa, estou por aqui.'],
    piada: [
      'Por que o extintor foi ao psicólogo? Porque vivia sob pressão! 🧯😄',
      'Por que o capacete nunca perde a calma? Porque ele sempre mantém a cabeça no lugar! ⛑️😄',
      'O que o cinto paraquedista disse para o trabalhador? "Pode contar comigo, eu te seguro nas alturas!" 😄',
      'Sabe qual é o cúmulo da segurança? Fazer DDS até no sonho! 😴📋',
      'Por que a escada foi promovida? Porque sempre ajudou todo mundo a subir — com três pontos de apoio, claro! 🪜😄',
      'Qual é o EPI mais otimista? O protetor auricular: ele só escuta coisa boa! 😄'
    ],
    horario: ['Agora são {hora}.', 'São {hora} agora.'],
    pausa: [' Que tal uma pausa rápida pra água? 💧', ''],
    data: ['Hoje é {data}.', 'Hoje é {data}. 📅'],
    clima: ['Não tenho acesso à previsão do tempo, mas, se for trabalhar ao ar livre, vale conferir — e não esqueça da hidratação e do protetor solar! ☀️'],
    sobre_ia: ['Não tenho sentimentos como as pessoas, mas posso dizer que conversar com você é a melhor parte do meu trabalho. 😊', 'Não durmo nem tiro férias — estou sempre por aqui! 😄', 'Se eu pudesse escolher uma coisa, seria ver todo mundo voltando pra casa em segurança todos os dias. 💚'],
    flerte: ['Fico lisonjeada! 😊 Mas meu compromisso aqui é com a sua segurança. Posso te ajudar em algo?', 'Haha, obrigada pelo carinho! 😄 Vamos focar em trabalhar com segurança? Em que posso ajudar?'],
    teste: ['Estou aqui! 👋 Pode mandar.', 'Funcionando perfeitamente! Em que posso ajudar?', 'Tô on! 😄 Qual é a dúvida?'],
    riso: { neutro: ['Haha! 😄', 'Que bom que está de bom humor! 😄'], informal: ['Kkkk 😄', 'Hahaha! 😆'], formal: ['😊'] },
    apresentacao: ['Prazer, {nome}! 😊 Vou lembrar do seu nome. Em que posso ajudar?', 'Muito prazer, {nome}! Como posso te ajudar hoje?', 'Que bom te conhecer, {nome}! No que posso ser útil?'],
    apresentacao_curta: ['Prazer, {nome}!', 'Muito prazer, {nome}!'],
    papel: ['Legal saber que você atua como {papel}! Vou levar isso em conta nas respostas.'],
    preferencia: {
      curto: ['Combinado! Vou ser mais direta. 👍', 'Pode deixar — respostas mais curtas a partir de agora.'],
      detalhado: ['Combinado! Vou detalhar mais as respostas.', 'Pode deixar, vou explicar com mais detalhes.'],
      sem_emoji: ['Entendido, sem emojis a partir de agora.'],
      com_emoji: ['Oba! Pode deixar 😄'],
      formal: ['Perfeitamente. Adotarei uma linguagem mais formal.'],
      informal: ['Fechou! Vou falar de um jeito mais descontraído. 😄'],
      simples: ['Combinado! Vou explicar de um jeito mais simples, sem complicar.']
    },
    desconhecido: ['Hmm, não entendi bem. 🤔 Pode me contar com um pouco mais de detalhe?', 'Pode explicar um pouco melhor o que você precisa? Assim eu acerto a resposta.', 'Fiquei na dúvida sobre o que você quis dizer. Pode escrever de outro jeito?'],
    desculpa: {
      neutro: ['Desculpa, acho que eu não entendi direito.', 'Poxa, foi mal — entendi errado.', 'Você tem razão, me desculpe.'],
      formal: ['Peço desculpas pelo equívoco.', 'Desculpe, interpretei mal a sua pergunta.'],
      informal: ['Ops, foi mal! 😅', 'Putz, entendi errado, desculpa!']
    },
    alternativa: ['Será que é isto que você procura?', 'Talvez seja isto:', 'Veja se agora acertei:'],
    pedir_reformular: ['Pode me explicar com outras palavras? Se puder, me diga a norma, o equipamento ou a situação — assim eu acerto. 🙂', 'Me conta de outro jeito o que você precisa? Qualquer detalhe ajuda: atividade, documento, norma…'],
    repeticao: ['Você tem razão, eu estava me repetindo. 😅', 'É verdade, repeti a mesma coisa — desculpa.'],
    angulos: ['O que exatamente você quer saber sobre {tema}? Por exemplo: prazos, quem é responsável, como fazer ou documentação.', 'Sobre {tema}, qual ponto te interessa mais: prazos, responsabilidades, procedimento ou documentos?'],
    nao_encontrado_1: ['Hmm, não encontrei uma resposta exata para isso. 🤔 Pode me dar um pouco mais de contexto? Por exemplo: a norma, a atividade ou o equipamento.', 'Não achei nada específico sobre isso. Pode me explicar com outras palavras ou dar mais detalhes?', 'Ainda não sei responder isso com precisão. Me conta um pouco mais sobre a situação?'],
    nao_encontrado_2: ['Ainda não consegui encontrar. Talvez essa informação não esteja na minha base. Posso te ajudar com {temas}.', 'Continuo sem achar essa informação. Que tal tentar com outras palavras? Eu domino temas como {temas}.'],
    nao_encontrado_3: ['Parece que essa informação não está na minha base ainda. Recomendo confirmar com o SESMT ou o responsável de segurança da sua unidade. Posso ajudar com outro assunto?'],
    sugestoes: ['Encontrei alguns temas relacionados:{opcoes}\nAlgum deles ajuda?', 'Talvez você esteja procurando:{opcoes}\nQual deles?'],
    clarificar: ['Só pra eu acertar, você quer saber sobre:{opcoes}', 'Fiquei na dúvida entre estes temas:{opcoes}\nQual deles?', 'Você está falando de qual destes?{opcoes}'],
    hesitacao: ['Se entendi bem, você quer saber sobre {titulo}.', 'Acho que é isto que você procura:', 'Pelo que entendi, isto deve ajudar:'],
    confirmar_acerto: ['Era isso que você procurava?', 'Respondi o que você queria saber?', 'É isso ou você procurava outra coisa?'],
    detalhar: ['Claro, vou aprofundar:', 'Com certeza! Mais detalhes:', 'Vamos lá, em mais detalhes:'],
    exemplo: ['Um exemplo prático:', 'Na prática, fica assim:', 'Veja este exemplo:'],
    resumo: ['Resumindo:', 'Em poucas palavras:', 'Versão curta:'],
    esclarecer: ['Claro, vou explicar de outro jeito:', 'Sem problemas, vou simplificar:', 'Vamos por partes:'],
    repetir: ['Claro, repetindo:', 'Sem problemas, aqui vai de novo:'],
    ficou_claro: ['Ficou mais claro assim?', 'Assim ficou melhor?'],
    sem_detalhes: ['Isso é o essencial que tenho sobre esse tema. Se quiser, me diga qual ponto você quer aprofundar.', 'Esse é o principal sobre o assunto. Quer que eu fale sobre algum tema relacionado?'],
    sem_exemplo: ['Não tenho um exemplo pronto sobre isso, mas posso detalhar o que for preciso. Qual parte você quer entender melhor?'],
    nada_antes: ['Claro! Sobre qual assunto você quer saber mais?', 'Me diga o tema que eu explico melhor.'],
    urgente: ['Vamos direto ao ponto:', 'Rapidinho:'],
    frustrado: ['Entendo a frustração — vamos resolver isso juntos.', 'Sinto muito pelo transtorno. Vamos direto ao ponto:']
  };

  // Aberturas (antes da resposta) — ecoam o assunto com as palavras do usuário.
  const ABERTURAS = {
    geral: {
      neutro: ['Claro!', 'Vamos lá!', 'Boa pergunta!', 'Certo!', 'Com certeza.', 'Deixa comigo.', 'Sobre {tema}:', 'Vou te explicar:'],
      formal: ['Certamente.', 'Com prazer.', 'Pois não.', 'Segue a informação:', 'Sobre {tema}:', 'Em relação {a_tema}:'],
      informal: ['Bora lá!', 'Claro! 😊', 'Opa, boa pergunta!', 'Tranquilo, te explico:', 'Show, vamos lá:', 'Então, sobre {tema}:', 'Beleza!'],
      tecnico: ['Sobre {tema}:', 'Vamos aos pontos principais:', 'Certo.']
    },
    prazo: ['Sobre {tema}:', 'Quanto {a_tema}:', 'Em relação {a_tema}:'],
    definicao: ['Explicando de forma direta:', 'Vamos ao conceito:', 'Em resumo, é assim:'],
    procedimento: ['Funciona assim:', 'Vou te orientar:', 'Vamos lá, é assim que funciona:'],
    requisito: ['Boa pergunta — isso é importante:', 'Vamos ver o que se exige:'],
    responsavel: ['Sobre quem é responsável:', 'Quanto à responsabilidade:'],
    motivo: ['Faz todo sentido perguntar isso:', 'O motivo é importante:'],
    comparacao: ['Vamos às diferenças:', 'Comparando os dois:'],
    lista: ['Aqui estão:', 'Vamos lá:'],
    continuacao: ['E sobre {tema}:', 'Agora, {tema}:', 'Quanto {a_tema}:'],
    repetida: ['Como comentei há pouco,', 'Retomando o que falei:', 'Reforçando:']
  };

  const FECHAMENTOS = {
    completo: ['Quer ver a explicação completa?', 'Se quiser, te passo o texto completo sobre isso.', 'Posso mostrar o restante das informações, se ajudar.'],
    detalhes: ['Quer que eu detalhe mais?', 'Se quiser, posso aprofundar esse ponto.', 'Posso te explicar com mais detalhes, se quiser.'],
    exemplo: ['Quer ver um exemplo prático?', 'Posso te dar um exemplo na prática, se ajudar.'],
    relacionado: ['Se quiser, também posso falar sobre {rel}.', 'Isso tem tudo a ver com {rel} — quer que eu explique também?'],
    geral: {
      neutro: ['Ficou alguma dúvida?', 'Posso ajudar em mais alguma coisa?', 'Quer saber mais algum detalhe?', 'Se precisar, é só chamar.'],
      formal: ['Fico à disposição para outras dúvidas.', 'Posso ajudar em algo mais?'],
      informal: ['Qualquer dúvida, só chamar! 😉', 'Ficou claro?', 'Precisando, tô aqui!'],
      tecnico: ['Precisa de mais algum ponto?']
    },
    seguranca: ['Segurança em primeiro lugar! 🦺', 'Conte comigo pra trabalhar com segurança. 👷']
  };

  const PASSOS_EMERGENCIA = {
    choque: 'Não toque na vítima enquanto ela estiver em contato com a energia — desligue a fonte primeiro (disjuntor ou chave geral).',
    queda: 'Não mova a vítima, a menos que haja perigo imediato no local (pode haver lesão na coluna).',
    incendio: 'Acione o alarme e a brigada e evacue pela rota de fuga. Só use o extintor se for seguro e se ele for adequado à classe do fogo.',
    vazamento: 'Evacue e isole a área, não acione interruptores nem produza faíscas e, se for seguro, ventile o local.',
    sangramento: 'Faça compressão firme no ferimento com um pano limpo até a chegada do socorro.',
    respiracao: 'Verifique se a vítima responde e respira. Se não respirar, ligue 192 e inicie a RCP (compressões torácicas), se souber fazer.',
    confinado: 'Não entre no espaço confinado para resgatar sem equipamento e equipe de resgate — acione o plano de resgate.',
    geral: 'Afaste as pessoas do perigo e não se exponha ao mesmo risco da vítima.'
  };

  // ===========================================================================
  // 11. Composição: gramática, eco do assunto, emojis e transformações de texto
  // ===========================================================================

  const GRUPOS_TERMO = {
    APR: 'documento', PT: 'documento', PET: 'documento', CAT: 'documento', ASO: 'documento', FISPQ: 'documento',
    LTCAT: 'documento', PPP: 'documento', PGR: 'documento', GRO: 'documento', PCMSO: 'documento', AET: 'documento',
    AEP: 'documento', PAE: 'documento', EPI: 'equipamento', EPC: 'equipamento', CA: 'equipamento', EXTINTOR: 'equipamento',
    SPDA: 'equipamento', CIPA: 'orgao', SESMT: 'orgao', BRIGADA: 'orgao', LOTO: 'pratica', DDS: 'pratica',
    QUASE_ACIDENTE: 'pratica', SEP: 'pratica'
  };

  function grupoEntidade(e) {
    return e.tipo === 'nr' ? 'nr' : GRUPOS_TERMO[e.id] || e.id;
  }

  function tokenDaEntidade(base, e) {
    if (e.tipo === 'nr') return base === 'nr' + e.num;
    const termo = TERMOS_COMPILADOS.find((t) => t.id === e.id);
    return !!termo && termo.re.test(base);
  }

  function ehTokenDeEntidade(base) {
    return /^nr\d+$/.test(base) || TERMOS_COMPILADOS.some((t) => t.re.test(base));
  }

  const FEMININAS = new Set(palavras(`
    analise classe base fase frase chave rede parede corrente ponte fonte parte noite tarde febre sede ordem nuvem
    vez luz cor dor lei gente mente morte arte equipe norma carga altura queda escada luva bota mascara ficha
  `));
  const MASCULINAS_EM_A = new Set(palavras('dia mapa problema sistema programa tema clima esquema idioma diagrama'));

  function genero(palavra) {
    const b = semAcentos(String(palavra).toLowerCase());
    const s = b.endsWith('s') && b.length > 3 ? singular(b) : b;
    if (FEMININAS.has(s)) return 'f';
    if (MASCULINAS_EM_A.has(s)) return 'm';
    if (/(?:cao|sao|dade|gem|ice|ez|tude|ura|ancia|encia)$/.test(s) || s.endsWith('a')) return 'f';
    return 'm';
  }

  function comArtigo(palavra, g) {
    const plural = /s$/.test(semAcentos(palavra)) && !/^(?:nr|epi|epc|apr|dds|pt)/i.test(palavra) && palavra === palavra.toLowerCase();
    const gen = g || genero(palavra);
    return (gen === 'f' ? (plural ? 'as' : 'a') : plural ? 'os' : 'o') + ' ' + palavra;
  }

  // "de" + "a NR-35" → "da NR-35"; "a" + "o prazo" → "ao prazo" (com crase quando couber).
  function contrair(prep, frase) {
    const m = frase.match(/^(o|a|os|as) (.*)$/);
    if (!m) return prep + ' ' + frase;
    const art = m[1];
    const mapa = {
      de: { o: 'do', a: 'da', os: 'dos', as: 'das' },
      em: { o: 'no', a: 'na', os: 'nos', as: 'nas' },
      a: { o: 'ao', a: 'à', os: 'aos', as: 'às' },
      por: { o: 'pelo', a: 'pela', os: 'pelos', as: 'pelas' }
    };
    return (mapa[prep] ? mapa[prep][art] : prep + ' ' + art) + ' ' + m[2];
  }

  function entidadeComArtigo(e, completo) {
    const rotulo = e.tipo === 'nr' && completo && e.nome ? e.rotulo + ' (' + e.nome + ')' : e.rotulo;
    return comArtigo(rotulo, e.genero || 'm');
  }

  const NUCLEOS = new Set(palavras(`
    validade prazo periodicidade reciclagem vencimento diferenca obrigatoriedade responsabilidade finalidade objetivo
    importancia frequencia duracao limite procedimento preenchimento emissao uso utilizacao funcao definicao conceito
    classificacao tipos classes treinamento curso exame laudo documento inspecao analise permissao carga
  `));
  const FOCOS_VAGOS = new Set(palavras(`
    validade prazo periodicidade reciclagem vencimento diferenca obrigatoriedade responsabilidade finalidade objetivo
    importancia frequencia duracao limite definicao conceito
  `));
  const RE_VERBAL = /(?:ar|er|ir|ando|endo|indo|ado|ido|ada|ida|ou|ei|amos|emos|imos|am|em)$/;

  // Monta "a validade do treinamento da NR-35" a partir das palavras do usuário.
  function fraseTema(quadro) {
    if (!quadro) return null;
    const conteudo = quadro.conteudo.filter((c) => c.peso >= 1);
    const nomes = conteudo
      .filter((c) => !ehTokenDeEntidade(c.base) && !CONVERSA.has(c.base) && c.base.length >= 3 && !/\d/.test(c.base))
      .filter((c) => NUCLEOS.has(singular(c.base)) || !RE_VERBAL.test(c.base))
      .slice(0, 2);
    const ents = quadro.entidades.filter((e) => !e.implicita);
    const ent = ents[0] || null;
    const partes = nomes.map((c) => comArtigo(c.exib));
    if (!partes.length && !ent) return null;
    if (!partes.length) return entidadeComArtigo(ent, true);
    // "a validade" sozinha é vaga demais para ecoar.
    if (!ent && partes.length === 1 && FOCOS_VAGOS.has(singular(nomes[0].base))) return null;
    let frase = partes[0];
    if (partes[1]) frase += ' ' + contrair('de', partes[1]);
    if (ent) frase += ' ' + contrair('de', entidadeComArtigo(ent, false));
    return frase;
  }

  const RE_EMOJI_TUDO = /(?:\p{Extended_Pictographic}|️|‍)+/gu;

  function removerEmojis(s) {
    return s.replace(RE_EMOJI_TUDO, '').replace(/[ \t]{2,}/g, ' ').replace(/ +([.!?,:])/g, '$1').trim();
  }

  function limitarEmojis(s, max) {
    let n = 0;
    return s.replace(RE_EMOJI_TUDO, (m) => (++n <= max ? m : '')).replace(/[ \t]{2,}/g, ' ').trim();
  }

  function htmlParaTexto(s) {
    return String(s)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|h\d|ul|ol|tr)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function dividirFrases(texto) {
    return texto.replace(/([.!?])\s+(?=[A-ZÀ-Ú0-9"“(•–-])/g, '$1\n').split('\n').map((s) => s.trim()).filter(Boolean);
  }

  function resumirTexto(texto, max) {
    const linhas = htmlParaTexto(texto).split('\n').map((l) => l.trim()).filter(Boolean);
    let saida = '';
    for (const linha of linhas) {
      const itens = linha.startsWith('•') ? [linha] : dividirFrases(linha);
      for (let i = 0; i < itens.length; i++) {
        const f = itens[i];
        if (saida && saida.length + f.length > max) return saida;
        saida += saida ? (i === 0 ? '\n' : ' ') + f : f;
      }
    }
    return saida;
  }

  function emTopicos(texto) {
    const puro = htmlParaTexto(texto);
    if (/\n\s*(?:•|-|\d+[.)])/.test(puro)) return puro;
    const fs = dividirFrases(puro);
    return fs.length > 1 ? fs.map((f) => '• ' + f).join('\n') : puro;
  }

  // Marcas textuais que respondem a cada tipo de pergunta específica.
  const MARCAS_FOCO = {
    prazo: /\b(?:a cada|bienal|anual|semestral|mensal|validade|vence|vencimento|prazo|periodicidade|periodic[oa]|reciclagem|imediatamente|ate o primeiro|\d+\s*(?:anos?|mes(?:es)?|dias?))\b/,
    quantidade: /\d/,
    responsavel: /\b(?:deve ser (?:feit|emitid|elaborad|assinad|aprovad|preenchid)\w*|devem ser (?:feit|emitid|elaborad)\w*|responsavel|responsabilidade|pela equipe|emitid[oa] pel\w*|aprovad[oa] pel\w*|assinad[oa] pel\w*|compete|cabe a)\b/
  };

  // Separa, de uma resposta longa, só as frases que respondem ao que foi perguntado.
  function trechoRelevante(corpo, quadro, principais) {
    const foco = quadro.foco && quadro.foco.tipo;
    const marca = MARCAS_FOCO[foco];
    if (!marca || /<\/?[a-z][^>]*>/i.test(corpo) || /\n\s*(?:•|-|\d+[.)])/.test(corpo)) return null;
    const frases = dividirFrases(corpo.replace(/\s*\n\s*/g, ' '));
    if (frases.length < 2 || (frases.length === 2 && corpo.length < 200)) return null;
    const pontos = frases.map((f, i) => {
      const base = semAcentos(normalizarNRs(f.toLowerCase()));
      const radicais = new Set((base.match(/[a-z0-9]+/g) || []).filter((w) => !STOPWORDS.has(w)).map(radical));
      let s = marca.test(base) ? 2 : 0;
      quadro.conteudo.forEach((c) => {
        if (radicais.has(c.radical)) s += (principais.has(c.radical) ? 0.2 : 1) * (c.peso || 1);
      });
      return { f, i, s };
    });
    const melhor = pontos.reduce((m, p) => (p.s > m.s ? p : m), pontos[0]);
    if (melhor.s < 2) return null;
    const escolhidos = pontos
      .filter((p) => p === melhor || (p.s >= 2 && p.s >= melhor.s * 0.75))
      .sort((a, b) => b.s - a.s)
      .slice(0, 2)
      .sort((a, b) => a.i - b.i);
    if (escolhidos.length >= frases.length) return null;
    const trecho = escolhidos.map((p) => p.f).join(' ');
    return trecho.length >= 40 ? trecho : null;
  }

  function juntarLista(itens) {
    if (itens.length <= 1) return itens.join('');
    return itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1];
  }

  function tituloEntrada(e) {
    const t = e.titulo || e.perguntas[0] || e.palavras.slice(0, 3).join(', ') || resumirTexto(String(e.respostas[0]), 60);
    return capitalizar(String(t).replace(/[?!.:]+$/, '').trim());
  }

  const PREFERENCIAS = [
    ['verbosidade', 'curto', /\b(?:(?:seja|responda|responde|fala|escreva|escreve) (?:mais )?(?:curt[oa]|breve|diret[oa]|objetiv[oa]|resumid[oa]|sucint[oa])|respostas? (?:mais )?(?:curtas?|diretas?|menores|objetivas?)|menos texto|muito (?:longo|texto|grande)|textao|sem enrolacao)\b/],
    ['verbosidade', 'detalhado', /\b(?:(?:seja|responda|responde) (?:mais )?(?:detalhad[oa]|complet[oa])|respostas? (?:mais )?(?:detalhadas?|completas?|longas?|maiores))\b/],
    ['emoji', false, /\b(?:sem (?:emoji|emojis|emoticons?)|para de (?:usar )?emojis?|nao (?:use|usa|coloque|coloca) emojis?)\b/],
    ['emoji', true, /\b(?:pode usar emojis?|usa (?:mais )?emojis?|com emojis?)\b/],
    ['tom', 'formal', /\b(?:(?:seja|fale|fala) (?:mais )?formal|mais formal|linguagem formal)\b/],
    ['tom', 'informal', /\b(?:(?:seja|fale|fala) (?:mais )?(?:informal|descontraid[oa]|natural)|pode ser informal|pode falar normal|sem formalidade)\b/],
    ['simples', true, /\b(?:(?:fala|explica|explique|seja) (?:mais )?simples|linguagem simples|como se eu (?:fosse|tivesse) (?:uma crianca|leigo|5 anos)|para leigo|sem termos tecnicos|nao sou (?:da area|tecnico|especialista))\b/]
  ];

  function detectarPreferencias(expandido) {
    const prefs = {};
    PREFERENCIAS.forEach(([chave, valor, re]) => { if (re.test(expandido)) prefs[chave] = valor; });
    return prefs;
  }

  const RE_PAPEIS = /^(?:tecnic[oa]|engenheir[oa]|supervisor[a]?|gerente|operador[a]?|eletricista|soldador[a]?|mecanic[oa]|estagiari[oa]|analista|coordenador[a]?|auxiliar|encarregad[oa]|motorista|cipeir[oa]|brigadista|medic[oa]|enfermeir[oa]|diretor[a]?|lider|gestor[a]?|instrutor[a]?|inspetor[a]?|pedreiro|carpinteiro|montador[a]?|ajudante|almoxarife|vigia|pintor[a]?|novo|nova|responsavel|proximo|proxima|primeiro|primeira|unico|unica|mesmo|mesma|dono|dona|chefe|cliente|usuario|usuaria)$/;

  function extrairApresentacao(a) {
    const t = a.expandido;
    let nome = null;
    let papel = null;
    const m = t.match(/\b(?:meu nome (?:e|eh)|me chamo|pode me chamar de|podem me chamar de|eu sou (?:o|a)|aqui (?:e|eh) (?:o|a)|^sou (?:o|a))\s+([a-z]{2,20})\b/);
    if (m && !RE_PAPEIS.test(m[1]) && !STOPWORDS.has(m[1]) && !CONVERSA.has(m[1]) && !ehTokenDeEntidade(m[1])) {
      const original = a.original.split(/[^\p{L}]+/u).find((w) => semAcentos(w.toLowerCase()) === m[1]);
      nome = capitalizar((original || m[1]).toLowerCase());
    }
    const p = t.match(/\b(?:sou|trabalho como|atuo como|minha funcao e|meu cargo e) (?:o |a |um |uma )?(tecnic[oa]|engenheir[oa]|supervisor[a]?|gerente|operador[a]?|eletricista|soldador[a]?|mecanic[oa]|estagiari[oa]|analista|coordenador[a]?|auxiliar|encarregad[oa]|cipeir[oa]|brigadista|medic[oa]|enfermeir[oa]|lider|gestor[a]?|instrutor[a]?|inspetor[a]?)(?: (?:de|do|da) (?:seguranca(?: do trabalho)?|campo|manutencao|obras?|producao|sst))?\b/);
    if (p) {
      const bruto = p[0].replace(/^(?:sou|trabalho como|atuo como|minha funcao e|meu cargo e) (?:o |a |um |uma )?/, '');
      papel = bruto.split(' ').map((w) => (a.tokens.find((tk) => tk.base === w) || { exib: w }).exib).join(' ');
    }
    return nome || papel ? { nome, papel } : null;
  }

  const RE_RESPOSTA_PADRAO = /\b(?:nao (?:entendi|compreendi|encontrei|achei|sei (?:responder|a resposta)|consegui (?:entender|encontrar|compreender))|nao tenho (?:essa |uma )?(?:informac\w*|resposta)|poderia (?:reformular|repetir|explicar melhor)|reformul\w*|pergunte de outra forma|tente novamente|nao possuo|desculpe,? (?:mas )?nao)\b/;

  function ehRespostaPadrao(texto) {
    const s = semAcentos(htmlParaTexto(texto).toLowerCase());
    return s.length < 260 && RE_RESPOSTA_PADRAO.test(s);
  }

  function extrairTextoResposta(bruto) {
    if (bruto == null) return null;
    if (typeof bruto === 'string') return bruto.trim() || null;
    if (Array.isArray(bruto)) return extrairTextoResposta(bruto.find((x) => x != null));
    if (typeof bruto === 'object') {
      for (const k of ['texto', 'text', 'resposta', 'answer', 'response', 'mensagem', 'message', 'content', 'conteudo', 'html']) {
        if (typeof bruto[k] === 'string') return bruto[k].trim() || null;
      }
    }
    return null;
  }

  function temIntencao(u, nome, minimo) {
    return u.intencoes.some((i) => i.nome === nome && i.score >= (minimo || 0.5));
  }

  // ===========================================================================
  // 12. Aurora — gerenciador do diálogo
  // ===========================================================================

  const SEGUIMENTOS = ['esclarecer', 'detalhar', 'resumo', 'exemplo', 'repetir'];
  const SOCIAIS_FORTES = ['agradecimento', 'elogio', 'despedida', 'estado_positivo', 'estado_negativo', 'confirmacao', 'negacao',
    'riso', 'teste', 'piada', 'horario', 'data', 'clima', 'sobre_ia', 'flerte', 'identidade', 'capacidades'];

  class Aurora {
    constructor(opcoes) {
      this.opcoes = Object.assign({
        nome: 'Aurora',
        produto: 'OPS 360°',
        formatoNR: 'NR-35',
        semente: null,
        armazenamento: undefined,
        chave: 'aurora.memoria.v1',
        aprender: true,
        formato: 'auto',
        agora: null,
        limiarResposta: 0.5,
        limiarSugestao: 0.3,
        temasPadrao: ['normas regulamentadoras (NRs)', 'EPIs', 'APR e permissões de trabalho', 'treinamentos e prazos', 'prevenção de acidentes', 'emergências']
      }, opcoes || {});
      this.aleatorio = criarAleatorio(this.opcoes.semente);
      this.lexico = criarLexico();
      this.base = new BaseConhecimento(this.lexico, this.opcoes);
      const arm = this.opcoes.aprender === false ? null : criarArmazenamento(this.opcoes.armazenamento);
      this.memoria = new Memoria(arm, this.opcoes.chave);
      this.reiniciarConversa();
      const p = this.memoria.perfil;
      this._retorno = p.visitas > 0 && !!p.ultimaVisita && Date.now() - p.ultimaVisita < 14 * 864e5;
      p.visitas++;
      p.ultimaVisita = Date.now();
      this.memoria.salvar();
      if (this.opcoes.base) this.carregarBase(this.opcoes.base);
    }

    get versao() { return VERSAO; }
    get perfil() { return this.memoria.perfil; }

    carregarBase(fonte, acrescentar) {
      return this.base.carregar(fonte, acrescentar);
    }

    reiniciarConversa() {
      this.estado = {
        turno: 0, quadro: null, aguardando: null, ultima: null, pendente: null, falhas: 0,
        usados: {}, ultimoNome: -10, ultimoFechamento: -10, historico: []
      };
    }

    esquecer() {
      this.memoria.esquecer();
      this.reiniciarConversa();
    }

    _agora() {
      return this.opcoes.agora ? this.opcoes.agora() : new Date();
    }

    // -------------------------------------------------------------- entender
    entender(texto) {
      const a = analisarTexto(texto, this.lexico, this.opcoes);
      const entidades = detectarEntidades(a.expandido);
      const intencoes = detectarIntencoes(a.expandido, a.sinais, a.expandidoBruto);
      const foco = detectarFoco(a.expandido);
      const reg = avaliarRegistro(a, entidades);
      const sent = avaliarSentimento(a, intencoes);
      const urgencia = avaliarUrgencia(a);
      const dominio = extrairConteudo(a.tokens).filter((c) => !CONVERSA.has(c.base));
      const explicitas = entidades.filter((e) => !e.implicita);
      const u = {
        texto: a.original,
        expandido: a.expandido,
        correcoes: a.correcoes,
        sinais: a.sinais,
        entidades,
        intencoes,
        foco,
        pergunta: a.sinais.pergunta || RE_PERGUNTA.test(a.expandido),
        conteudo: dominio.map((c) => c.exib),
        temConteudo: dominio.length > 0 || explicitas.length > 0,
        registro: reg.registro,
        formalidade: reg.formalidade,
        tecnicidade: reg.tecnicidade,
        sentimento: sent.rotulo,
        valorSentimento: sent.valor,
        frustracao: sent.frustracao,
        urgencia,
        emergencia: urgencia >= 0.7 ? tipoEmergencia(a.expandido) : null,
        apresentacao: extrairApresentacao(a),
        preferencias: Object.assign(detectarPreferencias(a.expandidoBruto), detectarPreferencias(a.expandido)),
        saudacaoUsuario: (a.expandido.match(/\b(bom dia|boa tarde|boa noite)\b/) || [])[1] || null,
        surpresa: /\b(?:serio|nossa|uau|caramba|eita|nao acredito|jura|caraca)\b/.test(a.expandido) && (a.sinais.exclamacoes > 0 || a.sinais.pergunta)
      };
      Object.defineProperty(u, 'tokens', { value: a.tokens, enumerable: false });
      const cont = this._resolverContinuacao(u, dominio, explicitas);
      u.continuacao = cont.continuacao;
      u.quadro = cont.quadro;
      u.consulta = cont.consulta;
      u.consultaSemAcentos = semAcentos(cont.consulta);
      u.principal = this._principal(u);
      return u;
    }

    _principal(u) {
      const forte = u.intencoes.find((i) => i.score >= 0.8 && SOCIAIS_FORTES.includes(i.nome));
      if (u.urgencia >= 1 || (u.urgencia >= 0.7 && !u.temConteudo)) return 'emergencia';
      if (u.temConteudo && (u.pergunta || u.foco || temIntencao(u, 'solicitacao', 0.6) || !forte)) {
        return temIntencao(u, 'solicitacao', 0.6) && !u.pergunta ? 'solicitacao' : 'pergunta';
      }
      if (u.intencoes.length) return u.intencoes[0].nome;
      return u.temConteudo ? 'pergunta' : 'desconhecida';
    }

    // Retoma o assunto anterior em mensagens como "e da NR-10?" ou "quem assina?".
    _resolverContinuacao(u, dominio, explicitas) {
      const est = this.estado;
      const ant = est.quadro;
      const t = u.expandido;
      let continuacao = false;
      if (ant && Date.now() - ant.t < 20 * 60000 && est.turno - ant.turno <= 6) {
        const comecaComE = /^(?:e|mas e|e quanto|e sobre|e se|e no caso|e para|tambem|e tambem)\b/.test(t) && !/^e ai\b/.test(t);
        const anafora = /\b(?:isso|isto|disso|disto|nisso|dele|dela|deles|delas|nele|nela|desse|dessa|nesse|nessa|essa norma|esse treinamento|esse documento|o mesmo|a mesma)\b/.test(t);
        const seguimento = u.intencoes.some((i) => SEGUIMENTOS.includes(i.nome));
        const social = SOCIAIS_FORTES.some((n) => temIntencao(u, n, 0.8)) && !u.foco;
        const semAssunto = !social && !explicitas.length && dominio.length <= 1 && (u.foco || u.pergunta || seguimento);
        continuacao = (comecaComE && dominio.length <= 4) || (anafora && dominio.length <= 3) || !!semAssunto;
      }
      const conteudo = dominio.map((c) => Object.assign({ peso: 1 }, c));
      const entidades = explicitas.map((e) => Object.assign({}, e));
      let foco = u.foco;
      const herdado = [];
      if (continuacao) {
        const grupos = new Set(entidades.map(grupoEntidade));
        const gruposAnt = new Set(ant.entidades.filter((e) => !e.implicita).map(grupoEntidade));
        // "e o LOTO?" depois de falar da NR-10 é assunto novo: herda só o tema, não as palavras.
        const assuntoNovo = entidades.length > 0 && ![...grupos].some((g) => gruposAnt.has(g));
        ant.entidades.filter((e) => !e.implicita || e.herdada).forEach((e) => {
          if (!grupos.has(grupoEntidade(e))) entidades.push(Object.assign({}, e, { implicita: true, herdada: true }));
        });
        if (!foco && ant.foco) foco = ant.foco;
        if (dominio.length <= 2 && !assuntoNovo) {
          const bases = new Set(conteudo.map((c) => c.base));
          const ids = new Set(entidades.map((e) => e.id));
          ant.conteudo
            .filter((c) => c.peso >= 1 && !bases.has(c.base))
            .filter((c) => !ehTokenDeEntidade(c.base) || ant.entidades.some((e) => ids.has(e.id) && tokenDaEntidade(c.base, e)))
            .slice(0, 4)
            .forEach((c) => {
              conteudo.push(Object.assign({}, c, { peso: 0.6 }));
              herdado.push(c.exib);
            });
        }
      }
      u.entidades.filter((e) => e.implicita).forEach((e) => {
        if (!entidades.some((x) => x.id === e.id)) entidades.push(e);
      });
      const quadro = { conteudo, entidades, foco, t: Date.now(), turno: est.turno };
      let base = u.tokens.map((tk) => tk.exib).join(' ');
      if (continuacao) base = base.replace(/^(?:e|mas e|e quanto a|e quanto|e sobre|e no caso de|e no caso|e para|e pra|também|e também)\s+/i, '');
      const herdadas = entidades.filter((e) => e.herdada && !herdado.some((h) => semAcentos(h.toLowerCase()).replace(/\W/g, '') === semAcentos(e.rotulo.toLowerCase()).replace(/\W/g, ''))).map((e) => e.rotulo);
      const consulta = [base].concat(herdado, herdadas).join(' ').replace(/\s+/g, ' ').trim() + (u.sinais.pergunta ? '?' : '');
      return { continuacao, quadro, consulta };
    }

    // ------------------------------------------------------------- planejar
    _planejar(u) {
      const est = this.estado;
      const socialForte = SOCIAIS_FORTES.some((n) => temIntencao(u, n, 0.8));
      const seguimento = SEGUIMENTOS.find((n) => temIntencao(u, n, 0.6));
      const ehConsulta = u.temConteudo && (u.pergunta || !!u.foco || temIntencao(u, 'solicitacao', 0.6) || !socialForte);
      const explicitas = u.entidades.filter((e) => !e.implicita).length;

      if (u.urgencia >= 1 || (u.urgencia >= 0.7 && !ehConsulta)) return { tipo: 'emergencia' };
      // Conversa fiada clara ("que horas são?", "conta uma piada") vence palavras soltas como "horas".
      const papo = ['horario', 'data', 'clima', 'piada', 'sobre_ia', 'flerte', 'teste', 'identidade', 'capacidades'].find((n) => temIntencao(u, n, 0.85));
      if (papo && !explicitas && u.conteudo.length <= 1) return { tipo: 'social', intencao: papo };
      // "Meu nome é Carla e sou técnica de segurança" é apresentação, não pergunta.
      if (u.apresentacao && !u.foco && !u.sinais.pergunta && u.conteudo.length <= 4 && !temIntencao(u, 'solicitacao', 0.6)) {
        return { tipo: 'social', intencao: u.apresentacao.nome ? 'apresentacao' : 'papel' };
      }
      // "Responda mais curto" é um ajuste de estilo, não uma dúvida.
      if (Object.keys(u.preferencias).length && !u.foco && !explicitas && !u.sinais.pergunta) return { tipo: 'social', intencao: 'preferencia' };
      if (temIntencao(u, 'insatisfacao', 0.8) && !(ehConsulta && !u.continuacao && u.conteudo.length >= 2)) return { tipo: 'reparo' };
      if (est.aguardando && !(ehConsulta && !u.continuacao)) {
        const r = this._resolverAguardando(u);
        if (r) return r;
      }
      if (seguimento && est.ultima && (!u.temConteudo || u.continuacao)) return { tipo: 'seguimento', acao: seguimento };
      if (ehConsulta) return { tipo: 'consulta' };
      if (seguimento) return { tipo: 'seguimento', acao: seguimento };
      if (u.apresentacao && u.apresentacao.nome) return { tipo: 'social', intencao: 'apresentacao' };
      const social = u.intencoes.find((i) => SOCIAIS.has(i.nome) || i.nome === 'riso' || i.nome === 'solicitacao');
      if (social) return { tipo: 'social', intencao: social.nome === 'solicitacao' ? 'ajuda' : social.nome };
      if (Object.keys(u.preferencias).length) return { tipo: 'social', intencao: 'preferencia' };
      if (u.apresentacao && u.apresentacao.papel) return { tipo: 'social', intencao: 'papel' };
      return { tipo: 'desconhecido' };
    }

    _resolverAguardando(u) {
      const est = this.estado;
      const ag = est.aguardando;
      if (est.turno - ag.turno > 1) return null;
      const t = u.expandido;
      const sim = temIntencao(u, 'confirmacao', 0.5) || /^(?:quero|pode|manda|sim|claro|bora|vamos|isso|por favor)\b/.test(t);
      const nao = temIntencao(u, 'negacao', 0.45);
      switch (ag.tipo) {
        case 'oferta':
          if (sim) return { tipo: 'seguimento', acao: ag.acao, id: ag.id };
          if (nao) return { tipo: 'social', intencao: 'negacao' };
          return null;
        case 'escolha': {
          const i = ag.opcoes.length === 1 && sim ? 0 : this._escolherOpcao(u, ag.opcoes);
          if (i >= 0) return { tipo: 'escolha', id: ag.opcoes[i].id, assinatura: ag.assinatura };
          if (nao) return { tipo: 'social', intencao: 'negacao' };
          return null;
        }
        case 'estado_usuario':
          if (temIntencao(u, 'estado_negativo', 0.5)) return { tipo: 'social', intencao: 'estado_negativo' };
          if (temIntencao(u, 'estado_positivo', 0.5) || sim || /^(?:bem|otimo|otima|tranquilo|de boa|suave|tudo|bem tambem|tambem|to bem|estou bem)\b/.test(t)) {
            return { tipo: 'social', intencao: 'estado_positivo' };
          }
          return null;
        case 'confirmar_acerto':
          if (sim || temIntencao(u, 'agradecimento')) return { tipo: 'social', intencao: 'entendimento_ok' };
          if (nao) return { tipo: 'reparo' };
          return null;
        case 'confirmar_entendimento':
          if (sim || temIntencao(u, 'agradecimento')) return { tipo: 'social', intencao: 'entendimento_ok' };
          if (nao) return { tipo: 'seguimento', acao: 'detalhar' };
          return null;
        default:
          return null;
      }
    }

    _escolherOpcao(u, opcoes) {
      const t = u.expandido;
      if (t.split(' ').length <= 5) {
        if (/\b(?:1|primeir[oa]|o de cima|a de cima)\b/.test(t) || /^(?:um|uma|a um|o um)$/.test(t)) return 0;
        if (/\b(?:2|dois|duas|segund[oa])\b/.test(t)) return opcoes.length > 1 ? 1 : -1;
        if (/\b(?:3|tres|terceir[oa])\b/.test(t)) return opcoes.length > 2 ? 2 : -1;
        if (/\bultim[oa]\b/.test(t)) return opcoes.length - 1;
      }
      const meus = new Set(extrairConteudo(u.tokens).map((c) => c.radical));
      if (!meus.size) return -1;
      let melhor = -1;
      let melhorN = 0;
      opcoes.forEach((o, i) => {
        const a = analisarTexto(o.titulo, this.lexico, this.opcoes);
        const n = extrairConteudo(a.tokens).filter((c) => meus.has(c.radical)).length;
        if (n > melhorN) { melhor = i; melhorN = n; }
      });
      return melhor;
    }

    // --------------------------------------------------------- aprendizado
    _assinatura(quadro) {
      const radicais = [...new Set(quadro.conteudo.map((c) => c.radical))].sort().join('|');
      const ents = quadro.entidades.filter((e) => !e.implicita).map((e) => e.id).sort().join('|');
      return hashTexto(radicais + '#' + ents);
    }

    _feedback(u) {
      const est = this.estado;
      const ult = est.ultima;
      if (!ult || est.turno - ult.turno !== 1 || this.opcoes.aprender === false) return;
      const registro = { id: ult.entradaId, consulta: ult.consulta };
      const aguardaAcerto = !est.aguardando || est.aguardando.tipo === 'confirmar_acerto';
      const positivo = temIntencao(u, 'agradecimento', 0.8) || temIntencao(u, 'elogio', 0.8) || (temIntencao(u, 'confirmacao', 0.8) && aguardaAcerto);
      const negativo = temIntencao(u, 'insatisfacao', 0.8);
      if (positivo) {
        this.memoria.aprender(ult.assinatura, registro);
        if (est.pendente && ult.turno - est.pendente.turno <= 2 && est.pendente.assinatura !== ult.assinatura) {
          this.memoria.aprender(est.pendente.assinatura, registro);
        }
        est.pendente = null;
      } else if (!negativo && est.pendente && ult.turno > est.pendente.turno && ult.turno - est.pendente.turno <= 2 && ult.confianca >= 0.6) {
        if (est.pendente.assinatura !== ult.assinatura) this.memoria.aprender(est.pendente.assinatura, registro);
        est.pendente = null;
      }
    }

    _atualizarPerfil(u) {
      const p = this.memoria.perfil;
      p.mensagens++;
      const k = p.mensagens === 1 ? 1 : 0.3;
      p.formalidade = (1 - k) * p.formalidade + k * u.formalidade;
      p.tecnicidade = (1 - k) * p.tecnicidade + k * u.tecnicidade;
      if (u.sinais.emojis) p.usaEmoji = true;
      if (u.apresentacao) {
        if (u.apresentacao.nome) p.nome = u.apresentacao.nome;
        if (u.apresentacao.papel) p.papel = u.apresentacao.papel;
      }
      const pr = u.preferencias;
      if (pr.verbosidade) p.verbosidade = pr.verbosidade;
      if (pr.emoji !== undefined) p.emoji = pr.emoji;
      if (pr.tom) p.tom = pr.tom;
      if (pr.simples) p.simples = true;
      u.entidades.filter((e) => !e.implicita).forEach((e) => { p.temas[e.id] = (p.temas[e.id] || 0) + 1; });
      const temas = Object.keys(p.temas);
      if (temas.length > 60) temas.sort((a, b) => p.temas[a] - p.temas[b]).slice(0, temas.length - 60).forEach((t) => delete p.temas[t]);
    }

    _registroEfetivo(u) {
      const p = this.memoria.perfil;
      if (p.tom) return p.tom;
      if (u.registro === 'tecnico') return 'tecnico';
      const f = 0.6 * u.formalidade + 0.4 * p.formalidade;
      if (f >= 0.3) return 'formal';
      if (f <= -0.2) return 'informal';
      return 'neutro';
    }

    _emojisPermitidos(u, social) {
      const p = this.memoria.perfil;
      if (p.emoji === false) return false;
      if (p.emoji === true) return true;
      if (u.urgencia >= 0.7 || u.frustracao >= 0.4 || u.sentimento === 'negativo') return false;
      const reg = this._registroEfetivo(u);
      if (reg === 'formal' || reg === 'tecnico') return false;
      if (reg === 'informal' || p.usaEmoji) return true;
      return !!social;
    }

    // ---------------------------------------------------------------- frases
    // Escolhe uma variação evitando as usadas recentemente (anti-repetição).
    _escolher(lista, categoria) {
      if (!lista || !lista.length) return '';
      const usados = this.estado.usados[categoria] || (this.estado.usados[categoria] = []);
      const livres = lista.filter((f) => !usados.includes(f));
      const pool = livres.length ? livres : lista;
      const f = pool[Math.floor(this.aleatorio() * pool.length)];
      usados.push(f);
      const limite = Math.max(1, Math.min(lista.length - 1, Math.ceil(lista.length * 0.7)));
      while (usados.length > limite) usados.shift();
      return f;
    }

    _frase(chave, ctx) {
      const banco = FRASES[chave];
      if (!banco) return '';
      let lista = banco;
      if (!Array.isArray(banco)) {
        const reg = this._regAtual || 'neutro';
        lista = banco[reg] || banco.neutro || Object.values(banco)[0];
        if (reg !== 'neutro' && banco.neutro && banco[reg] && this.aleatorio() < 0.25) lista = banco.neutro;
      }
      return this._preencher(this._escolher(lista, chave), ctx || {});
    }

    _usarNome(ctx) {
      const nome = this.memoria.perfil.nome;
      const est = this.estado;
      if (!nome) return false;
      if (!ctx.forcarNome && est.turno - est.ultimoNome < 3) return false;
      const prob = ctx.forcarNome ? 1 : est.turno === 0 ? 0.8 : 0.35;
      if (this.aleatorio() >= prob) return false;
      est.ultimoNome = est.turno;
      return true;
    }

    _temas() {
      const lista = this.base.tamanho ? this.base.temas(5) : this.opcoes.temasPadrao;
      return juntarLista(lista.map((x) => (/^[A-Z0-9]{2,}/.test(x) ? x : x.charAt(0).toLowerCase() + x.slice(1))));
    }

    _preencher(frase, ctx) {
      ctx = ctx || {};
      const agora = this._agora();
      const h = agora.getHours();
      const saud = (this._uAtual && this._uAtual.saudacaoUsuario) || (h >= 5 && h < 12 ? 'bom dia' : h >= 12 && h < 18 ? 'boa tarde' : 'boa noite');
      let s = String(frase)
        .replace(/\{,nome\}/g, () => (this._usarNome(ctx) ? ', ' + this.memoria.perfil.nome : ''))
        .replace(/\{nome\}/g, () => ctx.nome || this.memoria.perfil.nome || '')
        .replace(/\{Saudacao\}/g, capitalizar(saud))
        .replace(/\{saudacao\}/g, saud)
        .replace(/\{assistente\}/g, this.opcoes.nome)
        .replace(/\{produto\}/g, this.opcoes.produto)
        .replace(/\{temas\}/g, () => this._temas())
        .replace(/\{tema\}/g, ctx.tema || '')
        .replace(/\{a_tema\}/g, ctx.tema ? contrair('a', ctx.tema) : '')
        .replace(/\{titulo\}/g, ctx.titulo || '')
        .replace(/\{rel\}/g, ctx.rel || '')
        .replace(/\{opcoes\}/g, ctx.opcoes || '')
        .replace(/\{papel\}/g, ctx.papel || this.memoria.perfil.papel || '')
        .replace(/\{hora\}/g, () => agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        .replace(/\{data\}/g, () => agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
      s = this._emojiOk ? limitarEmojis(s, 1) : removerEmojis(s);
      return s;
    }

    _listaOpcoes(titulos) {
      return '\n• ' + titulos.map((t) => '“' + t + '”').join('\n• ');
    }

    // Pergunta com opções; com uma opção só, pergunta direto ("Você quis dizer X?").
    _fraseOpcoes(chave, opcoes) {
      if (opcoes.length === 1) return this._frase('uma_opcao', { opcoes: '“' + opcoes[0].titulo + '”' });
      return this._frase(chave, { opcoes: this._listaOpcoes(opcoes.map((o) => o.titulo)) });
    }

    // Monta [prefixos + abertura] + corpo + fechamento, em texto ou HTML.
    _montar(antes, corpo, depois, html) {
      const nl = html ? '<br>' : '\n';
      const conv = (s) => (html ? s.replace(/\n/g, '<br>') : s);
      const pre = antes.filter(Boolean).map(conv);
      corpo = corpo || '';
      let texto = corpo;
      if (pre.length) {
        const ultimo = pre[pre.length - 1];
        const cabeca = pre.join(' ');
        const plano = !html || !/^\s*</.test(corpo);
        const lista = /^\s*(?:•|-|\d+[.)])/.test(corpo);
        if (!corpo) texto = cabeca;
        else if (/:$/.test(ultimo)) texto = cabeca + nl + corpo;
        else if (/,$/.test(ultimo) && plano) texto = cabeca + ' ' + corpo.replace(/^([A-ZÀ-Ú])(?=[a-zà-ú])/, (c) => c.toLowerCase());
        else if (plano && !lista && ultimo.length < 70) texto = cabeca + ' ' + corpo;
        else texto = cabeca + nl + nl + corpo;
      }
      if (depois) texto += (texto ? nl + nl : '') + conv(depois);
      return texto.trim();
    }

    _prefixos(u) {
      const pre = [];
      if (temIntencao(u, 'insatisfacao', 0.8)) pre.push(this._frase('desculpa'));
      else if (u.frustracao >= 0.5) pre.push(this._frase('frustrado'));
      if (u.apresentacao && u.apresentacao.nome) pre.push(this._frase('apresentacao_curta', { nome: u.apresentacao.nome }));
      else if (temIntencao(u, 'saudacao', 0.6) && !pre.length) pre.push(this._frase('saudacao_curta'));
      if (temIntencao(u, 'como_vai', 0.7)) pre.push(this._frase('como_vai_curto'));
      else if (temIntencao(u, 'agradecimento', 0.8) && pre.length < 2) pre.push(this._frase('agradecimento_curto'));
      Object.keys(u.preferencias).forEach((k) => {
        const v = u.preferencias[k];
        const chave = k === 'verbosidade' || k === 'tom' ? v : k === 'emoji' ? (v ? 'com_emoji' : 'sem_emoji') : 'simples';
        pre.push(this._preencher(this._escolher(FRASES.preferencia[chave], 'pref:' + chave), {}));
      });
      if (u.urgencia >= 0.7 && u.urgencia < 1) pre.push(this._frase('urgente'));
      return pre.slice(0, 3);
    }

    _abertura(u, ctx) {
      const reg = this._regAtual || 'neutro';
      const prob = ctx.repetida ? 1 : ctx.temPrefixo ? 0.3 : reg === 'tecnico' ? 0.35 : 0.7;
      if (this.aleatorio() >= prob) return '';
      if (/^\s*(?:<[^>]+>\s*)*(?:ol[aá]|oi|claro|certo|sim|n[aã]o|bom dia|boa tarde|boa noite)\b/i.test(ctx.corpo || '')) return '';
      const comTema = (lista) => lista.filter((f) => ctx.tema || !/\{(?:a_)?tema\}/.test(f));
      let lista = null;
      if (ctx.repetida) lista = ABERTURAS.repetida;
      else if (u.continuacao && ctx.tema && this.aleatorio() < 0.6) lista = comTema(ABERTURAS.continuacao);
      else if (u.foco && ABERTURAS[u.foco.tipo] && this.aleatorio() < 0.45) lista = comTema(ABERTURAS[u.foco.tipo]);
      if (!lista || !lista.length) lista = comTema(ABERTURAS.geral[reg] || ABERTURAS.geral.neutro);
      return this._preencher(this._escolher(lista, 'abertura'), { tema: ctx.tema });
    }

    _fechamento(u, e, ctx) {
      const est = this.estado;
      const reg = this._regAtual || 'neutro';
      if (ctx.corpo && /\?\s*(?:<[^>]+>\s*)*$/.test(ctx.corpo)) return null;
      const recente = est.turno - est.ultimoFechamento <= 1;
      const curto = this.memoria.perfil.verbosidade === 'curto' || ctx.modo === 'curto';
      const r = this.aleatorio();
      let escolha = null;
      if (e && ctx.parcial && r < 0.75) {
        escolha = { f: this._escolher(FECHAMENTOS.completo, 'fechamento'), ag: { tipo: 'oferta', acao: 'completo', id: e.id } };
      } else if (e && e.detalhes && ctx.modo !== 'detalhado' && r < (curto ? 0.3 : 0.55)) {
        escolha = { f: this._escolher(FECHAMENTOS.detalhes, 'fechamento'), ag: { tipo: 'oferta', acao: 'detalhar', id: e.id } };
      } else if (e && e.exemplo && ctx.modo !== 'exemplo' && ctx.modo !== 'detalhado' && r < (curto ? 0.25 : 0.45)) {
        escolha = { f: this._escolher(FECHAMENTOS.exemplo, 'fechamento'), ag: { tipo: 'oferta', acao: 'exemplo', id: e.id } };
      } else if (e && !curto && r < 0.3) {
        const rel = this.base.relacionados(e.id, 1)[0];
        if (rel) escolha = { f: this._escolher(FECHAMENTOS.relacionado, 'fechamento'), rel: '“' + tituloEntrada(rel) + '”', ag: { tipo: 'oferta', acao: 'relacionado', id: rel.id } };
      }
      if (!escolha && !curto && r < (reg === 'tecnico' ? 0.1 : recente ? 0.12 : 0.28)) {
        escolha = { f: this._escolher(FECHAMENTOS.geral[reg] || FECHAMENTOS.geral.neutro, 'fechamento'), ag: null };
      }
      if (!escolha && !curto && reg === 'informal' && r > 0.93) escolha = { f: this._escolher(FECHAMENTOS.seguranca, 'fechamento'), ag: null };
      if (!escolha || (recente && !escolha.ag && this.aleatorio() < 0.5)) return null;
      est.ultimoFechamento = est.turno;
      return { texto: this._preencher(escolha.f, { rel: escolha.rel }), aguardando: escolha.ag };
    }

    // Envolve o conteúdo da resposta com a "camada humana": prefixos, abertura e fechamento.
    _embalar(u, corpo, info) {
      const est = this.estado;
      const e = info.entrada || null;
      const html = this.opcoes.formato === 'html' || (this.opcoes.formato === 'auto' && /<\/?[a-z][^>]*>/i.test(corpo));
      const tema = fraseTema(u.quadro);
      const repetida = !info.hesitante && !info.confirmar && !info.parcial && !!est.ultima && est.ultima.entradaId === info.id && est.turno - est.ultima.turno <= 5;
      if (repetida && !html) corpo = emTopicos(corpo);
      const pre = info.prefixos || this._prefixos(u);
      let abertura = '';
      if (info.hesitante) abertura = this._preencher(this._escolher(FRASES.hesitacao, 'hesitacao'), { titulo: e ? '“' + tituloEntrada(e) + '”' : tema || 'isso' });
      else if (!info.semAbertura) abertura = this._abertura(u, { tema, repetida, temPrefixo: pre.length > 0, corpo });
      const fech = info.hesitante || info.confirmar
        ? { texto: this._frase('confirmar_acerto'), aguardando: { tipo: 'confirmar_acerto' } }
        : this._fechamento(u, e, { corpo, modo: info.modo, parcial: info.parcial });
      return {
        texto: this._montar(pre.concat(abertura), corpo, fech ? fech.texto : '', html),
        corpo,
        parcial: !!info.parcial,
        fonte: info.fonte || 'base',
        entrada: e,
        entradaId: info.id,
        confianca: info.confianca == null ? 1 : info.confianca,
        assinatura: info.assinatura,
        candidatos: info.candidatos,
        aguardando: fech ? fech.aguardando : null,
        tema,
        emocao: info.emocao || (info.hesitante ? 'curiosa' : u.surpresa ? 'surpresa' : 'neutra'),
        gesto: info.gesto || (info.hesitante ? 'inclinar' : 'sim')
      };
    }

    // -------------------------------------------------------------- executar
    _buscar(quadro, assinatura) {
      const pesos = new Map();
      quadro.conteudo.forEach((c) => pesos.set(c.radical, Math.max(pesos.get(c.radical) || 0, c.peso || 1)));
      const aprendido = assinatura ? this.memoria.aprendido(assinatura) : null;
      return this.base.buscar({
        radicais: [...pesos].map(([radical, peso]) => ({ radical, peso })),
        entidades: quadro.entidades,
        foco: quadro.foco,
        aprendido: aprendido ? aprendido.id : null,
        rejeitados: assinatura ? this.memoria.rejeitados(assinatura) : []
      }, 6);
    }

    _responderEntrada(u, cand, info) {
      info = info || {};
      const e = cand.entrada;
      const p = this.memoria.perfil;
      let modo = 'normal';
      if (temIntencao(u, 'resumo', 0.6) || p.verbosidade === 'curto' || p.simples) modo = 'curto';
      if (temIntencao(u, 'detalhar', 0.6) || p.verbosidade === 'detalhado') modo = 'detalhado';
      if (temIntencao(u, 'exemplo', 0.6) && e.exemplo) modo = 'exemplo';
      let corpo = this._aplicarModo(this._textoResposta(e, u), e, modo);
      let parcial = false;
      const ult = this.estado.ultima;
      // Repetiu a mesma pergunta depois de um trecho: agora mostra tudo.
      const insistiu = !!ult && ult.parcial && ult.entradaId === e.id && ult.assinatura === info.assinatura && this.estado.turno - ult.turno <= 3;
      if (insistiu) info = Object.assign({ prefixos: this._prefixos(u).concat(this._frase('completo_intro')), semAbertura: true }, info);
      // Pergunta específica (prazo, quantidade, responsável): responde exatamente isso.
      if ((modo === 'normal' || modo === 'curto') && !info.hesitante && !info.confirmar && !insistiu) {
        const doc = this.base.porId.get(e.id);
        const principais = new Set();
        if (doc) doc.padroes.slice(-2).forEach((s) => s.forEach((r) => principais.add(r)));
        const trecho = trechoRelevante(this._textoResposta(e, u), u.quadro, principais);
        if (trecho) {
          corpo = this._sujeitoExplicito(trecho, u.quadro, doc);
          parcial = true;
        }
      }
      return this._embalar(u, corpo, Object.assign({ entrada: e, id: e.id, confianca: cand.confianca, modo, parcial }, info));
    }

    // "Ela deve ser feita…" → "A APR deve ser feita…" quando o trecho começa com pronome.
    _sujeitoExplicito(trecho, quadro, doc) {
      const m = /^(Ela|Ele|Elas|Eles)\b/.exec(trecho);
      if (!m) return trecho;
      const ent = quadro.entidades.find((x) => !x.implicita) || (doc && [...doc.entPrincipais].map(entidadePorId).find(Boolean));
      if (!ent) return trecho;
      return capitalizar(entidadeComArtigo(ent, false)) + trecho.slice(m[0].length);
    }

    _textoResposta(e, u) {
      let r = e.respostas.length > 1 ? this._escolher(e.respostas, 'resposta:' + e.id) : e.respostas[0];
      if (typeof r === 'function') {
        try { r = r(u); } catch (err) { r = ''; }
      }
      return String(r == null ? '' : r).trim();
    }

    _aplicarModo(corpo, e, modo) {
      const sep = /<\/?[a-z][^>]*>/i.test(corpo) ? '<br><br>' : '\n\n';
      if (modo === 'curto') return e.resumo ? String(e.resumo) : resumirTexto(corpo, 280);
      if (modo === 'detalhado') return corpo + (e.detalhes ? sep + e.detalhes : '') + (e.exemplo ? sep + 'Exemplo prático: ' + e.exemplo : '');
      if (modo === 'exemplo') return corpo + sep + 'Exemplo prático: ' + e.exemplo;
      return corpo;
    }

    _consultar(u) {
      const quadro = u.quadro;
      const assinatura = this._assinatura(quadro);
      if (!this.base.tamanho) return this._naoEncontrado(u, [], assinatura);
      const candidatos = this._buscar(quadro, assinatura);
      const [m1, m2] = candidatos;
      const explicitas = quadro.entidades.filter((e) => !e.implicita);
      if (explicitas.length >= 2) {
        const doc = m1 && this.base.porId.get(m1.entrada.id);
        if (!m1 || m1.confianca < 0.75 || !explicitas.every((e) => doc.entidades.has(e.id))) {
          const composta = this._composta(u, quadro, explicitas, assinatura);
          if (composta) return composta;
        }
      }
      if (!m1 || m1.confianca < this.opcoes.limiarSugestao) {
        // Só sugere temas que tenham relação real com o que foi dito (não apenas uma palavra no meio da resposta).
        const sugestoes = candidatos.filter((c) => c.confianca >= 0.2 && (c.dice > 0 || explicitas.length)).slice(0, 3);
        return this._naoEncontrado(u, sugestoes, assinatura, sugestoes.length ? m1.confianca : 0);
      }
      const ambiguo = m2 && m1.confianca < 0.75 && m2.confianca >= 0.4 && m1.confianca - m2.confianca < 0.08;
      if (ambiguo) return this._clarificar(u, candidatos.filter((c) => c.confianca >= Math.max(0.3, m1.confianca - 0.15)).slice(0, 3), assinatura);
      if (m1.confianca >= this.opcoes.limiarResposta) return this._responderEntrada(u, m1, { assinatura, candidatos });
      const bons = candidatos.filter((c) => c.confianca >= this.opcoes.limiarSugestao);
      if (bons.length >= 2 && bons[1].confianca >= m1.confianca - 0.12) return this._clarificar(u, bons.slice(0, 3), assinatura, true);
      return this._responderEntrada(u, m1, { assinatura, candidatos, hesitante: true });
    }

    // Perguntas compostas: "qual a validade da NR-35 e da NR-10?"
    _composta(u, quadro, explicitas, assinatura) {
      if (explicitas.length > 3) return null;
      const grupo = grupoEntidade(explicitas[0]);
      if (!explicitas.every((e) => grupoEntidade(e) === grupo)) return null;
      const partes = [];
      for (const ent of explicitas) {
        const q = { conteudo: quadro.conteudo.filter((c) => !ehTokenDeEntidade(c.base) || tokenDaEntidade(c.base, ent)), entidades: [ent], foco: quadro.foco };
        const m = this._buscar(q, null)[0];
        if (!m || m.confianca < 0.45 || partes.some((p) => p.m.entrada.id === m.entrada.id)) return null;
        partes.push({ ent, m });
      }
      const textos = partes.map((p) => {
        const completo = this._textoResposta(p.m.entrada, u);
        const doc = this.base.porId.get(p.m.entrada.id);
        const principais = new Set();
        if (doc) doc.padroes.slice(-2).forEach((s) => s.forEach((r) => principais.add(r)));
        const q = { conteudo: quadro.conteudo, foco: quadro.foco, entidades: [p.ent] };
        const trecho = trechoRelevante(completo, q, principais);
        return trecho ? this._sujeitoExplicito(trecho, q, doc) : completo;
      });
      const html = this.opcoes.formato === 'html' || textos.some((t) => /<\/?[a-z][^>]*>/i.test(t));
      const nl = html ? '<br>' : '\n';
      const corpo = partes.map((p, i) => 'Sobre ' + entidadeComArtigo(p.ent, false) + ':' + nl + textos[i]).join(nl + nl);
      return this._embalar(u, corpo, {
        id: partes.map((p) => p.m.entrada.id).join('+'),
        confianca: Math.min.apply(null, partes.map((p) => p.m.confianca)),
        assinatura,
        semAbertura: true
      });
    }

    _clarificar(u, cands, assinatura, sugestao) {
      const opcoes = cands.map((c) => ({ id: c.entrada.id, titulo: tituloEntrada(c.entrada) }));
      const txt = this._fraseOpcoes(sugestao ? 'sugestoes' : 'clarificar', opcoes);
      return {
        texto: this._montar(this._prefixos(u), txt, '', this.opcoes.formato === 'html'),
        fonte: 'clarificacao', emocao: 'curiosa', gesto: 'inclinar', assinatura,
        confianca: cands[0].confianca, candidatos: cands,
        aguardando: { tipo: 'escolha', opcoes, assinatura, quadro: u.quadro }
      };
    }

    _naoEncontrado(u, sugestoes, assinatura, melhorConfianca) {
      const est = this.estado;
      est.pendente = { assinatura, turno: est.turno };
      const html = this.opcoes.formato === 'html';
      // Nada de segurança do trabalho na pergunta: diz com leveza que o assunto foge da área.
      const semTema = !u.quadro.entidades.length && !(melhorConfianca >= 0.15) && !sugestoes.length;
      if (semTema && this.base.tamanho) {
        return {
          texto: this._montar(this._prefixos(u), this._frase('fora_do_escopo'), '', html),
          fonte: 'nao_encontrado', emocao: 'curiosa', gesto: 'inclinar', assinatura, confianca: 0, aguardando: null
        };
      }
      if (sugestoes.length) {
        const opcoes = sugestoes.map((c) => ({ id: c.entrada.id, titulo: tituloEntrada(c.entrada) }));
        return {
          texto: this._montar(this._prefixos(u), this._fraseOpcoes('sugestoes', opcoes), '', html),
          fonte: 'nao_encontrado', emocao: 'curiosa', gesto: 'inclinar', assinatura, confianca: sugestoes[0].confianca,
          aguardando: { tipo: 'escolha', opcoes, assinatura, quadro: u.quadro }
        };
      }
      const nivel = Math.min(3, est.falhas + 1);
      return {
        texto: this._montar(this._prefixos(u), this._frase('nao_encontrado_' + nivel), '', html),
        fonte: 'nao_encontrado', emocao: 'curiosa', gesto: 'inclinar', assinatura, confianca: 0,
        aguardando: { tipo: 'reformular' }
      };
    }

    // O usuário disse que não era isso: registra o erro e tenta outro caminho.
    _reparar(u) {
      const est = this.estado;
      const ult = est.ultima;
      if (ult && ult.assinatura && ult.entradaId) this.memoria.rejeitar(ult.assinatura, ult.entradaId);
      if (ult) est.pendente = { assinatura: ult.assinatura, turno: est.turno };
      const repeticao = /\b(?:de novo|mesma|mesmo|repet\w*|ja (?:disse|falou|respondeu)|sempre)\b/.test(u.expandido);
      const desculpa = this._frase(repeticao ? 'repeticao' : 'desculpa');
      const rejeitados = ult ? this.memoria.rejeitados(ult.assinatura) : [];
      const alternativas = ult && ult.candidatos
        ? ult.candidatos.filter((c) => c.entrada.id !== ult.entradaId && c.confianca >= 0.3 && !rejeitados.includes(c.entrada.id))
        : [];
      if (alternativas.length && !repeticao) {
        const alt = alternativas[0];
        if (alt.confianca >= 0.6) {
          return this._responderEntrada(u, alt, {
            assinatura: ult.assinatura, candidatos: ult.candidatos, prefixos: [desculpa, this._frase('alternativa')],
            semAbertura: true, confirmar: true, emocao: 'empatica', gesto: 'desculpa'
          });
        }
        // Alternativas fracas: pergunta em vez de chutar.
        const opcoes = alternativas.slice(0, 3).map((c) => ({ id: c.entrada.id, titulo: tituloEntrada(c.entrada) }));
        return {
          texto: desculpa + ' ' + this._fraseOpcoes('clarificar', opcoes) + '\n' + this._frase('ou_explique'),
          fonte: 'reparo', emocao: 'empatica', gesto: 'desculpa',
          aguardando: { tipo: 'escolha', opcoes, assinatura: ult.assinatura, quadro: est.quadro }
        };
      }
      const pedido = repeticao && ult && ult.tema ? this._frase('angulos', { tema: ult.tema }) : this._frase('pedir_reformular');
      return { texto: desculpa + ' ' + pedido, fonte: 'reparo', emocao: 'empatica', gesto: 'desculpa', aguardando: { tipo: 'reformular' } };
    }

    _seguimento(u, acao, id) {
      const est = this.estado;
      if (acao === 'relacionado' && id) {
        const doc = this.base.porId.get(id);
        if (doc) return this._responderEntrada(u, { entrada: doc.entrada, confianca: 0.85 }, { assinatura: null });
      }
      const ult = est.ultima;
      if (!ult) return { texto: this._frase('nada_antes'), fonte: 'social', emocao: 'curiosa', gesto: 'inclinar', aguardando: { tipo: 'reformular' } };
      const doc = id ? this.base.porId.get(id) : null;
      const e = doc ? doc.entrada : ult.entrada;
      const html = /<\/?[a-z][^>]*>/i.test(ult.corpo || '') || this.opcoes.formato === 'html';
      const base = {
        fonte: 'seguimento', entrada: e, entradaId: ult.entradaId, assinatura: ult.assinatura, candidatos: ult.candidatos,
        tema: ult.tema, corpo: ult.corpo, confianca: ult.confianca, emocao: 'neutra', gesto: 'sim'
      };
      const montar = (intro, corpo, depois, aguardando) => Object.assign({}, base, { texto: this._montar([intro], corpo, depois || '', html), aguardando: aguardando || null });
      switch (acao) {
        case 'completo':
          if (e) return Object.assign(montar(this._frase('completo_intro'), this._textoResposta(e, u)), { corpo: this._textoResposta(e, u) });
          return montar('', ult.corpo);
        case 'detalhar': {
          if (e && e.detalhes) {
            const oferta = e.exemplo ? this._preencher(this._escolher(FECHAMENTOS.exemplo, 'fechamento'), {}) : '';
            return montar(this._frase('detalhar'), String(e.detalhes), oferta, e.exemplo ? { tipo: 'oferta', acao: 'exemplo', id: e.id } : null);
          }
          const rel = e ? this.base.relacionados(e.id, 3) : [];
          if (rel.length) {
            const opcoes = rel.map((r) => ({ id: r.id, titulo: tituloEntrada(r) }));
            return montar(this._frase('relacionados_intro'), this._listaOpcoes(opcoes.map((o) => o.titulo)).trim(), '', { tipo: 'escolha', opcoes, quadro: est.quadro });
          }
          return montar('', this._frase('sem_detalhes'), '', { tipo: 'reformular' });
        }
        case 'exemplo':
          if (e && e.exemplo) return montar(this._frase('exemplo'), String(e.exemplo));
          return montar('', this._frase('sem_exemplo'), '', { tipo: 'reformular' });
        case 'resumo':
          return montar(this._frase('resumo'), e && e.resumo ? String(e.resumo) : resumirTexto(ult.corpo, 220));
        case 'esclarecer':
          return montar(this._frase('esclarecer'), e && e.resumo ? String(e.resumo) : emTopicos(resumirTexto(ult.corpo, 420)), this._frase('ficou_claro'), { tipo: 'confirmar_entendimento' });
        case 'repetir':
          return montar(this._frase('repetir'), ult.corpo);
        default:
          return montar('', ult.corpo);
      }
    }

    _social(u, intencao) {
      const est = this.estado;
      const f = (k, ctx) => this._frase(k, ctx);
      const r = (texto, emocao, gesto, aguardando) => ({
        texto: this._emojiOk ? limitarEmojis(texto, 1) : removerEmojis(texto),
        fonte: 'social', emocao: emocao || 'feliz', gesto: gesto || null, aguardando: aguardando || null
      });
      const fechamentoSocial = () => this._preencher(this._escolher(FECHAMENTOS.geral[this._regAtual] || FECHAMENTOS.geral.neutro, 'fechamento'), {});
      switch (intencao) {
        case 'saudacao':
          if (temIntencao(u, 'como_vai', 0.5)) return r(f('saudacao_curta') + ' ' + f('como_vai'), 'feliz', 'aceno', { tipo: 'estado_usuario' });
          if (est.turno === 0 && this._retorno) return r(f('saudacao_retorno'), 'feliz', 'aceno');
          return r(f('saudacao'), 'feliz', 'aceno');
        case 'como_vai':
          return r(f('como_vai'), 'feliz', 'sim', { tipo: 'estado_usuario' });
        case 'estado_positivo':
          return r(f(temIntencao(u, 'como_vai', 0.6) ? 'estado_positivo_reciproco' : 'estado_positivo'), 'feliz', 'sim');
        case 'estado_negativo': {
          let t = f('estado_negativo');
          if (/\b(?:cansad\w*|exaust\w*|esgotad\w*|sono)\b/.test(u.expandido)) t += ' ' + f('cansaco');
          return r(t, 'empatica', null);
        }
        case 'agradecimento': {
          let t = f('agradecimento');
          if (temIntencao(u, 'despedida', 0.8)) t += ' ' + f('despedida');
          else if (this.aleatorio() < 0.25) t += ' ' + fechamentoSocial();
          return r(t, 'feliz', 'sorriso');
        }
        case 'elogio':
          return r(f('elogio'), 'feliz', 'sorriso');
        case 'despedida': {
          const h = this._agora().getHours();
          return r((h >= 18 || h < 5) && this.aleatorio() < 0.5 ? f('despedida_noite') : f('despedida'), 'feliz', 'aceno');
        }
        case 'identidade':
          if (/\bvoce (?:e|eh) (?:um |uma )?(?:robo|bot|humana|humano|pessoa|maquina|real|de verdade|gente|ia|inteligencia artificial|programa)\b/.test(u.expandido)) return r(f('humana'), 'feliz', 'sorriso');
          if (/\b(?:criou|fez|desenvolveu|programou)\b/.test(u.expandido)) return r(f('criador'), 'feliz', 'sorriso');
          return r(f('identidade'), 'feliz', 'aceno');
        case 'capacidades': return r(f('capacidades'), 'feliz', 'sim');
        case 'ajuda': return r(f('ajuda'), 'neutra', 'sim');
        case 'confirmacao': return r(f('confirmacao'), 'feliz', 'sim');
        case 'negacao': return r(f('negacao'), 'neutra', null);
        case 'entendimento_ok': return r(f('entendimento_ok'), 'feliz', 'sim');
        case 'piada': return r(f('piada'), 'feliz', 'riso');
        case 'horario': return r(f('horario') + (this.aleatorio() < 0.35 ? this._preencher(FRASES.pausa[0], {}) : ''), 'neutra', null);
        case 'data': return r(f('data'), 'neutra', null);
        case 'clima': return r(f('clima'), 'neutra', null);
        case 'sobre_ia': return r(f('sobre_ia'), 'feliz', 'sorriso');
        case 'flerte': return r(f('flerte'), 'feliz', 'sorriso');
        case 'teste': return r(f('teste'), 'feliz', 'aceno');
        case 'riso': return r(f('riso') + (this.aleatorio() < 0.4 ? ' ' + fechamentoSocial() : ''), 'feliz', 'riso');
        case 'frustracao': return r(f('frustrado') + ' ' + f('pedir_reformular'), 'empatica', 'desculpa', { tipo: 'reformular' });
        case 'insatisfacao': return this._reparar(u);
        case 'apresentacao': {
          let t = f('apresentacao', { nome: u.apresentacao.nome });
          if (u.apresentacao.papel) t += ' ' + f('papel', { papel: u.apresentacao.papel });
          return r(t, 'feliz', 'aceno');
        }
        case 'papel': return r(f('papel', { papel: u.apresentacao.papel }) + ' ' + f('ajuda'), 'feliz', 'sim');
        case 'preferencia': return r(this._prefixos(u).join(' ') || f('confirmacao'), 'feliz', 'sim');
        default: return r(f('desconhecido'), 'curiosa', 'inclinar');
      }
    }

    _emergencia(u) {
      const nl = this.opcoes.formato === 'html' ? '<br>' : '\n';
      const linhas = [
        '⚠️ Se houver risco à vida, ligue agora: SAMU 192 · Bombeiros 193.',
        '',
        '1. Mantenha a calma e garanta a sua própria segurança.',
        '2. ' + PASSOS_EMERGENCIA[u.emergencia || 'geral'],
        '3. Acione a brigada/equipe de emergência da unidade e avise a liderança.',
        '',
        'Estou aqui com você. Assim que a situação estiver sob controle, me conte o que aconteceu que eu te ajudo com os próximos passos (como a CAT e a investigação).'
      ];
      if (u.urgencia < 1) linhas.push('', 'Se não for uma emergência, me diga com calma como posso ajudar.');
      return { texto: linhas.join(nl), fonte: 'emergencia', emocao: 'preocupada', gesto: null, aguardando: null };
    }

    _executar(plano, u) {
      switch (plano.tipo) {
        case 'emergencia': return this._emergencia(u);
        case 'reparo': return this._reparar(u);
        case 'escolha': {
          const doc = this.base.porId.get(plano.id);
          if (!doc) break;
          if (plano.assinatura && this.opcoes.aprender !== false) this.memoria.aprender(plano.assinatura, { id: plano.id });
          return this._responderEntrada(u, { entrada: doc.entrada, confianca: 0.9 }, { assinatura: plano.assinatura });
        }
        case 'seguimento': return this._seguimento(u, plano.acao, plano.id);
        case 'consulta': return this._consultar(u);
        case 'social': return this._social(u, plano.intencao);
        default: break;
      }
      return { texto: this._frase('desconhecido'), fonte: 'social', emocao: 'curiosa', gesto: 'inclinar', aguardando: null };
    }

    _preparar(u) {
      this._feedback(u);
      this._atualizarPerfil(u);
      const plano = this._planejar(u);
      this._uAtual = u;
      this._regAtual = this._registroEfetivo(u);
      this._emojiOk = this._emojisPermitidos(u, plano.tipo === 'social');
      return plano;
    }

    // Motor externo em duas etapas (síncronas) — permite envolver funções síncronas ou assíncronas.
    _prepararMotor(u) {
      const est = this.estado;
      const assinatura = this._assinatura(u.quadro);
      if (this.base.tamanho) {
        const pendente = est.pendente;
        const interno = this._consultar(u);
        if (interno.fonte === 'base' && interno.confianca >= 0.6) return { interno, assinatura, pergunta: u.consulta };
        est.pendente = pendente;
      }
      const aprendido = this.memoria.aprendido(assinatura);
      const pergunta = aprendido && aprendido.consulta && /^motor:/.test(String(aprendido.id)) ? aprendido.consulta : u.consulta;
      return { interno: null, assinatura, pergunta };
    }

    _concluirMotor(u, bruto, assinatura) {
      const est = this.estado;
      const texto = extrairTextoResposta(bruto);
      const repetida = !!texto && !!est.ultima && est.ultima.corpo === texto && est.ultima.assinatura !== assinatura && est.turno - est.ultima.turno <= 3;
      if (!texto || ehRespostaPadrao(texto) || repetida) return this._naoEncontrado(u, [], assinatura);
      return this._embalar(u, texto, { id: 'motor:' + hashTexto(texto), assinatura, fonte: 'motor', confianca: 0.7 });
    }

    async _consultarMotor(u, motor) {
      const prep = this._prepararMotor(u);
      if (prep.interno) return prep.interno;
      let bruto = null;
      try { bruto = await motor(prep.pergunta, u); } catch (err) { bruto = null; }
      return this._concluirMotor(u, bruto, prep.assinatura);
    }

    _finalizar(u, plano, saida) {
      const est = this.estado;
      if (saida.fonte === 'base' || saida.fonte === 'motor') {
        est.ultima = {
          entradaId: saida.entradaId, entrada: saida.entrada, corpo: saida.corpo, assinatura: saida.assinatura,
          candidatos: saida.candidatos || [], turno: est.turno, tema: saida.tema, confianca: saida.confianca,
          consulta: u.consulta, parcial: !!saida.parcial
        };
        est.falhas = 0;
      } else if (saida.fonte === 'nao_encontrado') {
        est.falhas++;
      }
      if (plano.tipo === 'consulta') est.quadro = u.quadro;
      else if (plano.tipo === 'escolha' && est.aguardando && est.aguardando.quadro) est.quadro = Object.assign({}, est.aguardando.quadro, { t: Date.now(), turno: est.turno });
      if (saida.entrada && est.quadro && (plano.tipo === 'consulta' || plano.tipo === 'escolha')) {
        const doc = this.base.porId.get(saida.entrada.id);
        if (doc) {
          doc.entPrincipais.forEach((id) => {
            if (est.quadro.entidades.some((e) => e.id === id)) return;
            const ent = entidadePorId(id);
            if (ent) est.quadro.entidades.push(Object.assign(ent, { implicita: true, herdada: true }));
          });
        }
      }
      est.aguardando = saida.aguardando ? Object.assign({ turno: est.turno + 1 }, saida.aguardando) : null;
      est.historico.push({ papel: 'usuario', texto: u.texto }, { papel: 'aurora', texto: saida.texto, fonte: saida.fonte });
      if (est.historico.length > 40) est.historico.splice(0, est.historico.length - 40);
      est.turno++;
      this.memoria.salvar();
      return {
        texto: saida.texto,
        emocao: saida.emocao || 'neutra',
        gesto: saida.gesto || null,
        fonte: saida.fonte,
        entradaId: saida.entradaId || null,
        confianca: saida.confianca == null ? null : Math.round(saida.confianca * 100) / 100,
        sugestoes: saida.aguardando && saida.aguardando.opcoes ? saida.aguardando.opcoes.map((o) => o.titulo) : [],
        entendimento: u,
        resumo: this._resumoEntendimento(u, plano, saida)
      };
    }

    _resumoEntendimento(u, plano, saida) {
      const partes = [];
      const focos = { prazo: 'prazo/validade', definicao: 'definição', procedimento: 'como fazer', requisito: 'exigência', responsavel: 'responsável', motivo: 'motivo', local: 'local', quantidade: 'quantidade', lista: 'lista', comparacao: 'comparação', opiniao: 'recomendação' };
      if (plano.tipo === 'consulta') partes.push('pergunta' + (u.quadro.foco ? ' sobre ' + focos[u.quadro.foco.tipo] : ''));
      else if (plano.tipo === 'social') partes.push(plano.intencao.replace(/_/g, ' '));
      else partes.push(plano.tipo + (plano.acao ? ' (' + plano.acao + ')' : ''));
      if (u.continuacao) partes.push('continuação do assunto');
      const ents = u.quadro.entidades.filter((e) => !e.implicita || e.herdada).map((e) => e.rotulo);
      if (ents.length) partes.push(ents.join(', '));
      partes.push('tom ' + (this._regAtual || u.registro));
      if (u.sentimento !== 'neutro') partes.push('sentimento ' + u.sentimento);
      if (u.correcoes.length) partes.push('corrigi ' + u.correcoes.map((c) => c.de + '→' + c.para).join(', '));
      if ((saida.fonte === 'base' || saida.fonte === 'clarificacao') && saida.confianca != null) partes.push('confiança ' + Math.round(saida.confianca * 100) + '%');
      return partes.join(' · ');
    }

    // --------------------------------------------------------- API pública
    responder(texto) {
      const u = this.entender(texto);
      const plano = this._preparar(u);
      return this._finalizar(u, plano, this._executar(plano, u));
    }

    // Usa o motor de respostas já existente no app: motor(consultaLimpa, entendimento) → texto.
    async processar(texto, motor) {
      const u = this.entender(texto);
      const plano = this._preparar(u);
      const saida = plano.tipo === 'consulta' && typeof motor === 'function' ? await this._consultarMotor(u, motor) : this._executar(plano, u);
      return this._finalizar(u, plano, saida);
    }

    // Só a "camada humana" sobre uma resposta pronta (sem alterar o contexto da conversa).
    humanizar(resposta, entendimento) {
      const u = entendimento && entendimento.intencoes ? entendimento : this.entender(String(entendimento || ''));
      this._uAtual = u;
      this._regAtual = this._registroEfetivo(u);
      this._emojiOk = this._emojisPermitidos(u, false);
      return this._embalar(u, String(resposta), { id: 'externo:' + hashTexto(String(resposta)), fonte: 'motor' }).texto;
    }

    // Consulta limpa (corrigida, sem gírias e com o contexto retomado) para motores de busca por palavra-chave.
    reescrever(texto) {
      return this.entender(texto).consulta;
    }

    // Envolve a função de resposta que o app já tem: ela passa a receber a pergunta já
    // entendida e o texto devolvido ganha a camada humana. Mantém o tipo de retorno
    // (texto ou Promise). Se a função não devolver texto, o retorno segue intocado.
    envolver(funcao, aoResponder) {
      const nlu = this;
      if (typeof funcao !== 'function' || funcao.__aurora) return funcao;
      const envolvida = function (texto) {
        if (typeof texto !== 'string' || !texto.trim()) return funcao.apply(this, arguments);
        const resto = Array.prototype.slice.call(arguments, 1);
        const u = nlu.entender(texto);
        const plano = nlu._preparar(u);
        const prep = plano.tipo === 'consulta' ? nlu._prepararMotor(u) : { interno: null, assinatura: null, pergunta: u.consulta };
        const concluir = (bruto) => {
          if (typeof bruto !== 'string') {
            nlu._finalizar(u, plano, { texto: '', fonte: 'externo', emocao: 'neutra' });
            return bruto;
          }
          let saida;
          if (plano.tipo !== 'consulta') saida = nlu._executar(plano, u);
          else if (prep.interno) saida = prep.interno;
          else saida = nlu._concluirMotor(u, bruto, prep.assinatura);
          const r = nlu._finalizar(u, plano, saida);
          if (typeof aoResponder === 'function') {
            try { aoResponder(r); } catch (err) { /* não interrompe o app */ }
          }
          return r.texto;
        };
        const bruto = funcao.apply(this, [prep.pergunta].concat(resto));
        return bruto && typeof bruto.then === 'function' ? bruto.then(concluir) : concluir(bruto);
      };
      envolvida.__aurora = true;
      envolvida.original = funcao;
      return envolvida;
    }
  }

  function entidadePorId(id) {
    const nr = /^NR-(\d+)$/.exec(id);
    if (nr) {
      const num = parseInt(nr[1], 10);
      return { tipo: 'nr', id, num, rotulo: id, nome: NRS[num] || null, genero: 'f' };
    }
    const t = TERMOS.find((x) => x.id === id);
    return t ? { tipo: 'termo', id, rotulo: t.rotulo, nome: t.nome, genero: t.genero, nr: t.nr || null } : null;
  }

  Object.assign(FRASES, {
    relacionados_intro: ['Esse é o principal que tenho sobre o assunto. Posso aprofundar em temas relacionados:', 'Sobre isso, é o essencial. Mas posso te explicar também:'],
    completo_intro: ['Claro! Aqui está a explicação completa:', 'Aqui vai o texto completo:', 'Com certeza, segue tudo:'],
    ou_explique: ['Ou, se preferir, me explica com outras palavras.', 'Se não for isso, me conta de outro jeito.'],
    uma_opcao: ['Você quis dizer {opcoes}?', 'Seria sobre {opcoes}?', 'Você está falando de {opcoes}?'],
    fora_do_escopo: ['Esse assunto foge da minha área — sou especializada em segurança do trabalho. 😊 Posso te ajudar com {temas}.', 'Hmm, isso está fora do que eu sei. Meu forte é segurança do trabalho: {temas}. Quer perguntar algo sobre isso?'],
    estado_positivo_reciproco: ['Que bom! Por aqui também está tudo ótimo. 😊 Em que posso te ajudar?', 'Aí sim! Por aqui tudo certo também. Bora lá, o que você precisa?', 'Que ótimo! Eu também estou bem, obrigada. No que posso ajudar?']
  });

  let lexicoPadrao = null;
  function analisar(texto) {
    if (!lexicoPadrao) lexicoPadrao = criarLexico();
    const a = analisarTexto(texto, lexicoPadrao, {});
    return Object.assign(a, { entidades: detectarEntidades(a.expandido) });
  }

  return {
    versao: VERSAO,
    Aurora,
    criar: (opcoes) => new Aurora(opcoes),
    util: { semAcentos, radical, distancia, analisar, detectarEntidades, resumirTexto, emTopicos, htmlParaTexto, ehRespostaPadrao }
  };
});

