# Agiliza Transparência — MVP (protótipo visual)

Protótipo visual do MVP 1.0 da coleta da STC/MA, construído em React, TypeScript e Vite. **Front-end only**: sem backend, sem variáveis de ambiente e sem segredos — todo o estado é simulado em memória com dados fictícios (recarregar a página volta aos seeds).

## Como rodar

```bash
npm install
npm run dev
```

## Validação

```bash
npm run test:prototype   # smoke test estrutural (node:test, sem dependências)
npm run build            # tsc + vite build
```

## O que o protótipo cobre (v8)

- Hierarquia **Ciclo × Coleta**: um ciclo gera uma coleta por órgão, cada uma com link próprio (tipo Forms) anexado ao SEI.
- Três perfis: **STC** (criação de ciclo, validação e comprovantes), **ponto focal** do órgão (validação opcional por toggle e pré-cadastro de respondentes) e **respondente técnico** (cadastro híbrido com validação de e-mail).
- Envio por **planilha-padrão + anexos obrigatórios** com checklist, rascunho, **resposta negativa** ("não tenho esta informação") e comprovante de envio.
- **Checagem estrutural** apenas — anexos presentes + estrutura da planilha; o conteúdo das células não é lido.
- Objeto **fixo × variável** (variável gera a planilha a partir dos campos escolhidos), estados próprios de ciclo/coleta (incl. "não enviado no prazo") e observações encadeadas na validação.

## Notas

- O SEI permanece o canal formal; a plataforma é paralela — nada retorna ao SEI automaticamente.
- Os documentos internos de contexto do projeto (`docs/`) não são versionados neste repositório público.
