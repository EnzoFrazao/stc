# Agiliza Transparência — MVP (protótipo visual)

Protótipo visual do MVP 1.0 da coleta da STC/MA, construído em React, TypeScript e Vite. **Front-end only**: sem backend, sem variáveis de ambiente e sem segredos — todo o estado é simulado em memória com dados fictícios (recarregar a página volta aos seeds).

## Como rodar

```bash
npm install
npm run dev
```

## Validação

```bash
npm run test:prototype   # smoke test estrutural (node:test)
npm run test:behavior    # fluxos reais com Vitest + Testing Library
npm run test:all         # smoke + comportamento
npm run build            # TypeScript + Vite
```

## O que o protótipo cobre (v8)

- Hierarquia **Ciclo × Coletas individuais**: a STC destina um ciclo a uma ou mais UGs e publica um link único; cada respondente — ou o próprio ponto focal — passa a ter sua coleta dentro do ciclo quando assume a resposta. A aprovação não cria coletas vazias por órgão.
- Quatro visões: **Analista STC** (criação e acompanhamento), **Especialista STC** (aprovação e validação), **ponto focal** do órgão (ciclos e coletas somente da própria UG, validação opcional por toggle, pré-cadastro e resposta institucional) e **respondente técnico** (somente as próprias coletas).
- Login único por e-mail e senha; o primeiro cadastro do respondente acontece no contexto do link do ciclo, com validações simuladas de e-mail/UG.
- Ponto focal e respondente possuem orientação contextual permanente à direita no desktop e acima do conteúdo no mobile.
- A barra lateral da STC mantém apenas **Painel STC**, **Histórico** e **Registro**; criar, aprovar e acompanhar ciclos são ações do painel.
- Envio por **planilha-padrão + anexos obrigatórios** com checklist, rascunho, **resposta negativa** ("não tenho esta informação") e comprovante de envio.
- **Checagem estrutural** apenas — anexos presentes + estrutura da planilha; o conteúdo das células não é lido.
- Objeto **fixo × variável**: o catálogo fixo contém os 41 objetos de coleta manual do Tesauro; os 8 automatizados ficam fora. Campos e anexos explicitamente obrigatórios são pré-selecionados por objeto; o variável começa vazio e gera a planilha a partir dos campos escolhidos.
- Estados próprios de ciclo/coleta (incl. "não enviado no prazo"), fechamento terminal por UG, cobertura de todas as UGs antes da finalização global e observações encadeadas na validação.

## Notas

- O SEI permanece o canal formal; a plataforma é paralela — nada retorna ao SEI automaticamente.
- O Tesauro não contém o mapeamento oficial informação↔órgão; por segurança, nenhuma UG é presumida na criação.
- Modelos fixos permanecem bloqueados até o arquivo oficial de cada `MT-*` ser vinculado; somente objetos variáveis geram uma planilha no protótipo.
- `src/tesauroData.ts` é versionado. O gerador de manutenção espera a planilha-fonte fora deste repositório público, em `../DocumentosAdcionais/levantamento de requisitos/`.
- Os documentos internos de contexto do projeto (`docs/`) não são versionados neste repositório público.
