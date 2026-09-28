/*!
 * Base de conhecimento de EXEMPLO — usada na demonstração e nos testes da Aurora.
 * No OPS 360°, carregue a base real com: Aurora.carregarBase(suaBase)
 *
 * Campos aceitos (use os que já existirem na sua base; nomes em inglês também servem):
 *   id, titulo, categoria, perguntas[], palavras[], resposta (texto ou lista de variações),
 *   resumo, detalhes, exemplo, relacionados[]
 */
(function (raiz) {
  'use strict';

  const BASE = [
    {
      id: 'nr35-o-que-e',
      titulo: 'NR-35 — Trabalho em altura',
      categoria: 'Trabalho em altura',
      perguntas: ['o que é a NR-35?', 'o que diz a NR 35', 'o que é trabalho em altura', 'a partir de quantos metros é trabalho em altura', 'qual altura é considerada trabalho em altura'],
      palavras: ['NR-35', 'trabalho em altura', 'altura', 'queda', '2 metros'],
      resposta: 'A NR-35 estabelece os requisitos mínimos e as medidas de proteção para o trabalho em altura. É considerado trabalho em altura toda atividade executada acima de 2,00 m do nível inferior, onde haja risco de queda. A norma envolve o planejamento, a organização e a execução da atividade, com análise de risco, capacitação dos trabalhadores e sistemas de proteção contra quedas.',
      resumo: 'Trabalho em altura é toda atividade acima de 2 m do nível inferior com risco de queda — e a NR-35 define como planejar, capacitar e proteger quem faz esse trabalho.',
      detalhes: 'Pontos-chave da NR-35: a empresa deve garantir a análise de risco e, para atividades não rotineiras, a permissão de trabalho (PT); o trabalhador precisa estar capacitado e ter a aptidão para trabalho em altura registrada no ASO; e as medidas seguem uma hierarquia — primeiro evitar o trabalho em altura, depois eliminar o risco de queda e, por último, minimizar as consequências da queda (como com o sistema de proteção individual contra quedas).',
      exemplo: 'Troca de lâmpadas em um galpão usando plataforma elevatória a 6 m: é trabalho em altura — exige análise de risco, trabalhador capacitado, cinto paraquedista conectado a um ponto de ancoragem e área isolada embaixo.',
      relacionados: ['nr35-treinamento', 'nr35-epi']
    },
    {
      id: 'nr35-treinamento',
      titulo: 'Treinamento de NR-35 (carga horária e validade)',
      categoria: 'Trabalho em altura',
      perguntas: ['qual a validade do treinamento de NR-35', 'de quanto em quanto tempo tem reciclagem da NR 35', 'quantas horas tem o curso de trabalho em altura', 'o treinamento de altura vence quando', 'carga horária da NR35', 'reciclagem NR35'],
      palavras: ['treinamento', 'curso', 'reciclagem', 'validade', 'carga horária', 'NR-35', 'periodicidade'],
      resposta: 'O treinamento inicial de NR-35 tem carga horária mínima de 8 horas, com parte teórica e prática. A reciclagem (treinamento periódico) deve ser feita a cada 2 anos, também com no mínimo 8 horas. Além disso, é obrigatório um treinamento eventual quando houver mudança nos procedimentos ou nas condições de trabalho, evento que indique a necessidade de novo treinamento, retorno de afastamento superior a 90 dias ou mudança de empresa.',
      resumo: 'Inicial: 8 h. Reciclagem: a cada 2 anos (mínimo de 8 h). Treinamento eventual em mudanças, afastamento acima de 90 dias ou troca de empresa.',
      relacionados: ['nr35-o-que-e', 'nr35-epi']
    },
    {
      id: 'nr35-epi',
      titulo: 'EPIs para trabalho em altura',
      categoria: 'Trabalho em altura',
      perguntas: ['quais EPIs usar em trabalho em altura', 'que equipamento preciso para trabalhar em altura', 'cinto paraquedista é obrigatório', 'o que é talabarte', 'onde prender o cinto'],
      palavras: ['cinto paraquedista', 'cinturão', 'talabarte', 'trava-quedas', 'ancoragem', 'linha de vida', 'capacete', 'altura'],
      resposta: 'No trabalho em altura, o sistema de proteção individual contra quedas normalmente inclui: cinturão de segurança tipo paraquedista, talabarte (com absorvedor de energia quando necessário) ou trava-quedas, conectado a um ponto de ancoragem ou linha de vida adequados. Complementam o conjunto o capacete com jugular e os demais EPIs exigidos pela análise de risco. Todos devem ter CA válido e ser inspecionados antes do uso.',
      exemplo: 'Antes de subir no andaime, o trabalhador inspeciona o cinturão e o talabarte (costuras, fivelas e mosquetões), confirma o ponto de ancoragem indicado na análise de risco e só então se conecta — permanecendo conectado durante todo o tempo de exposição ao risco de queda.',
      relacionados: ['nr35-o-que-e', 'nr6-epi']
    },
    {
      id: 'nr10-o-que-e',
      titulo: 'NR-10 — Segurança em eletricidade',
      categoria: 'Eletricidade',
      perguntas: ['o que é a NR10', 'o que a NR 10 exige', 'quem pode trabalhar com eletricidade', 'o que é trabalhador autorizado na NR10', 'qualificado habilitado capacitado autorizado'],
      palavras: ['NR-10', 'eletricidade', 'elétrica', 'instalações elétricas', 'autorizado', 'qualificado', 'habilitado', 'capacitado'],
      resposta: 'A NR-10 estabelece os requisitos e as condições mínimas para garantir a segurança de quem trabalha, direta ou indiretamente, com instalações e serviços em eletricidade. Só podem intervir em instalações elétricas trabalhadores autorizados — qualificados, capacitados ou habilitados, treinados na NR-10 e com anuência formal da empresa.',
      detalhes: 'A NR-10 diferencia: qualificado (curso específico na área elétrica reconhecido pelo sistema oficial de ensino), habilitado (qualificado e com registro no conselho de classe), capacitado (treinado sob orientação e responsabilidade de profissional habilitado e autorizado) e autorizado (qualificado, capacitado ou habilitado, com anuência formal da empresa). A norma também exige medidas de controle coletivas, como a desenergização, medidas individuais, procedimentos de trabalho e o prontuário das instalações elétricas conforme a carga instalada.',
      relacionados: ['nr10-treinamento', 'nr10-desenergizacao']
    },
    {
      id: 'nr10-treinamento',
      titulo: 'Treinamento de NR-10 (básico, SEP e reciclagem)',
      categoria: 'Eletricidade',
      perguntas: ['qual a validade do curso de NR10', 'quantas horas tem o treinamento de NR 10', 'reciclagem da NR10', 'o que é o curso SEP', 'curso complementar NR10'],
      palavras: ['treinamento', 'curso', 'reciclagem', 'validade', 'carga horária', 'NR-10', 'SEP', 'básico', 'complementar'],
      resposta: 'O curso básico de NR-10 tem carga horária mínima de 40 horas. Quem trabalha no Sistema Elétrico de Potência (SEP) ou em suas proximidades precisa também do curso complementar (SEP), com mais 40 horas. A reciclagem deve ser bienal (a cada 2 anos) e também sempre que houver troca de função ou mudança de empresa, retorno de afastamento ou inatividade por mais de três meses, ou modificações significativas nas instalações elétricas ou nos métodos de trabalho.',
      resumo: 'Básico: 40 h. Complementar SEP: mais 40 h. Reciclagem: a cada 2 anos e também em mudança de função ou empresa, afastamento acima de 3 meses ou mudanças significativas.',
      relacionados: ['nr10-o-que-e']
    },
    {
      id: 'nr10-desenergizacao',
      titulo: 'Desenergização (NR-10)',
      categoria: 'Eletricidade',
      perguntas: ['como desenergizar uma instalação', 'qual a sequência de desenergização', 'passo a passo para desligar a energia com segurança', 'o que é desenergização'],
      palavras: ['desenergização', 'seccionamento', 'aterramento', 'impedimento de reenergização', 'NR-10', 'ausência de tensão'],
      resposta: 'Pela NR-10, a instalação só é considerada desenergizada após esta sequência:\n1. Seccionamento;\n2. Impedimento de reenergização;\n3. Constatação da ausência de tensão;\n4. Instalação de aterramento temporário com equipotencialização dos condutores;\n5. Proteção dos elementos energizados existentes na zona controlada;\n6. Instalação da sinalização de impedimento de reenergização.',
      relacionados: ['loto', 'nr10-o-que-e']
    },
    {
      id: 'nr33',
      titulo: 'NR-33 — Espaços confinados',
      categoria: 'Espaço confinado',
      perguntas: ['o que é espaço confinado', 'o que diz a NR33', 'exemplos de espaço confinado', 'quem pode entrar em espaço confinado', 'o que é a PET'],
      palavras: ['NR-33', 'espaço confinado', 'PET', 'vigia', 'supervisor de entrada', 'atmosfera', 'tanque', 'silo'],
      resposta: 'Espaço confinado é qualquer área ou ambiente que, ao mesmo tempo, não foi projetado para ocupação humana contínua, tem meios limitados de entrada e saída e onde existe ou pode existir atmosfera perigosa. Exemplos: tanques, silos, galerias, poços de visita e reservatórios. A entrada só pode ocorrer com a Permissão de Entrada e Trabalho (PET), avaliação prévia da atmosfera, vigia do lado de fora e trabalhadores capacitados.',
      resumo: 'Área não feita para ocupação contínua, com entrada e saída limitadas e onde há ou pode haver atmosfera perigosa. Entrada só com PET, medição da atmosfera e vigia.',
      detalhes: 'Antes e durante a entrada, a atmosfera deve ser avaliada (oxigênio, inflamáveis e tóxicos) com equipamento calibrado. A PET vale somente para a atividade e o turno para os quais foi emitida. Os papéis principais são o supervisor de entrada (emite e encerra a PET), o vigia (fica do lado de fora, monitora e aciona o resgate) e o trabalhador autorizado. Nunca entre para resgatar alguém sem equipamento e equipe de resgate preparada.',
      relacionados: ['nr33-treinamento']
    },
    {
      id: 'nr33-treinamento',
      titulo: 'Treinamento de NR-33',
      categoria: 'Espaço confinado',
      perguntas: ['quantas horas tem o curso de espaço confinado', 'validade do treinamento NR33', 'reciclagem de espaço confinado', 'curso de vigia quantas horas', 'curso de supervisor de entrada'],
      palavras: ['treinamento', 'curso', 'reciclagem', 'validade', 'carga horária', 'NR-33', 'vigia', 'supervisor de entrada'],
      resposta: 'Pela NR-33, a capacitação inicial é de no mínimo 16 horas para trabalhadores autorizados e vigias, e de 40 horas para supervisores de entrada. A capacitação periódica deve ser anual, com carga horária mínima de 8 horas.',
      relacionados: ['nr33']
    },
    {
      id: 'nr6-epi',
      titulo: 'NR-6 — EPI: obrigações e CA',
      categoria: 'EPI',
      perguntas: ['o que é EPI', 'a empresa é obrigada a fornecer EPI', 'quem paga o EPI', 'o que é o CA do EPI', 'posso usar EPI com CA vencido', 'obrigações do empregado com o EPI'],
      palavras: ['EPI', 'NR-6', 'CA', 'certificado de aprovação', 'fornecimento', 'gratuito', 'obrigações'],
      resposta: 'EPI é todo dispositivo ou produto de uso individual destinado à proteção contra riscos à segurança e à saúde no trabalho. A empresa deve fornecer o EPI adequado ao risco, gratuitamente, em perfeito estado e com Certificado de Aprovação (CA) válido; exigir e orientar o uso; substituir quando danificado ou extraviado; e registrar a entrega. O trabalhador deve usar o EPI apenas para a finalidade prevista, cuidar da guarda e da conservação e comunicar qualquer alteração que o torne impróprio.',
      exemplo: 'Um protetor auricular danificado deve ser trocado imediatamente pela empresa, e a entrega do novo deve ser registrada na ficha de EPI (em papel ou em sistema eletrônico).',
      relacionados: ['epi-epc-diferenca', 'nr35-epi']
    },
    {
      id: 'epi-epc-diferenca',
      titulo: 'Diferença entre EPI e EPC',
      categoria: 'EPI',
      perguntas: ['qual a diferença entre EPI e EPC', 'EPI e EPC são a mesma coisa', 'o que é EPC', 'exemplos de EPC'],
      palavras: ['EPI', 'EPC', 'diferença', 'proteção coletiva', 'proteção individual'],
      resposta: 'O EPC (Equipamento de Proteção Coletiva) protege todas as pessoas expostas ao risco no ambiente — por exemplo, guarda-corpos, redes de proteção, sistemas de exaustão, enclausuramento de máquinas e sinalização. O EPI protege apenas quem o utiliza, como capacete, luvas e protetor auricular. Na hierarquia de controle, as medidas coletivas vêm antes: o EPI é usado quando as medidas coletivas não forem suficientes, enquanto estiverem sendo implantadas ou em emergências.',
      relacionados: ['nr6-epi']
    },
    {
      id: 'apr',
      titulo: 'APR — Análise Preliminar de Risco',
      categoria: 'Documentos',
      perguntas: ['o que é APR', 'como fazer uma APR', 'como preencher a análise preliminar de risco', 'para que serve a APR', 'quem deve fazer a APR', 'quando fazer APR'],
      palavras: ['APR', 'análise preliminar de risco', 'análise de risco', 'perigos', 'medidas de controle'],
      resposta: 'A APR (Análise Preliminar de Risco) é uma ferramenta para identificar, antes de começar uma tarefa, os perigos de cada etapa, os riscos envolvidos e as medidas de controle necessárias. Ela deve ser feita pela equipe que vai executar o serviço, com apoio da liderança e da segurança do trabalho, e revisada sempre que as condições mudarem.',
      detalhes: 'Passo a passo para montar uma APR:\n1. Descreva a tarefa e divida-a em etapas;\n2. Para cada etapa, liste os perigos (ex.: queda, choque, prensamento);\n3. Avalie os riscos (probabilidade e gravidade);\n4. Defina as medidas de controle (eliminar, substituir, controles de engenharia, administrativos e EPI);\n5. Indique os responsáveis e os recursos necessários;\n6. Assine com a equipe e mantenha a APR disponível no local do trabalho.',
      exemplo: 'Etapa "içar a bomba com talha": perigo — queda da carga; risco — esmagamento; controles — inspecionar a talha e as cintas, isolar a área abaixo, usar cabo-guia e definir um sinaleiro.',
      relacionados: ['pt']
    },
    {
      id: 'pt',
      titulo: 'PT — Permissão de Trabalho',
      categoria: 'Documentos',
      perguntas: ['o que é permissão de trabalho', 'quando precisa de PT', 'quem assina a permissão de trabalho', 'qual a validade da PT', 'a PT vale por quanto tempo'],
      palavras: ['PT', 'permissão de trabalho', 'validade', 'assinatura', 'liberação', 'atividade não rotineira'],
      resposta: 'A Permissão de Trabalho (PT) é o documento que autoriza atividades não rotineiras ou de alto risco — como trabalho em altura não rotineiro, trabalho a quente e intervenções em sistemas energizados. Ela registra os riscos, as medidas de controle, os envolvidos e as condições para o início do serviço. Deve ser emitida e aprovada pelo responsável pela autorização, ficar disponível no local e, ao final, ser encerrada e arquivada. Sua validade é limitada à duração da atividade, restrita ao turno de trabalho.',
      relacionados: ['apr']
    },
    {
      id: 'dds',
      titulo: 'DDS — Diálogo Diário de Segurança',
      categoria: 'Cultura de segurança',
      perguntas: ['o que é DDS', 'como fazer um DDS', 'temas para DDS', 'quanto tempo dura o DDS', 'dicas de DDS'],
      palavras: ['DDS', 'diálogo diário de segurança', 'temas', 'conscientização'],
      resposta: 'O DDS (Diálogo Diário de Segurança) é uma conversa curta, geralmente de 5 a 15 minutos, feita antes do início das atividades para reforçar comportamentos seguros, alinhar os riscos do dia e ouvir a equipe. Funciona melhor quando é objetivo, ligado à realidade do trabalho e com a participação de todos.',
      detalhes: 'Sugestões de temas: uso correto de EPIs, bloqueio de energias, ordem e limpeza, ergonomia, trabalho em altura, riscos para as mãos, direção defensiva, fadiga e hidratação, e lições aprendidas com quase-acidentes.',
      exemplo: 'Tema de DDS: "Três pontos de apoio na escada". Explique a regra (duas mãos e um pé, ou dois pés e uma mão, sempre em contato), mostre uma escada inspecionada, pergunte à equipe onde já viram esse risco e combinem uma ação para o dia.'
    },
    {
      id: 'cat',
      titulo: 'CAT — Comunicação de Acidente de Trabalho',
      categoria: 'Acidentes',
      perguntas: ['o que é CAT', 'qual o prazo para emitir a CAT', 'quem emite a CAT', 'quando abrir CAT', 'acidente de trajeto precisa de CAT'],
      palavras: ['CAT', 'comunicação de acidente', 'prazo', 'acidente de trabalho', 'INSS'],
      resposta: 'A CAT (Comunicação de Acidente de Trabalho) deve ser emitida pela empresa até o primeiro dia útil seguinte ao acidente e, em caso de morte, imediatamente. Ela também é obrigatória para doenças ocupacionais e acidentes de trajeto. Se a empresa não emitir, podem fazê-lo o próprio trabalhador, seus dependentes, o sindicato, o médico que o atendeu ou uma autoridade pública.',
      relacionados: ['quase-acidente']
    },
    {
      id: 'cipa',
      titulo: 'CIPA',
      categoria: 'Organização',
      perguntas: ['o que é CIPA', 'para que serve a CIPA', 'quanto tempo dura o mandato da CIPA', 'quem participa da CIPA', 'como funciona a eleição da CIPA'],
      palavras: ['CIPA', 'NR-5', 'mandato', 'cipeiro', 'eleição', 'comissão interna'],
      resposta: 'A CIPA (Comissão Interna de Prevenção de Acidentes e de Assédio), regida pela NR-5, tem como objetivo prevenir acidentes e doenças relacionados ao trabalho, tornando compatível o trabalho com a preservação da vida e a promoção da saúde do trabalhador. É formada por representantes da empresa (indicados) e dos empregados (eleitos). O mandato é de 1 ano, permitida uma reeleição.'
    },
    {
      id: 'loto',
      titulo: 'Bloqueio e etiquetagem (LOTO)',
      categoria: 'Máquinas e energia',
      perguntas: ['o que é LOTO', 'como fazer bloqueio e etiquetagem', 'passo a passo do bloqueio de energia', 'para que serve o cadeado de bloqueio'],
      palavras: ['LOTO', 'bloqueio', 'etiquetagem', 'cadeado', 'energia perigosa', 'lockout'],
      resposta: 'Bloqueio e etiquetagem (LOTO — lockout/tagout) é o procedimento que garante que máquinas e equipamentos fiquem sem energia perigosa durante manutenção ou limpeza. Etapas típicas:\n1. Identificar todas as fontes de energia (elétrica, pneumática, hidráulica, mecânica, térmica);\n2. Comunicar os envolvidos;\n3. Desligar o equipamento;\n4. Isolar as fontes de energia;\n5. Aplicar cadeado individual e etiqueta de identificação;\n6. Liberar ou conter as energias residuais;\n7. Testar para confirmar a ausência de energia antes de iniciar o serviço.',
      resumo: 'LOTO é isolar todas as energias perigosas com cadeado e etiqueta pessoais e testar a ausência de energia antes de mexer no equipamento.',
      relacionados: ['nr10-desenergizacao']
    },
    {
      id: 'extintores',
      titulo: 'Classes de incêndio e extintores',
      categoria: 'Incêndio',
      perguntas: ['quais as classes de incêndio', 'qual extintor usar em fogo elétrico', 'extintor de água pode em equipamento elétrico', 'tipos de extintor', 'qual extintor para óleo'],
      palavras: ['extintor', 'classes de incêndio', 'classe A', 'classe B', 'classe C', 'NR-23', 'fogo'],
      resposta: 'Classes de incêndio e extintores indicados:\n• Classe A — materiais sólidos (madeira, papel, tecido): água, espuma ou pó ABC;\n• Classe B — líquidos inflamáveis (gasolina, óleo, tintas): pó BC/ABC, CO₂ ou espuma;\n• Classe C — equipamentos elétricos energizados: CO₂ ou pó BC/ABC — nunca água ou espuma;\n• Classe D — metais combustíveis (magnésio, titânio): pó especial para classe D;\n• Classe K — óleos e gorduras de cozinha: extintor classe K.',
      relacionados: ['emergencia-contatos']
    },
    {
      id: 'pgr',
      titulo: 'PGR — Programa de Gerenciamento de Riscos (NR-1)',
      categoria: 'Gestão de riscos',
      perguntas: ['o que é PGR', 'o PGR substituiu o PPRA', 'o que tem no PGR', 'quando revisar o PGR', 'o que é GRO'],
      palavras: ['PGR', 'GRO', 'NR-1', 'inventário de riscos', 'plano de ação', 'PPRA'],
      resposta: 'O PGR (Programa de Gerenciamento de Riscos), previsto na NR-1, é a forma de implementar o Gerenciamento de Riscos Ocupacionais (GRO) na empresa e substituiu o antigo PPRA. Ele deve conter, no mínimo, o inventário de riscos e o plano de ação. A avaliação de riscos deve ser revista a cada dois anos ou quando houver mudanças, como novas tecnologias, alterações nos processos, acidentes ou doenças relacionadas ao trabalho.',
      detalhes: 'Com a atualização da NR-1, os fatores de riscos psicossociais relacionados ao trabalho também passam a ser considerados no gerenciamento de riscos. O PGR deve estar integrado ao PCMSO (NR-7) e às demais NRs aplicáveis.'
    },
    {
      id: 'aso-exames',
      titulo: 'ASO e exames ocupacionais (NR-7)',
      categoria: 'Saúde ocupacional',
      perguntas: ['quais são os exames ocupacionais', 'o que é ASO', 'quando fazer exame de retorno ao trabalho', 'de quanto em quanto tempo é o exame periódico', 'exame demissional é obrigatório'],
      palavras: ['ASO', 'PCMSO', 'NR-7', 'exame admissional', 'periódico', 'retorno ao trabalho', 'demissional', 'mudança de risco'],
      resposta: 'Pelo PCMSO (NR-7), os exames ocupacionais são: admissional, periódico, de retorno ao trabalho, de mudança de riscos ocupacionais e demissional. Após cada exame, o médico emite o ASO (Atestado de Saúde Ocupacional). O exame de retorno deve ser feito antes de o empregado reassumir suas funções quando ele ficar afastado por 30 dias ou mais por doença ou acidente, ocupacional ou não.',
      detalhes: 'Periodicidade do exame periódico: para trabalhadores expostos a riscos ocupacionais identificados no PGR ou portadores de doenças crônicas, anualmente ou em intervalos menores, a critério do médico responsável; para os demais, a cada dois anos.'
    },
    {
      id: 'quase-acidente',
      titulo: 'Quase-acidente, incidente e acidente',
      categoria: 'Acidentes',
      perguntas: ['o que é quase acidente', 'diferença entre incidente e acidente', 'por que registrar quase acidente', 'o que é a pirâmide de Bird'],
      palavras: ['quase-acidente', 'incidente', 'acidente', 'pirâmide de Bird', 'near miss', 'relato'],
      resposta: 'Acidente é o evento que resulta em lesão, doença ou dano. Incidente é o evento que poderia ter causado dano; quando não há lesão nem dano, chamamos de quase-acidente (near miss). Registrar quase-acidentes é essencial: eles mostram as falhas antes que alguém se machuque. A pirâmide de Frank Bird ilustra isso: para cada acidente grave, há muitos eventos menores e centenas de quase-acidentes.',
      exemplo: 'Uma ferramenta cai do andaime e não atinge ninguém: é um quase-acidente. Registrar, investigar e corrigir (por exemplo, com rodapé no andaime e amarração das ferramentas) evita que a próxima queda atinja alguém.',
      relacionados: ['cat']
    },
    {
      id: 'emergencia-contatos',
      titulo: 'Números de emergência',
      categoria: 'Emergências',
      perguntas: ['qual o número do SAMU', 'número dos bombeiros', 'telefones de emergência', 'para quem ligar em caso de acidente'],
      palavras: ['emergência', 'SAMU', 'bombeiros', '192', '193', 'telefone'],
      resposta: 'Números de emergência no Brasil:\n• SAMU: 192\n• Corpo de Bombeiros: 193\n• Polícia Militar: 190\n• Defesa Civil: 199\nNa empresa, siga também o Plano de Atendimento a Emergências (PAE) e acione a brigada da unidade.'
    },
    {
      id: 'ruido',
      titulo: 'Ruído e protetor auricular',
      categoria: 'Higiene ocupacional',
      perguntas: ['qual o limite de ruído', 'quantos decibéis pode', 'quando usar protetor auricular', 'limite de tolerância de ruído para 8 horas'],
      palavras: ['ruído', 'decibéis', 'dB(A)', 'protetor auricular', 'NR-15', 'limite de tolerância'],
      resposta: 'Pelo Anexo 1 da NR-15, o limite de tolerância para ruído contínuo ou intermitente é de 85 dB(A) para uma jornada de 8 horas. Acima desse valor há insalubridade, e a empresa deve adotar medidas de controle — priorizando a redução na fonte e no ambiente — e fornecer protetor auricular adequado, com treinamento e acompanhamento audiométrico.'
    },
    {
      id: 'ergonomia',
      titulo: 'NR-17 — Ergonomia',
      categoria: 'Ergonomia',
      perguntas: ['o que é ergonomia', 'o que diz a NR17', 'o que é AEP', 'o que é AET', 'como levantar peso corretamente'],
      palavras: ['ergonomia', 'NR-17', 'AEP', 'AET', 'postura', 'levantamento de carga'],
      resposta: 'A NR-17 estabelece as diretrizes para adaptar as condições de trabalho às características psicofisiológicas dos trabalhadores, promovendo conforto, segurança e desempenho. A empresa deve fazer a Avaliação Ergonômica Preliminar (AEP) e, quando necessário, a Análise Ergonômica do Trabalho (AET), que é mais aprofundada.',
      exemplo: 'Ao levantar uma caixa do chão: aproxime-se da carga, afaste os pés na largura dos ombros, flexione os joelhos mantendo as costas retas, segure firme e levante usando as pernas, sem girar o tronco. Se a carga for pesada ou volumosa, peça ajuda ou use um carrinho.'
    },
    {
      id: 'insalubridade-periculosidade',
      titulo: 'Insalubridade x periculosidade',
      categoria: 'Adicionais',
      perguntas: ['qual a diferença entre insalubridade e periculosidade', 'o que é insalubridade', 'o que é periculosidade', 'pode receber insalubridade e periculosidade juntos'],
      palavras: ['insalubridade', 'periculosidade', 'NR-15', 'NR-16', 'adicional'],
      resposta: 'A insalubridade (NR-15) ocorre quando o trabalhador fica exposto a agentes nocivos à saúde — como ruído, calor, agentes químicos ou biológicos — acima dos limites de tolerância; o adicional é de 10%, 20% ou 40%, conforme o grau (mínimo, médio ou máximo). A periculosidade (NR-16) envolve risco acentuado à vida, como inflamáveis, explosivos, energia elétrica e radiações ionizantes, entre outras; o adicional é de 30% sobre o salário-base. Pela CLT, o trabalhador deve optar por um dos dois adicionais.'
    }
  ];

  if (typeof module === 'object' && module.exports) module.exports = BASE;
  else raiz.AURORA_BASE_EXEMPLO = BASE;
})(typeof self !== 'undefined' ? self : this);
