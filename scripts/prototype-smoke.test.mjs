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

test("modelo atual: perfis separados e coleta individual sem Submission", () => {
  assert.match(app, /"ponto-focal"/);
  assert.match(app, /"respondente"/);
  assert.match(app, /type ObjectKind = "fixo" \| "variavel"/);
  assert.match(app, /export interface Collection/);
  assert.match(app, /interface Respondent/);
  assert.match(app, /ownerType: CollectionOwnerType/);
  assert.match(app, /ownerId: string/);
  assert.doesNotMatch(app, /interface Submission|\.submissions|collectionIds/);
  assert.match(app, /export interface CycleItem[\s\S]*?linkToken: string/);
  assert.match(app, /requiresFocalPointValidation/);
});

test("estados da coleta, estado agregado do ciclo e indisponibilidade são separados", () => {
  assert.match(app, /export type CollectionStatus =[\s\S]*?"aguardando-ponto-focal"[\s\S]*?"aguardando-stc"[\s\S]*?"em-correcao"[\s\S]*?"aprovada"/);
  assert.match(app, /export type CycleStatus =[\s\S]*?"em-andamento"[\s\S]*?"finalizado"[\s\S]*?"sem-envio-no-prazo"/);
  assert.match(app, /export type ResponseKind = "dados" \| "indisponibilidade"/);
  assert.doesNotMatch(app, /isNegative|"resposta-negativa"/);
});

test("revisão da criação gera um único link estável e nenhuma coleta vazia", () => {
  assert.match(
    app,
    /type CreationReviewStatus = "aguardando-analise" \| "ajustes-solicitados" \| "aprovado"/,
  );
  assert.match(app, /interface CycleReviewEvent/);
  assert.match(app, /creationStatus: CreationReviewStatus/);
  assert.match(app, /reviewHistory: CycleReviewEvent\[\]/);
  assert.match(app, /reviewDraft\.objectKind === "fixo" && !object/);
  assert.match(app, /cycle\.creationStatus === "aprovado"/);
  assert.match(app, /reviewedCycle\.linkToken = cycle\.linkToken \|\| `agz-\$\{cycle\.id\}`/);
  assert.doesNotMatch(app, /collectionIds|\.submissions/);
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
  assert.match(
    app,
    /status:\s*statusAfterCollectionSend\(\s*collection\.ownerType,\s*Boolean\(cycle\?\.requiresFocalPointValidation\),\s*false,\s*\)/,
  );
  assert.doesNotMatch(app, /!resending &&/);
});

