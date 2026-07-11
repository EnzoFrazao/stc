# prototipoVisualMVP — Agiliza Transparência

Protótipo visual (React + Vite + TS) do MVP 1.0 da coleta da STC/MA. Front-end only: sem backend, tudo simulado em estado local.

## Comandos
- `npm run dev` — servidor local
- `npm run build` — tsc + vite build (tem que passar)
- `npm run test:prototype` — smoke test estrutural

## Travas duras
- **`src/App.tsx` é arquivo único** — não dividir em módulos nesta fase.
- **Não reintroduzir boxes** (envio campo a campo saiu do MVP).
- Checagem é **estrutural** (anexos presentes + estrutura da planilha), **nunca de conteúdo**.
- **SEI é o canal formal**; a plataforma é paralela — nada volta ao SEI automaticamente.
- **Modificação limpa** — apagar o que não usa; sem código morto.

## Referências
- Escopo e decisões: `docs/contextoSTC.md` (§0.1 é a fonte única) + `docs/TAREFA.md`.
- Handoff entre agentes: `docs/state.md`.
