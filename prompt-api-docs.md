# Guia de Implementação: Chrome Prompt API (Gemini Nano)

Este documento serve como referência completa para a implementação da **Prompt API** do Google Chrome, que permite executar o modelo de linguagem **Gemini Nano** localmente no navegador, sem necessidade de servidores externos.

> **Nota:** Esta API é experimental e está sujeita a alterações. As instruções abaixo baseiam-se na documentação oficial e no estado atual da API (Chrome 128+).

---

## 1. Pré-requisitos e Configuração

Para utilizar a Prompt API, o ambiente deve estar configurado corretamente:

1.  **Navegador:** Chrome Dev ou Canary (versão 128 ou superior recomendada).
2.  **Habilitar Flags (`chrome://flags`):**
    - `Prompt API for Gemini Nano`: **Enabled**
    - `Enables optimization guide on device`: **Enabled BypassPerfRequirement**
3.  **Download do Componente:**
    - Acesse `chrome://components`.
    - Procure por **Optimization Guide On Device Model**.
    - Clique em "Check for update" para garantir que o modelo foi baixado.

---

## 2. Namespace e Detecção de Recurso

A API reside no namespace `self.LanguageModel` (ou `window.LanguageModel`). Versões futuras podem usar `window.ai.languageModel`. Recomenda-se criar uma verificação de segurança.

### Verificando Disponibilidade

Antes de usar, verifique se o modelo está disponível no navegador.

```typescript
if (!("LanguageModel" in self)) {
  console.error("Prompt API não está disponível neste navegador.");
  // Exibir mensagem ao usuário para habilitar a feature ou usar Chrome Dev/Canary
  return;
}

// Opcionalmente, verificar os parâmetros do modelo
const params = await LanguageModel.params();
console.log("Parâmetros disponíveis:", params);
// Retorna: { defaultTopK, maxTopK, defaultTemperature, maxTemperature }
```

---

## 3. Gerenciamento de Sessão

A interação com o modelo ocorre através de **Sessões**. Uma sessão mantém o contexto (histórico de conversa).

### Criando uma Sessão

Você pode configurar a temperatura e o `topK` para controlar a criatividade do modelo.

```typescript
let session;

try {
  session = await LanguageModel.create({
    temperature: 0.7, // 0.0 (focado) a 1.0+ (criativo)
    topK: 3, // Considera apenas os K tokens mais prováveis
    initialPrompts: [
      {
        role: "system",
        content: "Você é um assistente técnico especializado em React.",
      },
    ],
  });
} catch (e) {
  console.error("Falha ao criar sessão:", e);
}
```

> **Nota:** O parâmetro de configuração usa `initialPrompts` como um array de objetos com `role` e `content`. Versões futuras da API podem usar `systemPrompt` como string direta.

> **Dica:** Se precisar trocar o contexto (ex: mudar de "Recrutador" para "Candidato"), **crie uma nova sessão**. Não tente reutilizar a mesma sessão para propósitos conflitantes.

### Clonando uma Sessão

Se você quiser criar uma bifurcação na conversa sem perder o histórico anterior:

```typescript
const novaSessao = await session.clone();
```

> **Nota:** O clone cria uma cópia da sessão com o mesmo histórico, mas ambas as sessões são independentes a partir desse ponto.

### Limitações de Persistência

**⚠️ Importante:** Sessões **NÃO podem ser persistidas ou reutilizadas** entre recarregamentos da página ou em momentos futuros.

As sessões da Prompt API são **objetos em memória** com as seguintes limitações:

- **Ciclo de vida limitado à página:** Quando você fecha ou recarrega a página, a sessão é destruída automaticamente
- **Não serializáveis:** Não existe método para exportar/importar o estado interno da sessão
- **Sem identificador persistente:** Você não pode "salvar" e "recarregar" uma sessão por ID

**Estratégias alternativas para histórico de conversas:**

```typescript
// ✅ O que você PODE fazer: Salvar o histórico de mensagens
const chatHistory = {
  id: Date.now(),
  title: "Conversa sobre React",
  messages: [
    { role: "user", content: "O que é useEffect?" },
    { role: "assistant", content: "useEffect é um Hook que..." },
  ],
  settings: {
    temperature: 0.7,
    topK: 3,
  },
};

// Salvar no localStorage
localStorage.setItem("chatHistory", JSON.stringify([chatHistory]));

// ❌ O que você NÃO pode fazer: Restaurar o contexto da sessão
// Ao carregar um chat antigo, você precisa:
// 1. Criar uma NOVA sessão do zero
// 2. Apenas EXIBIR as mensagens antigas (não reenviar ao modelo)
// 3. Continuar a conversa a partir da nova sessão (sem memória do contexto anterior)

const history = JSON.parse(localStorage.getItem("chatHistory"));
const newSession = await LanguageModel.create({
  temperature: history[0].settings.temperature,
  topK: history[0].settings.topK,
});
// A nova sessão NÃO terá memória das mensagens antigas
// Ela começa "em branco" quanto ao contexto
```

**Implicações para aplicações multi-chat:**

- Mantenha a sessão ativa durante a navegação SPA (Single Page Application)
- Use `clone()` para bifurcar conversas durante a mesma execução
- Para "trocar de chat", destrua a sessão atual e crie uma nova
- Exiba mensagens antigas do localStorage apenas como histórico visual

### Encerrando uma Sessão (Importante!)

Modelos de IA consomem muita memória RAM/VRAM. Sempre destrua a sessão quando ela não for mais necessária (ex: ao desmontar um componente React).

```typescript
session.destroy();
```

---

## 4. Enviando Prompts (Prompting)

Existem duas formas de obter respostas: Texto Único ou Streaming.

### Opção A: Texto Único (`prompt`)

