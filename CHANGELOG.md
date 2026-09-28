# Histórico de versões

## V49.202.0 — 28/09/2026

### Compreensão da linguagem (Aurora)
- Entende mensagens formais, informais e técnicas: expande gírias e abreviações (vc, qdo, pq, blz, vlw…), restaura acentos e corrige erros de digitação sem "corrigir" palavras comuns.
- Reconhece NRs escritas de qualquer jeito (nr35, NR 35, n.r. 35, norma regulamentadora 35) e siglas de SST (EPI, EPC, APR, PT, PET, DDS, CAT, CIPA, PGR, PCMSO, ASO, LOTO, CA…), inclusive por tema ("painel elétrico" → NR-10).
- Identifica a intenção (saudação, agradecimento, dúvida, pedido, "não entendi", "não é isso", emergência…) e o tipo de pergunta (prazo, quantidade, responsável, definição, procedimento…).
- Mantém o contexto: "e da NR-10?", "e quantas horas tem?", "quem assina?" retomam o assunto anterior.
- Responde exatamente o que foi perguntado (trecho relevante), atende perguntas compostas e oferece o texto completo quando faz sentido.
- Respostas naturais e variadas: tom adaptado ao usuário, eco das palavras dele, aberturas e fechamentos que não se repetem, emojis só quando combinam.
- Reparo: quando o usuário diz que não era isso, pede desculpas, tenta outra resposta ou pergunta o que faltou — e aprende com a correção.
- Emergências reais recebem orientação imediata (SAMU 192, Bombeiros 193).
- Não inventa respostas para assuntos fora da base.
- Memória por usuário (no navegador): nome, preferências e associações aprendidas.
- Pode envolver a função de resposta que o app já tem, mantendo o tipo de retorno.

### Avatar animado
- Novo componente `<aurora-avatar>` substitui o logo na conversa: pisca, respira, acompanha o cursor e o campo de digitação com o olhar, pensa, fala com sincronia labial e reage com expressões (feliz, preocupada, empática, curiosa, surpresa) e gestos (acenar, concordar, inclinar a cabeça).
- Só o avatar da mensagem mais recente fica animado; os anteriores ficam estáticos.
- Respeita "reduzir movimento" e pausa fora da tela.

### Interface
- Removido o texto "Aurora, sua assistente de inteligência artificial".

### Técnico
- Pacote único `aurora-ops360.js`, sem dependências.
- Base de conhecimento de exemplo e demonstração autônoma.
- Testes automatizados (`npm test`) e verificação visual (`npm run visual`).