test("indisponibilidade respeita o gate do focal sem virar estado de pipeline", () => {
  assert.match(
    app,
    /status:\s*statusAfterCollectionSend\(\s*collection\.ownerType,\s*Boolean\(cycle\?\.requiresFocalPointValidation\),\s*true,\s*\)/,
  );
  assert.match(app, /status: statusAfterFocal\(collection\.responseKind === "indisponibilidade"\)/);
  assert.match(app, /responseKind: "indisponibilidade"/);
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

test("prazo vencido é derivado e não vira estado da coleta", () => {
  assert.match(app, /function isPastDeadline/);
  assert.match(app, />Atrasada</);
  assert.match(
    app,
    /export type CollectionStatus =\s*\| "pendente"\s*\| "rascunho"\s*\| "aguardando-ponto-focal"\s*\| "aguardando-stc"\s*\| "em-correcao"\s*\| "aprovada";/,
  );
  assert.doesNotMatch(app, /CollectionStatus[\s\S]{0,180}"atrasada"/);
});

test("anexos do Tesauro usam o mapeamento gerado por objeto e variável começa vazia", () => {
  assert.doesNotMatch(app, /fixedObjectAttachments/);
  assert.match(app, /const attachmentCatalog = tesauroAttachments/);
  assert.match(app, /function requiredAttachmentsForObject/);
  assert.match(app, /attachmentIds\?: readonly string\[\]/);
  assert.match(app, /requiredAttachments: requiredAttachmentsForObject\(object, registeredAttachments\)/);
  assert.match(app, /requiredAttachmentsForObject\(object, objectAttachmentsRegistry\[object\.code\] \?\? \[\]\)/);
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

test("painel do ponto focal: ciclos expansíveis, coletas individuais e ações do papel", () => {
  assert.match(app, /focal-dashboard/);
  assert.match(app, /focal-cycle-accordion/);
  assert.match(app, /aria-expanded=\{expanded\}/);
  assert.match(app, /Validar e encaminhar à STC/);
  assert.match(app, /Criar coleta do respondente/);
  assert.match(app, /Responder como ponto focal/);
  assert.match(app, /Sinalizar à STC/);
});

test("ponto focal vê somente ciclos e coletas da própria UG", () => {
  assert.match(app, /aguardando sua validação/);
  assert.match(app, /item\.ugId === focalUg\.id/);
  assert.match(app, /Adicionar respondente/);
  assert.match(app, /Dar ciência da negativa e encaminhar à STC/);
  assert.match(app, /Ciclos do órgão/);
  assert.match(app, /Coleta individual/);
});

test("validação STC: rejeição reabre a coleta e cada resposta permanece individual", () => {
  assert.match(app, /Rejeitar envio/);
  assert.match(app, /reabre a coleta/);
  assert.match(app, /cycleCollections\.map\(\(collection\) =>/);
  assert.doesNotMatch(app, /\.submissions/);
  assert.match(app, /observations/);
  assert.match(app, /ObservationThread/);
  assert.match(app, /Sinalizações recebidas dos pontos focais/);
});

test("pendências da STC marcadas no código, sem respostas inventadas", () => {
  assert.match(app, /TODO\(P-020\)/);
  assert.match(app, /TODO\(P-021\)/);
  assert.match(app, /TODO\(P-022\)/);
});

test("login único centralizado identifica perfis sem seletor permanente", () => {
  assert.match(app, /unified-login-screen/);
  assert.match(app, /unified-login-card/);
  assert.match(styles, /\.login-only \.content \{\s*padding: 0;/);
  assert.match(styles, /\.unified-login-screen[\s\S]*?place-items: center/);
  assert.match(app, /<form className="unified-login-form"/);
  assert.match(app, /Primeiro acesso\? Veja como criar seu cadastro/);
  assert.doesNotMatch(app, /Entrar como|role-switch/);
  assert.match(app, /type StcRole = "stc-analista" \| "stc-especialista"/);
  assert.match(app, /label: "Painel STC"/);
  assert.match(app, /title: "Criar Ciclo"/);
  assert.match(app, /title: "Aprovar Ciclo"/);
  assert.match(app, /title: "Acompanhar ciclos"/);
  assert.match(app, /function ProfileDrawer/);
});

test("status de ciclo e coleta usam paleta operacional coerente", () => {
  assert.match(
    app,
    /export type CycleStatus =\s*\| "em-andamento"\s*\| "finalizado"\s*\| "sem-envio-no-prazo"/,
  );
  assert.doesNotMatch(app, /"respondido"/);
  assert.match(app, /Aguardando análise da STC/);
  assert.match(app, /"aguardando-ponto-focal": "warning"/);
  assert.match(app, /"aguardando-stc": "warning"/);
  assert.match(app, /"em-correcao": "orange"/);
  assert.match(app, /aprovada: "success"/);
  assert.match(styles, /\.status-pill\.orange/);
  assert.match(styles, /\.focal-cycle-accordion\.finalizado/);
});

test("Task 2: status agregado recebe o ciclo e todas as coletas", () => {
  assert.match(
    app,
    /export function deriveCycleStatus\([\s\S]*?collections: Collection\[\],[\s\S]*?\): CycleStatus/,
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

test("acesso pelo link único tem cadastro e login com contexto do ciclo", () => {
  assert.match(app, /access-doors/);
  assert.match(app, /Você chegou pelo link deste ciclo/);
  assert.match(app, /enviada em nome do órgão/);
  assert.match(app, /onLogin: \(email: string, password: string\) => boolean/);
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
  assert.match(app, /export interface CollectionReceipt\s*\{/);
  for (const kind of ["envio", "rejeicao", "fechamento"]) {
    assert.match(receiptKinds, new RegExp(`"${kind}"`));
  }
  assert.match(app, /receipts\s*:\s*CollectionReceipt\[\]/);
  assert.match(app, /export function createReceipt/);
  assert.match(app, /\.\.\.collection\.receipts/);
  assert.match(app, /\.\.\.item\.receipts/);
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

test("contratos integrados usam login único, registro, histórico e wizard", () => {
  assert.doesNotMatch(app, /resp-general-access|function RespGeneralAccess/);
  assert.match(app, /function LoginScreen\s*\(/);
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

test("vocabulário distingue ciclos da STC e coletas individuais", () => {
  assert.match(app, /Criar Ciclo/);
  assert.match(app, /Enviar ciclo para análise/);
  assert.match(app, /title="Aprovar Ciclo"/);
  assert.match(app, /Aprovar e enviar às UGs/);
  assert.match(app, /Coordenar a resposta do órgão/);
  assert.match(app, /Somente suas coletas/);
  assert.match(app, /Um link por ciclo, anexado ao SEI/);
  assert.match(app, /coleta individual/);
  assert.doesNotMatch(app, /\.submissions|collectionIds/);
});

test("alvos de toque preservam no mínimo 44px nos controles de navegação e criação", () => {
  const loginButtonRules = styles.match(/\.unified-login-form \.primary-button \{[\s\S]*?\n\}/)?.[0] ?? "";
  const logoutRules = styles.match(/\.topbar-logout \{[\s\S]*?\n\}/)?.[0] ?? "";
  const mobileSidebarRules = styles.match(/@media \(max-width: 820px\)[\s\S]*?\.sidebar nav button \{[\s\S]*?\n\s*\}/)?.[0] ?? "";
  const detailsControlRules = styles.match(/\.details-form input,[\s\S]*?\.cycle-meta-grid input \{[\s\S]*?\n\}/)?.[0] ?? "";
  const switchRules = styles.match(/\.switch \{[\s\S]*?\n\}/)?.[0] ?? "";
  const profileTriggerRules = styles.match(/(?:^|\n)\.profile-avatar \{[\s\S]*?\n\}/)?.[0] ?? "";
  const uploadRules = styles.match(/\.review-item-actions \.ghost-button \{[\s\S]*?\n\}/)?.[0] ?? "";
  const removeAttachmentRules = styles.match(/\.chips button \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(loginButtonRules, /min-height: 50px/);
  assert.match(logoutRules, /min-height: 44px/);
  assert.match(mobileSidebarRules, /min-height: 44px/);
  assert.match(detailsControlRules, /min-height: 44px/);
  assert.match(switchRules, /height: 44px/);
  assert.match(profileTriggerRules, /min-width: 44px/);
  assert.match(profileTriggerRules, /min-height: 44px/);
  assert.match(uploadRules, /min-height: 44px/);
  assert.match(removeAttachmentRules, /width: 44px/);
  assert.match(removeAttachmentRules, /height: 44px/);
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

test("layout mobile mantém topbar e painel contextual sem ampliar a página", () => {
  assert.doesNotMatch(styles, /\.role-switch/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*?\.topbar \{\s*grid-template-columns: 1fr;/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\) 44px auto/);
  assert.match(styles, /grid-template-areas: "content guidance"/);
  assert.doesNotMatch(styles, /\.role-guidance-panel \{\s*order: -1;/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*?\.role-guidance-panel p,[\s\S]*?font-size: 0\.95rem/);
});

test("auditoria de foco preserva contraste no acordeão focal", () => {
  const focalFocusRules = styles.match(/\.focal-cycle-toggle:focus-visible \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(focalFocusRules, /outline: 3px solid #075ea8/);
  assert.match(focalFocusRules, /outline-offset: 3px/);
  assert.doesNotMatch(focalFocusRules, /rgba\(/);
});

test("datas operacionais são calculadas no momento da ação e no fuso local", () => {
  assert.match(app, /export function dateIsoAtTimezoneOffset/);
  assert.match(app, /function currentDateLabel\(\)/);
  assert.doesNotMatch(app, /const today\s*=/);
  assert.match(app, /currentDateLabel\(\)/);
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