Espera a resposta completa ser gerada antes de retornar.

```typescript
const resposta = await session.prompt(
  "Explique o que é o useEffect em uma frase.",
);
console.log(resposta);
```

### Opção B: Streaming (`promptStreaming`)

Retorna pedaços (chunks) da resposta assim que são gerados. Ideal para UX, pois reduz a percepção de latência.

```typescript
const stream = session.promptStreaming("Escreva um poema sobre programação.");

let respostaCompleta = "";
let previousChunk = "";

for await (const chunk of stream) {
  // O chunk é o texto ACUMULADO (não apenas o delta)
  // Para obter apenas o novo texto, compare com o chunk anterior
  const newChunk = chunk.startsWith(previousChunk)
    ? chunk.slice(previousChunk.length)
    : chunk;

  respostaCompleta += newChunk;
  console.log(newChunk); // Exibe apenas o novo texto
  previousChunk = chunk;
}

console.log("Resposta completa:", respostaCompleta);
```

> **Importante:** Os chunks são **acumulativos** - cada chunk contém o texto completo até aquele ponto, não apenas o novo texto. Use a técnica acima para extrair apenas o delta.

---

## 5. System Prompts e Contexto

Diferente de APIs de servidor que aceitam um array de mensagens `[{ role: 'system' }, { role: 'user' }]` a cada chamada, a Prompt API define o comportamento inicial na **criação** da sessão.

**Estratégia Recomendada:**

1. Use o parâmetro `initialPrompts` no método `.create()` (versões futuras podem suportar `systemPrompt` como string direta).
2. Para tarefas diferentes, destrua a sessão atual e crie uma nova com o novo System Prompt.

```typescript
// Exemplo: Configurando uma persona
const session = await LanguageModel.create({
  initialPrompts: [
    {
      role: "system",
      content:
        "Você é um especialista em análise de currículos. Responda apenas com JSON.",
    },
  ],
});
```

---

## 6. Tokenização e Limites

Você pode verificar quantos tokens uma string consome e qual o limite da sessão atual.

### Contando Tokens de um Prompt

A API mudou entre Chrome Stable e Canary. Use verificação para ambas as versões:

```typescript
const texto = "Texto para analisar";
let contagem;

// A API foi renomeada de countPromptTokens para measureInputUsage
if (session.countPromptTokens) {
  contagem = await session.countPromptTokens(texto);
} else if (session.measureInputUsage) {
  contagem = await session.measureInputUsage(texto);
}

console.log(`Tokens usados: ${contagem}`);
```

### Verificando Limites da Sessão

As propriedades também foram renomeadas entre versões:

```typescript
// maxTokens foi renomeado para inputQuota
const maxTokens = session.inputQuota || session.maxTokens;

// tokensSoFar foi renomeado para inputUsage
// E o cálculo mudou: tokensSoFar agora é calculado como (inputQuota - inputUsage)
const tokensUsados = session.inputUsage || session.tokensSoFar;
const tokensRestantes =
  session.tokensSoFar || session.inputQuota - session.inputUsage;

console.log(`Janela de contexto máxima: ${maxTokens}`);
console.log(`Tokens usados: ${tokensUsados}`);
console.log(`Tokens restantes: ${tokensRestantes}`);
```

> **Importante:** A API está em transição. O código acima garante compatibilidade com ambas as versões.

---

## 7. Exemplo Completo (Helper TypeScript)

Abaixo, uma classe utilitária para facilitar a integração.

```typescript
// types.d.ts
interface AILanguageModelFactory {
  params(): Promise<{
    defaultTopK: number;
    maxTopK: number;
    defaultTemperature: number;
    maxTemperature: number;
  }>;
  create(options?: {
    temperature?: number;
    topK?: number;
    initialPrompts?: Array<{
      role: string;
      content: string;
    }>;
  }): Promise<AILanguageModelSession>;
}

interface AILanguageModelSession {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): AsyncIterable<string>;
  destroy(): void;
  clone(): Promise<AILanguageModelSession>;

  // Propriedades e métodos com nomes antigos e novos (para compatibilidade)
  countPromptTokens?(input: string): Promise<number>; // Nome antigo
  measureInputUsage?(input: string): Promise<number>; // Nome novo

  maxTokens?: number; // Nome antigo
  inputQuota?: number; // Nome novo

  tokensSoFar?: number; // Nome antigo (agora calculado: inputQuota - inputUsage)
  inputUsage?: number; // Nome novo

  temperature: number;
  topK: number;
}

declare global {
  interface Window {
    LanguageModel: AILanguageModelFactory;
  }

  // Alias para self
  const LanguageModel: AILanguageModelFactory;
}

// AIHandler.ts
export class AIHandler {
  private session: AILanguageModelSession | null = null;

  async init(systemPrompt?: string) {
    if (!("LanguageModel" in self)) {
      throw new Error("Prompt API não suportada neste navegador.");
    }

    // Opcional: obter parâmetros padrão do modelo
    const params = await LanguageModel.params();

    this.session = await LanguageModel.create({
      temperature: params.defaultTemperature || 0.7,
      topK: params.defaultTopK || 3,
      initialPrompts: systemPrompt
        ? [
            {
              role: "system",
              content: systemPrompt,
            },
          ]
        : [],
    });

    return this.session;
  }

  async send(text: string): Promise<string> {
    if (!this.session) throw new Error("Sessão não inicializada.");
    return await this.session.prompt(text);
  }

  async sendStream(text: string, onChunk: (text: string) => void) {
    if (!this.session) throw new Error("Sessão não inicializada.");

    const stream = this.session.promptStreaming(text);
    for await (const chunk of stream) {
      onChunk(chunk);
    }
  }

  close() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
```
