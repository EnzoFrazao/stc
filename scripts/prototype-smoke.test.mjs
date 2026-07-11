import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const tesauroData = await readFile(new URL("../src/tesauroData.ts", import.meta.url), "utf8");

test("boxes e SubmissionMode foram removidos por completo (código e estilos)", () => {
  assert.doesNotMatch(app, /SubmissionMode/);
  assert.doesNotMatch(app, /"boxes"/);
  assert.doesNotMatch(app, /reopenedItemId/);
  assert.doesNotMatch(app, /Reabrir item/);
  assert.doesNotMatch(styles, /box-item|boxes-list|box-demo-list|mode-toggle/);
});

test("modelo v8: três perfis do órgão + STC e novos tipos", () => {
  assert.match(app, /"ponto-focal"/);
  assert.match(app, /"respondente"/);
  assert.match(app, /type ObjectKind = "fixo" \| "variavel"/);
  assert.match(app, /interface Collection/);
  assert.match(app, /interface Submission/);
  assert.match(app, /interface Respondent/);
  assert.match(app, /collectionIds/);
  assert.match(app, /linkToken/);
  assert.match(app, /requiresFocalPointValidation/);
});

test("novos estados de submissão e de ciclo existem", () => {
  assert.match(app, /"aguardando-ponto-focal"/);
  assert.match(app, /"resposta-negativa"/);
  assert.match(app, /"rascunho"/);
  assert.match(app, /"nao-enviado-no-prazo"/);
  assert.match(app, /isNegative/);
});

test("piloto é MT-0016 (fixo) e MT-0018 permanece como exemplo variável", () => {
  assert.match(app, /objectByCode\("MT-0016"\)/);
  assert.match(app, /objectByCode\("MT-0018"\)/);
  assert.match(tesauroData, /"MT-0016"/);
  assert.match(tesauroData, /"MT-0018"/);
});

test("criação STC: tipo do objeto, anexos obrigatórios e toggle do ponto focal", () => {
  assert.match(app, /Objeto fixo/);
  assert.match(app, /Objeto variável/);
  assert.match(app, /Anexos obrigatórios/);
  assert.match(app, /Exige validação do ponto focal antes do envio/);
  assert.match(app, /selectedMetadataIds/);
  assert.match(app, /suggestedUgs/);
  assert.match(app, /toggleUg/);
});

test("fluxo do respondente: planilha + anexos com checklist + resposta negativa", () => {
  assert.match(app, /Baixar planilha-padrão/);
  assert.match(app, /Não tenho esta informação/);
  assert.match(app, /Registrar resposta negativa/);
  assert.match(app, /Enviar e gerar comprovante/);
  assert.match(app, /Salvar rascunho/);
});

test("checagem estrutural: anexos + estrutura da planilha, nunca conteúdo", () => {
  assert.match(app, /Checagem estrutural/);
  assert.match(app, /estrutura do modelo/);
  assert.match(app, /O conteúdo das células não é lido/);
});

test("cadastro híbrido do respondente (R3) com validação por e-mail", () => {
  assert.match(app, /Primeiro acesso/);
  assert.match(app, /Já tenho cadastro/);
  assert.match(app, /Confirme que é você/);
  assert.match(app, /createdBySelf: true/);
  assert.match(app, /Órgão diferente do vínculo da coleta/);
});

test("painel do ponto focal: ciclo inteiro, validação e cadastro de respondentes", () => {
  assert.match(app, /focal-dashboard/);
  assert.match(app, /Validar e encaminhar à STC/);
  assert.match(app, /Pré-cadastrar/);
  assert.match(app, /Auto-cadastro/);
});

test("validação STC: rejeitar envio reabre a coleta; submissões separadas; observações encadeadas", () => {
  assert.match(app, /Rejeitar envio/);
  assert.match(app, /reabre a coleta/);
  assert.match(app, /submissões aparecem separadas/);
  assert.match(app, /observations/);
  assert.match(app, /ObservationThread/);
});

test("pendências da STC marcadas no código, sem respostas inventadas", () => {
  assert.match(app, /TODO\(P-019\)/);
  assert.match(app, /TODO\(P-020\)/);
  assert.match(app, /TODO\(P-021\)/);
  assert.match(app, /TODO\(P-022\)/);
});

test("login aurora local e STC com sidebar reduzida permanecem", () => {
  assert.match(app, /login-aurora/);
  assert.match(styles, /\.login-screen\.login-aurora::before/);
  assert.match(styles, /@keyframes aurora-flow/);
  assert.match(app, /label: "Painel STC"/);
  assert.match(app, /label: "Criar ciclo"/);
  assert.match(app, /function ProfileDrawer/);
});

test("layout mobile: nota compacta e workspace sem sidebar para o órgão", () => {
  assert.match(styles, /\.topbar-compact-note/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*\.topbar \{/);
  assert.match(styles, /\.workspace\.ug-workspace/);
  assert.match(app, /role !== "stc"\) return null/);
});
