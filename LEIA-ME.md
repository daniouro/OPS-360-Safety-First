# Aurora · OPS 360° Safety First — V49.202.0

Esta versão faz três coisas:

1. **A Aurora entende de verdade o que a pessoa escreve** — formal, informal ou técnico, com gírias, abreviações e erros de digitação — e responde de forma natural, sem respostas padronizadas.
2. **Avatar animado no lugar do logo** — um rosto que pisca, respira, olha para quem está digitando, pensa, "fala" junto com a resposta e reage com expressões.
3. **O texto "Aurora, sua assistente de inteligência artificial" foi retirado.**

---

## Instalação (1 minuto)

1. Copie o arquivo **`aurora-ops360.js`** para a mesma pasta do HTML do OPS 360°.
2. No HTML do chat, logo antes de `</body>`, adicione:

```html
<script src="aurora-ops360.js"></script>
```

Pronto. Ao abrir o app, a Aurora automaticamente:

- troca o logo das mensagens da IA pelo avatar animado (só a mensagem mais recente fica animada; as anteriores ficam paradas);
- esconde o texto "Aurora, sua assistente de inteligência artificial" (e remove a frase se ela estiver dentro de uma mensagem);
- deixa o avatar "ouvindo" enquanto o usuário digita, "pensando" depois do envio e "falando" enquanto a resposta aparece;
- se o app tiver uma função de resposta com um dos nomes mais comuns (ex.: `gerarResposta`, `generateResponse`, `getAIResponse`, `obterResposta`), passa a entregar para ela a pergunta já entendida e deixa a resposta mais humana.

Para ver tudo funcionando antes de mexer no app, abra **`aurora-demo.html`** no navegador.

> Para retirar o texto também do código-fonte, procure por `sua assistente de inteligência artificial` no HTML e apague o elemento. O pacote já o esconde de qualquer forma.

---

## Recomendado: ligar a Aurora à base de conhecimento do OPS 360°

Com a base carregada, a Aurora usa o próprio motor de compreensão para achar a resposta certa (e só recorre à função antiga do app quando não encontrar):

```html
<script>
  window.AURORA_CONFIG = { base: BASE_DO_OPS360 }; // o objeto/lista onde ficam as respostas
</script>
<script src="aurora-ops360.js"></script>
```

Ou, depois de carregar: `Aurora.carregarBase(BASE_DO_OPS360)`.

A base pode ser uma **lista** ou um **objeto** e aceita os nomes de campo que vocês já usam (em português ou inglês):

| O que é | Nomes aceitos |
|---|---|
| Perguntas de exemplo | `perguntas`, `patterns`, `questions`, `exemplos`, `gatilhos` |
| Palavras-chave | `palavras`, `palavrasChave`, `keywords`, `tags`, `termos` |
| Resposta (texto ou lista de variações) | `resposta`, `respostas`, `answer`, `response`, `texto` |
| Título / categoria | `titulo`, `title`, `tema` / `categoria`, `category` |
| Opcionais (deixam a conversa mais rica) | `resumo`, `detalhes`, `exemplo`, `relacionados` |

Veja `exemplos/base-conhecimento-exemplo.js`. Quando uma entrada tem várias respostas, a Aurora alterna entre elas; com `detalhes` e `exemplo`, ela consegue atender "explica melhor" e "me dá um exemplo".

---

## Se a função de resposta do app tem outro nome

Informe o nome na tag do script:

```html
<script src="aurora-ops360.js" data-funcao-resposta="minhaFuncaoDeResposta"></script>
```

A função deve receber o texto do usuário e devolver o texto da resposta (ou uma Promise com ele). O tipo de retorno é mantido. Se ela não devolver texto (por exemplo, se ela mesma já escreve na tela), a Aurora só melhora a pergunta que chega nela e não altera nada mais.

Se a função estiver dentro de um módulo ou declarada com `const`/`let`, integre manualmente onde a mensagem é enviada:

```js
const r = await Aurora.processar(textoDoUsuario, minhaFuncaoDeResposta);
mostrarRespostaNoChat(r.texto);
```

---

## O que mudou na compreensão

| O usuário escreve | A Aurora entende |
|---|---|
| `vc sabe qdo vence o curso de altura?` | Pergunta sobre **prazo** do treinamento de **NR-35** (gírias e abreviações expandidas) |
| `qual a validade do treinamnto da nr35` | Corrige "treinamnto" → "treinamento" e responde só a validade |
| `e da nr10?` | Continua o assunto anterior: validade, agora da **NR-10** |
| `e quantas horas tem?` | Carga horária da NR-10 (responde só o trecho das horas) |
| `Gostaria de saber quem deve elaborar a APR.` | Registro **formal**; foco em **quem é responsável** → "A APR deve ser feita pela equipe…" |
| `qual a validade da nr35 e da nr10?` | Pergunta **composta**: responde as duas |
| `não entendi` · `me dá um exemplo` · `resume` | Reexplica, dá exemplo ou resume a resposta anterior |
| `não é isso` · `você já disse isso` | Pede desculpas, tenta outra resposta ou pergunta o que faltou — e **aprende** |
| `obrigado pela explicação sobre a NR-35` | Agradecimento (não repete a resposta da NR-35) |
| `meu colega levou choque!` | **Emergência**: orientação imediata (SAMU 192 / Bombeiros 193, desligar a energia) |
| `como faço bolo de cenoura?` | Fora da área: diz isso com leveza, sem inventar resposta |

Mais detalhes:

- **Tom adaptado:** responde com mais formalidade para quem escreve formalmente, de forma descontraída para quem escreve informalmente e de forma direta em conversas técnicas. Usa emojis só quando combina com o tom.
- **Sem respostas repetidas:** saudações, agradecimentos, aberturas e fechamentos variam; se a pessoa repete a pergunta, a resposta muda de forma (ou vem completa).
- **Eco das palavras do usuário:** "Quanto à validade do curso de altura: …" mostra que a pergunta foi entendida.
- **Aprendizado:** quando a pessoa reformula e confirma a resposta certa, a Aurora grava a associação e, da próxima vez, acerta de primeira. Também lembra o nome e as preferências ("responda mais curto", "sem emoji").
- **Honestidade:** se perguntarem, a Aurora diz que é uma IA. Quando não sabe, não inventa.

---

## Configurações (opcional)

Coloque em `window.AURORA_CONFIG` antes do script, ou use atributos `data-` na tag:

| Opção | Atributo | Padrão | Para quê |
|---|---|---|---|
| `base` | — | `null` | Base de conhecimento do OPS 360° |
| `funcaoResposta` | `data-funcao-resposta` | detecção automática | Nome da função de resposta do app |
| `seletorLogo` | `data-seletor-logo` | detecção automática | Seletor CSS do logo nas mensagens da IA |
| `seletorMensagens` | `data-seletor-mensagens` | detecção automática | Área onde as mensagens aparecem |
| `seletorEntrada` | `data-seletor-entrada` | detecção automática | Campo "Pergunte ou…" |
| `tamanhoAvatar` | `data-tamanho` | tamanho do logo | Tamanho do avatar em px |
| `acessorio` | `data-acessorio` | `fone` | `fone`, `capacete` ou `nenhum` |
| `removerTextos` | — | frase da Aurora | Textos a esconder |
| `aprender` | `data-aprender` | `true` | `false` desliga a memória |
| `autoIntegrar` | `data-auto` | `true` | `false` para integrar manualmente |
| `depurar` | `data-depurar` | `false` | Mostra no console o que foi encontrado |

Cores do avatar (CSS): `aurora-avatar { --aurora-pele: #e2ab86; --aurora-cabelo: #2e1e17; --aurora-destaque: #2dd4bf; }`.

---

## API para desenvolvedores

```js
Aurora.processar(texto, motor?)   // → Promise<{ texto, emocao, gesto, fonte, confianca, resumo, entendimento }>
Aurora.responder(texto)           // só com a base carregada (síncrono)
Aurora.entender(texto)            // intenção, foco, entidades (NRs, siglas), registro, sentimento, urgência…
Aurora.reescrever(texto)          // pergunta limpa: "vc sabe qdo vence o curso de nr35" → "você sabe quando vence o curso de NR-35"
Aurora.humanizar(resposta, entendimento)
Aurora.envolver(funcao)           // devolve a função "turbinada" (mesmo tipo de retorno)
Aurora.carregarBase(base, acrescentar?)
Aurora.esquecer()                 // apaga o que foi aprendido neste navegador
Aurora.criarAvatar({ tamanho })   // cria um <aurora-avatar> para colocar onde quiser
Aurora.ativarAvatar(elemento)     // define o avatar "vivo"
Aurora.falar(texto)               // anima a boca do avatar vivo
```

Avatar em qualquer lugar:

```html
<aurora-avatar tamanho="44"></aurora-avatar>
<script>
  const av = document.querySelector('aurora-avatar');
  av.estado = 'pensando';            // ocioso | ouvindo | pensando | falando
  av.emocao = 'feliz';               // neutra | feliz | preocupada | empatica | curiosa | surpresa
  av.gesto('sim');                   // sim | nao | aceno | sorriso | riso | inclinar | desculpa
  av.falar('Olá! Como posso ajudar?');
</script>
```

O avatar respeita a preferência do sistema "reduzir movimento", pausa quando sai da tela e não usa imagens externas.

---

## Privacidade

O aprendizado (nome, preferências e associações pergunta → resposta) fica **somente no navegador de cada usuário** (`localStorage`, chave `aurora.memoria.v1`). Nada é enviado para servidores. `Aurora.esquecer()` apaga tudo.

---

## Solução de problemas

- **Nada mudou:** confira se o script foi incluído depois do chat no HTML e abra o console (F12). Deve aparecer `[Aurora 49.202.0] ativa`.
- **O logo não virou avatar:** use `data-depurar="true"` para ver o que foi encontrado e, se preciso, informe `data-seletor-logo=".classe-do-logo"`.
- **As respostas não passaram pela Aurora:** informe `data-funcao-resposta` ou use `Aurora.processar` (veja acima).

---

## Arquivos

| Arquivo | Para quê |
|---|---|
| `dist/aurora-ops360.js` | **Pacote único** — é o que vai no app |
| `dist/aurora-demo.html` | Demonstração completa, abre direto no navegador |
| `src/aurora-compreensao.js` | Motor de compreensão (também roda no Node.js) |
| `src/aurora-avatar.js` | Avatar animado `<aurora-avatar>` |
| `src/aurora-integracao.js` | Integração automática com o chat |
| `exemplos/base-conhecimento-exemplo.js` | Base de exemplo (formato aceito) |
| `test/` | Testes automatizados (`npm test`) |

Desenvolvimento: `npm test` roda os testes, `npm run build` gera a pasta `dist/` e `npm run visual` faz a verificação visual (requer Playwright).
