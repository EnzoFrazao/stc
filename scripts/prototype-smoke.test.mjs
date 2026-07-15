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

test("revisão da criação tem estado, auditoria e geração idempotente separados das submissões", () => {
  assert.match(
    app,
    /type CreationReviewStatus = "aguardando-analise" \| "ajustes-solicitados" \| "aprovado"/,
  );
  assert.match(app, /interface CycleReviewEvent/);
  assert.match(app, /creationStatus: CreationReviewStatus/);
  assert.match(app, /reviewHistory: CycleReviewEvent\[\]/);
  assert.match(app, /collectionIds: \[\],[\s\S]*?creationStatus: "aguardando-analise"/);
  assert.match(app, /reviewDraft\.objectKind === "fixo" && !object/);
  assert.match(app, /cycle\.creationStatus === "aprovado"/);
  assert.match(app, /\.filter\(\(collection\) => !collections\.some\(\(item\) => item\.id === collection\.id\)\)/);
});

test("piloto MT-0016 e exemplo MT-0018 são ambos objetos fixos", () => {
  assert.match(app, /objectByCode\("MT-0016"\)/);
  assert.match(app, /objectByCode\("MT-0018"\)/);
  assert.match(tesauroData, /"MT-0016"/);
  assert.match(tesauroData, /"MT-0018"/);
  assert.match(app, /objectKind: "fixo",[\s\S]*?createdAt: "04 jul\. 2026"/);
});

test("criação STC: tipo do objeto, anexos obrigatórios e toggle do ponto focal", () => {
  assert.match(app, /Objeto fixo/);
  assert.match(app, /Objeto variável/);
  assert.match(app, /Anexos obrigatórios/);
  assert.match(app, /Exige validação do ponto focal antes do envio/);
  assert.match(app, /selectedMetadataIds/);
  assert.match(app, /fieldCatalogForCycles/);
  assert.match(app, /tesauroAttachments/);
  assert.doesNotMatch(app, /setSelectedUgs\(\[\.\.\.nextObject\.suggestedUgs\]\)/);
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
  assert.match(app, /estrutura da planilha-padrão/);
  assert.match(app, /O conteúdo das células e os nomes dos arquivos não são lidos/);
});

test("Correção 1: o reenvio passa pelo ponto focal de novo — resending não muda o status", () => {
  assert.match(app, /status: statusAfterRespondentSend\(Boolean\(cycle\?\.requiresFocalPointValidation\), false\)/);
  assert.doesNotMatch(app, /!resending &&/);
});

test("Correção 2: resposta negativa respeita o gate do focal e segue como estado próprio", () => {
  assert.match(app, /status: statusAfterRespondentSend\(Boolean\(cycle\?\.requiresFocalPointValidation\), true\)/);
  assert.match(app, /status: statusAfterFocal\(item\.isNegative\)/);
  assert.match(app, /Devolver ao respondente/);
});

