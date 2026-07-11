import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const tesauroData = await readFile(new URL("../src/tesauroData.ts", import.meta.url), "utf8").catch(() => "");

test("login uses a local aurora-inspired background without new runtime dependencies", () => {
  assert.match(app, /login-aurora/);
  assert.match(styles, /\.login-screen\.login-aurora::before/);
  assert.match(styles, /@keyframes aurora-flow/);
  assert.doesNotMatch(app, /@react-three|three|simplex-noise|drei/);
});

test("STC sidebar only keeps panel and cycle creation", () => {
  assert.match(app, /label: "Painel STC"/);
  assert.match(app, /label: "Criar ciclo"/);
  assert.doesNotMatch(app, /label: "Acompanhar ciclo"/);
  assert.doesNotMatch(app, /label: "Histórico"/);
});

test("STC dashboard has filters and cycle drill-down actions", () => {
  assert.match(app, /Filtros do painel/);
  assert.match(app, /Encontrar ciclo por status, objeto, UG ou data/);
  assert.match(app, /Exibir detalhes/);
  assert.match(app, /Validar respostas/);
  assert.match(app, /stc-cycle-detail/);
});

test("validation covers the four response cases", () => {
  assert.match(app, /sem envio, recebido, devolvido para correção ou finalizado/);
  assert.match(app, /Aguardando envio/);
  assert.match(app, /Resposta recebida/);
  assert.match(app, /Devolvido para correção/);
  assert.match(app, /Comprovante aceito/);
});

test("UG cycles are rectangular drill-down rows with realistic actions", () => {
  assert.match(app, /ug-cycle-row/);
  assert.match(app, /Responder solicitação/);
  assert.match(app, /Ver o que foi enviado/);
  assert.match(app, /Corrigir envio/);
  assert.match(app, /Visualizar comprovante/);
  assert.match(app, /ug-cycle-detail/);
  assert.doesNotMatch(app, /responseOpen/);
});

test("profile drawer exists for UG and STC", () => {
  assert.match(app, /function ProfileDrawer/);
  assert.match(app, /profile-avatar/);
  assert.match(app, /profile-drawer/);
  assert.match(app, /Maria Costa/);
  assert.match(app, /Equipe STC/);
});

test("cycle creation uses Tesauro objects with editable UGs and metadata", () => {
  assert.match(tesauroData, /MT-0018/);
  assert.match(tesauroData, /OBRA PÚBLICA EM EXECUÇÃO/);
  assert.match(app, /selectedMetadataIds/);
  assert.match(app, /Adicionar\/remover metadados/);
  assert.match(app, /Detalhes e notificação/);
  assert.match(app, /Resumo da solicitação/);
});

test("mobile layout keeps compact treatment and no global UG sidebar", () => {
  assert.match(styles, /\.topbar-compact-note/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*\.topbar \{/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*min-height: auto/);
  assert.match(styles, /\.workspace\.ug-workspace/);
  assert.match(app, /role === "ug"\) return null/);
});