test("Correção 3: anexos conferidos por contagem (enviados >= exigidos), nunca pelo título", () => {
  assert.match(app, /export function attachmentsMeetRequirement\s*\(/);
  assert.match(
    app,
    /const anexosOk\s*=\s*attachmentsMeetRequirement\s*\(\s*attachments\.length\s*,\s*required\.length\s*\)/,
  );
  assert.doesNotMatch(app, /slugify/);
  assert.match(app, /de \${required\.length} enviados/);
  assert.match(app, /Não tenho todos os anexos — falar com a STC/);
  assert.match(app, /attachmentJustifications/);
  assert.match(app, /TODO\(P-023\)/);
});

test("Correção 4: duas checagens independentes e caminho de reprovação navegável", () => {
  assert.match(
    app,
    /const planilhaOk = !fixedTemplatePending && Boolean\(fileName\) && !sheetOutOfModel/,
  );
  assert.match(app, /const structuralOk = !fixedTemplatePending && planilhaOk && anexosOk/);
  assert.match(app, /Simular planilha fora do modelo/);
  assert.match(app, /colunas conferem ✓/);
  assert.match(app, /fora do modelo ✗/);
});

test("Correção 5: 'Atrasada' é derivado — SubmissionStatus não ganhou estado novo", () => {
  assert.match(app, /function isPastDeadline/);
  assert.match(app, />Atrasada</);
  assert.match(
    app,
    /type SubmissionStatus =\s*\| "pendente"\s*\| "rascunho"\s*\| "enviado"\s*\| "aguardando-ponto-focal"\s*\| "reaberto"\s*\| "aprovado"\s*\| "resposta-negativa";/,
  );
});

test("anexos do Tesauro usam o mapeamento gerado por objeto e variável começa vazia", () => {
  assert.doesNotMatch(app, /fixedObjectAttachments/);
  assert.match(app, /const attachmentCatalog = tesauroAttachments/);
  assert.match(app, /function requiredAttachmentsForObject/);
  assert.match(app, /attachmentIds\?: readonly string\[\]/);
  assert.match(app, /requiredAttachments: requiredAttachmentsForObject\(object\)/);
  assert.match(app, /function draftForVariable[\s\S]*requiredAttachments: \[\]/);
  assert.match(app, /Anexos obrigatórios do ciclo/);
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
  assert.match(app, /Pré-cadastrar aqui adiciona/);
  assert.match(app, /Auto-cadastro/);
});

test("TAREFA_UI §8: focal vê as submissões no painel e cadastra respondente dentro da coleta", () => {
  assert.match(app, /aguardando sua validação/);
  assert.match(app, /focal-sub-row/);
  assert.match(app, /Adicionar respondente/);
  assert.match(app, /Dar ciência da negativa e encaminhar à STC/);
  assert.match(app, /Coletas do órgão/);
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

test("login aurora local e STC dividida entre analista e especialista", () => {
  assert.match(app, /login-aurora/);
  assert.match(styles, /\.login-screen\.login-aurora::before/);
  assert.match(styles, /@keyframes aurora-flow/);
  assert.match(app, /type StcRole = "stc-analista" \| "stc-especialista"/);
  assert.match(app, /Entrar como Analista STC/);
  assert.match(app, /Entrar como Especialista STC/);
  assert.match(app, /label: "Painel STC"/);
  assert.match(app, /title: "Criar Ciclo"/);
  assert.match(app, /title: "Aprovar Ciclo"/);
  assert.match(app, /title: "Acompanhar ciclos"/);
  assert.match(app, /function ProfileDrawer/);
});

test("TAREFA_UI §1.2: CycleStatus renomeado e recolorido — verde terminou, amarelo agindo, vermelho prazo", () => {
  assert.match(app, /"aguardando-analise-stc"/);
  assert.match(
    app,
    /export type CycleStatus =\s*\| "ativo"\s*\| "aguardando-ponto-focal"\s*\| "aguardando-analise-stc"/,
  );
  assert.doesNotMatch(app, /"respondido"/);
  assert.match(app, /Aguardando análise da STC/);
  assert.match(app, /"aguardando-ponto-focal": "warning"/);
  assert.match(app, /"aguardando-analise-stc": "warning"/);
  assert.match(app, /correcao: "orange"/);
  assert.match(app, /finalizado: "success"/);
  assert.match(styles, /\.status-pill\.orange/);
  assert.match(styles, /\.ug-cycle-row\.aguardando-analise-stc/);
});

test("Task 2: status agregado recebe o ciclo e todas as coletas", () => {
  assert.match(
    app,
    /export function deriveCycleStatus\(cycle: CycleItem, collections: Collection\[\]\): CycleStatus/,
  );
  assert.match(app, /deriveCycleStatus\(cycle, nextCollections\)/);
});

test("TAREFA_UI §1: acompanhamento lista ciclos e mantém o progresso das coletas aprovadas", () => {
  assert.match(app, /Ciclos criados/);
  assert.match(app, /Ainda não enviado às UGs/);
  assert.match(app, /respostas recebidas/);
  assert.match(app, /function collectionSituation/);
  assert.match(app, /Copiar link/);
  assert.match(app, /Link copiado/);
  assert.match(app, /deadlineContext\(cycle\.deadline\)/);
  assert.match(styles, /\.progress-track/);
  assert.match(styles, /\.ug-chip/);
});

test("TAREFA_UI §2: fixos do catálogo, variável único e anexos derivados do Tesauro", () => {
  assert.match(app, /kind-square/);
  assert.match(app, /Escolha o tipo antes do objeto/);
  assert.doesNotMatch(app, /orderedObjects/);
  assert.match(app, /kind === "fixo"/);
  assert.match(app, /objects\.map\(\(item\) =>/);
  assert.match(app, /kind === "variavel"/);
  assert.match(app, /Nome do objeto/);
  assert.match(app, /AttachmentCatalogPicker/);
  assert.match(app, /Nome do anexo personalizado/);
  assert.match(app, /Nenhuma UG é presumida/);
  assert.match(styles, /\.kind-square/);
});

test("TAREFA_UI §3: Histórico — todas as coletas, filtros, busca e leitura do que aconteceu", () => {
  assert.match(app, /"stc-history"/);
  assert.match(app, /label: "Histórico"/);
  assert.match(app, /function StcHistory/);
  assert.match(app, /function cycleClosedAt/);
  assert.match(app, /É leitura — a ação acontece no painel/);
});

test("TAREFA_UI §4: Registro — objetos fixos, wizard de UG (ponto focal por e-mail) e campos por objeto", () => {
  assert.match(app, /"stc-registry"/);
  assert.match(app, /label: "Registro"/);
  assert.match(app, /function StcRegistry/);
  assert.match(app, /[Uu]m ponto focal por órgão/);
  assert.match(app, /Enviar convite por e-mail \(simulado\)/);
  assert.match(app, /Trocar ponto focal/);
  assert.match(app, /objectFieldsRegistry/);
  assert.match(app, /customObjects/);
});

test("TAREFA_UI §5: acesso com as duas portas visíveis e contexto da coleta no topo", () => {
  assert.match(app, /access-doors/);
  assert.match(app, /Você chegou pelo link desta coleta/);
  assert.match(app, /enviada em nome do órgão/);
  assert.match(styles, /\.access-doors/);
});

test("TAREFA_UI §7: wizard em 4 etapas com stepper clicável, etapa que ensina e comprovante", () => {
  assert.match(app, /wizard-stepper/);
  assert.match(app, /Como responder/);
  assert.match(app, /Preencher e subir/);
  assert.match(app, /Voltar ao painel/);
  assert.match(app, /O nome do arquivo não importa/);
  assert.match(app, /Prévia da planilha-padrão/);
  assert.match(app, /correction-highlight/);
  assert.match(app, /O que acontece agora/);
  assert.match(app, /Baixar \/ imprimir \(simulado\)/);
  assert.match(styles, /\.wizard-stepper/);
});

test("Task 3: comprovantes tipados preservam o histórico e aparecem nos três contextos", () => {
  const receiptKinds = app.match(/export type ReceiptKind\s*=([\s\S]*?);/)?.[1] ?? "";
  assert.match(app, /export interface SubmissionReceipt\s*\{/);
  for (const kind of ["envio", "rejeicao", "fechamento"]) {
    assert.match(receiptKinds, new RegExp(`"${kind}"`));
  }
  assert.match(app, /receipts\s*:\s*SubmissionReceipt\[\]/);
  assert.match(app, /export function createReceipt/);
  assert.match(app, /receipts\s*:\s*previous\?\.receipts\s*\?\?\s*\[\]/);
  assert.match(app, /createReceipt\(\s*"envio"/);
  assert.match(app, /createReceipt\(\s*"rejeicao"/);
  assert.match(app, /createReceipt\(\s*"fechamento"/);
  assert.match(app, /function ReceiptTimeline/);
  assert.match(app, /Comprovante de envio/);
  assert.match(app, /Comprovante de rejeição/);
  assert.match(app, /Comprovante de fechamento/);
  assert.equal((app.match(/<ReceiptTimeline/g) ?? []).length, 3);
  assert.doesNotMatch(app, /function ReceiptStrip/);
  assert.match(styles, /\.receipt-timeline/);
  assert.match(styles, /\.receipt-rejeicao/);
  assert.match(styles, /\.receipt-fechamento/);
});

test("TAREFA_UI §9: estados vazios orientam e a base de acessibilidade permanece", () => {
  assert.match(app, /Quando a STC abrir uma coleta para o seu órgão, ela aparece aqui/);
  assert.match(app, /Nenhum ciclo combina com estes filtros/);
  assert.match(app, /Nenhum registro encontrado no período e filtros selecionados/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /focus-visible/);
});

test("Task 8: contratos integrados de acesso, registro, histórico e wizard", () => {
  assert.match(app, /"resp-general-access"/);
  assert.match(app, /function RespGeneralAccess\s*\(/);
  assert.match(app, /objectOverrides/);
  assert.match(app, /setObjectOverrides/);
  assert.match(app, /Período inicial/);
  assert.match(app, /Período final/);
  assert.match(app, /aria-current\s*=\s*\{[^}]*"step"/);

  for (const tone of ["success", "warning", "danger"]) {
    assert.match(styles, new RegExp(`\\.quality-strip\\.${tone}\\s*\\{`));
  }
});

test("TAREFA_UI fundamentos: prazo com contexto, toast e UG com ponto focal cadastrável", () => {
  assert.match(app, /function deadlineContext/);
  assert.match(app, /className="toast"/);
  assert.match(styles, /\.toast \{/);
  assert.match(app, /focalName/);
  assert.match(app, /focalEmail/);
  assert.match(app, /esfera/);
  assert.match(app, /useState<Ug\[\]>\(seedUgs\)/);
});

test("Task 6: vocabulário distingue o ciclo em criação das coletas individuais aprovadas", () => {
  assert.match(app, /Criar Ciclo/);
  assert.match(app, /Enviar ciclo para análise/);
  assert.match(app, /title="Aprovar Ciclo"/);
  assert.match(app, /Aprovar e enviar às UGs/);
  assert.match(app, /Vê o acionamento inteiro do órgão/);
  assert.match(app, /Dá ciência quando a coleta exige/);
  assert.match(app, /não vê o conceito de acionamento/);
  assert.match(app, /A STC cria o acionamento e gera o link de cada coleta/);
  assert.doesNotMatch(app, /Criar coleta|Acionar e gerar links das coletas/);
});

test("alvos de toque preservam no mínimo 44px nos controles de navegação e criação", () => {
  const roleButtonRules = styles.match(/\.role-switch button \{[\s\S]*?\n\}/)?.[0] ?? "";
  const mobileRoleRules = styles.match(/@media \(max-width: 820px\)[\s\S]*?\.role-switch button \{[\s\S]*?\n\s*\}/)?.[0] ?? "";
  const mobileSidebarRules = styles.match(/@media \(max-width: 820px\)[\s\S]*?\.sidebar nav button \{[\s\S]*?\n\s*\}/)?.[0] ?? "";
  const detailsControlRules = styles.match(/\.details-form input,[\s\S]*?\.cycle-meta-grid input \{[\s\S]*?\n\}/)?.[0] ?? "";
  const switchRules = styles.match(/\.switch \{[\s\S]*?\n\}/)?.[0] ?? "";
  const profileTriggerRules = styles.match(/(?:^|\n)\.profile-avatar \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(roleButtonRules, /min-height: 44px/);
  assert.match(mobileRoleRules, /min-height: 44px/);
  assert.match(mobileSidebarRules, /min-height: 44px/);
  assert.match(detailsControlRules, /min-height: 44px/);
  assert.match(switchRules, /height: 44px/);
  assert.match(profileTriggerRules, /min-width: 44px/);
  assert.match(profileTriggerRules, /min-height: 44px/);
});

test("Task 6 pós-revisão: recuperação do clipboard e foco acessível", () => {
  const focusRules = styles.match(/button:focus-visible,[\s\S]*?\n\}/)?.[0] ?? "";
  const chipLinkRules = styles.match(/\.chip-link \{[\s\S]*?\n\}/)?.[0] ?? "";
  const selectableLinkRules = styles.match(/\.collection-link-text \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(app, /className="collection-link-text"/);
  assert.match(app, /toastIsClipboardError/);
  assert.match(app, /className="toast error"/);
  assert.match(app, /className="toast-icon error"[\s\S]*?<Icon name="x"/);
  assert.match(app, /className="toast-icon success"[\s\S]*?<Icon name="check"/);
  assert.match(styles, /\.toast\.error \{/);
  assert.match(selectableLinkRules, /user-select: text/);
  assert.match(focusRules, /outline: 3px solid #075ea8/);
  assert.match(focusRules, /box-shadow: 0 0 0 3px #fff/);
  assert.doesNotMatch(focusRules, /rgba\(/);
  assert.match(chipLinkRules, /min-height: 44px/);
  assert.match(chipLinkRules, /padding: 10px 6px/);
});

test("layout mobile: nota compacta e workspace sem sidebar para o órgão", () => {
  assert.match(styles, /\.topbar-compact-note/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*\.topbar \{/);
  assert.match(styles, /\.workspace\.ug-workspace/);
  assert.match(app, /!isStcRole\(role\)\) return null/);
});

test("layout mobile: seletor dos quatro perfis usa grade 2 × 2 sem ampliar a página", () => {
  assert.match(styles, /\.role-switch \{\s*display: grid;\s*grid-column: 1 \/ -1;\s*grid-row: 2;/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(styles, /\.role-switch button \{[\s\S]*?min-width: 0;/);
});

test("fila da análise reserva a largura do card para o título e empilha o status", () => {
  const queueButtonRules = styles.match(/\.creation-review-list > button \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(queueButtonRules, /grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(styles, /\.creation-review-list > button \.status-pill \{\s*justify-self: start;/);
});

test("formulário da análise empilha rótulos e controles sem comprimir os campos", () => {
  assert.match(styles, /\.creation-review-form label,[\s\S]*?\.creation-review-actions label \{\s*display: grid;/);
  const reviewControlRules = styles.match(/\.creation-review-form input,[\s\S]*?\.creation-review-actions textarea \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(reviewControlRules, /min-width: 0;/);
  assert.match(reviewControlRules, /width: 100%;/);
  assert.match(reviewControlRules, /box-sizing: border-box;/);
});
