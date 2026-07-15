import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, {
  attachmentsMeetRequirement,
  cycleAcceptsNewCollections,
  createReceipt,
  dateIsoAtTimezoneOffset,
  deriveCycleStatus,
  statusAfterCollectionSend,
  statusAfterFocal,
  statusAfterRespondentSend,
  type Collection,
  type CycleItem,
} from "./App";
import * as AppModule from "./App";

Object.defineProperty(window, "scrollTo", {
  value: () => undefined,
  writable: true,
});

afterEach(() => cleanup());

const firstCollectionUrl = "https://agiliza.ma.gov.br/ciclo/agz-ciclo-100";
const clipboardErrorMessage = "Não foi possível copiar — selecione o link exibido";

function replaceClipboard(
  clipboard: { writeText: (value: string) => Promise<void> } | undefined,
) {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: clipboard,
  });

  return () => {
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  };
}

function expectSelectableUrlInCopyCard(copyButton: HTMLElement) {
  const card = copyButton.closest("article");
  expect(card).toBeTruthy();
  const visibleUrl = within(card as HTMLElement).getByText(firstCollectionUrl);
  expect(visibleUrl.tagName).toBe("CODE");
  expect(visibleUrl.classList.contains("collection-link-text")).toBe(true);
  expect(visibleUrl.closest("button")).toBeNull();
}

type DemoProfile = "analista" | "especialista" | "ponto-focal" | "respondente";

async function loginAs(
  user: ReturnType<typeof userEvent.setup>,
  profile: DemoProfile,
  respondentEmail = "joao.lima@seduc.ma.gov.br",
) {
  const logout = screen.queryByRole("button", { name: "Sair" });
  if (logout) await user.click(logout);
  const emails: Record<DemoProfile, string> = {
    analista: "analista@stc.ma.gov.br",
    especialista: "especialista@stc.ma.gov.br",
    "ponto-focal": "maria.costa@seduc.ma.gov.br",
    respondente: respondentEmail,
  };
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: emails[profile] } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-simulada" } });
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

type StcHomeAction = "Criar Ciclo" | "Aprovar Ciclo" | "Acompanhar ciclos";

async function openStcHomeAction(
  user: ReturnType<typeof userEvent.setup>,
  action: StcHomeAction,
) {
  await user.click(screen.getByRole("button", { name: "Painel STC" }));
  await user.click(
    within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", {
      name: new RegExp(action, "i"),
    }),
  );
}

async function openVariableDemoAsJoao(user: ReturnType<typeof userEvent.setup>) {
  await loginAs(user, "respondente");
  const title = screen.getByText("VAR-0000 · Demonstração variável", { selector: "strong" });
  const card = title.closest("article");
  expect(card).toBeTruthy();
  await user.click(within(card as HTMLElement).getByRole("button", { name: "Responder coleta" }));
}

function expectCurrentStcNavigation(label: "Painel STC" | "Histórico" | "Registro") {
  const navigation = screen.getByRole("navigation", { name: "Navegação STC" });
  const currentItem = within(navigation).getByRole("button", { name: label });
  expect(currentItem.getAttribute("aria-current")).toBe("page");
  expect(
    within(navigation)
      .getAllByRole("button")
      .filter((item) => item.getAttribute("aria-current") === "page"),
  ).toEqual([currentItem]);
}

async function createCycleForReview(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await openStcHomeAction(user, "Criar Ciclo");
  await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));
  await user.click(screen.getByRole("button", { name: /MT-0016\s+Estagiário/i }));
  await user.click(screen.getByRole("button", { name: /SEDUC Secretaria de Estado da Educação/ }));
  await user.click(screen.getByRole("button", { name: /SAF Secretaria de Administração/ }));
  const titleInput = screen.getByLabelText("Título");
  fireEvent.change(titleInput, { target: { value: title } });
  await user.click(screen.getByRole("button", { name: "Enviar ciclo para análise" }));
}

function cycleCard(title: string) {
  const titleNode = screen.getByText(title, { selector: "strong" });
  const card = titleNode.closest("article");
  expect(card).toBeTruthy();
  return within(card as HTMLElement);
}

describe("Agiliza Transparência", () => {
  test("coleta individual é criada de forma idempotente por ciclo e responsável", () => {
    const ensureCollection = (
      AppModule as unknown as {
        ensureIndividualCollection?: (
          collections: unknown[],
          cycle: { id: string },
          owner: { id: string; type: "respondente"; name: string; ugId: string },
        ) => { collections: Array<{ id: string; status: string }>; collection: { id: string; status: string }; created: boolean };
      }
    ).ensureIndividualCollection;

    expect(ensureCollection).toBeTypeOf("function");
    if (!ensureCollection) return;

    const cycle = { id: "ciclo-teste" };
    const owner = { id: "resp-teste", type: "respondente" as const, name: "Ana Teste", ugId: "seduc" };
    const first = ensureCollection([], cycle, owner);
    const second = ensureCollection(first.collections, cycle, owner);

    expect(first.created).toBe(true);
    expect(first.collection.status).toBe("pendente");
    expect(second.created).toBe(false);
    expect(second.collection.id).toBe(first.collection.id);
    expect(second.collections).toHaveLength(1);
  });

  test("link do ciclo só existe depois da aprovação e é único para todas as UGs", () => {
    const cycleLink = (
      AppModule as unknown as {
        cycleLink?: (cycle: { creationStatus: string; linkToken: string }) => string | null;
      }
    ).cycleLink;
    expect(cycleLink).toBeTypeOf("function");
    if (!cycleLink) return;

    expect(cycleLink({ creationStatus: "aguardando-analise", linkToken: "" })).toBeNull();
    expect(cycleLink({ creationStatus: "aprovado", linkToken: "agz-ciclo-200" })).toBe(
      "agiliza.ma.gov.br/ciclo/agz-ciclo-200",
    );
  });

  test("status da coleta separa indisponibilidade da etapa operacional", () => {
    expect(statusAfterRespondentSend(true, true)).toBe("aguardando-ponto-focal");
    expect(statusAfterRespondentSend(false, true)).toBe("aguardando-stc");
    expect(statusAfterFocal(true)).toBe("aguardando-stc");
  });

  test("coleta respondida pelo próprio ponto focal segue direto para a STC", () => {
    expect(statusAfterCollectionSend("ponto-focal", true)).toBe("aguardando-stc");
    expect(statusAfterCollectionSend("ponto-focal", true, true)).toBe("aguardando-stc");
    expect(statusAfterCollectionSend("respondente", true)).toBe("aguardando-ponto-focal");
  });

  test("login único centraliza credenciais e cadastro contextual no mesmo card", () => {
    render(<App />);

    const heading = screen.getByRole("heading", { name: "Acesse o Agiliza Transparência" });
    const card = heading.closest("section");
    expect(card).toBeTruthy();
    expect(card?.classList.contains("unified-login-card")).toBe(true);
    expect(within(card as HTMLElement).getByLabelText("E-mail")).toBeTruthy();
    expect(within(card as HTMLElement).getByLabelText("Senha")).toBeTruthy();
    expect(
      within(card as HTMLElement).getByText("Primeiro acesso como respondente? Use o link do ciclo recebido no SEI."),
    ).toBeTruthy();
  });

  test("ponto focal recebe painel direito permanente e ciclos expansíveis por UG", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("E-mail"), "maria.costa@seduc.ma.gov.br");
    await user.type(screen.getByLabelText("Senha"), "senha-simulada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const guidance = screen.getByRole("complementary", { name: "Orientações do ponto focal" });
    expect(within(guidance).getByText("O que você pode fazer")).toBeTruthy();
    expect(within(guidance).getByText("O que você não pode fazer")).toBeTruthy();
    expect(within(guidance).queryByRole("button", { name: /fechar/i })).toBeNull();

    const cycleToggle = screen.getByRole("button", { name: /Ciclo MT-0016.*Estagiário/i });
    expect(cycleToggle.getAttribute("aria-expanded")).toBe("false");
    await user.click(cycleToggle);
    expect(cycleToggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("João Lima")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adicionar respondente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Responder como ponto focal" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sinalizar à STC" })).toBeTruthy();
  });

  test("orientação permanente vem antes do conteúdo principal na ordem semântica", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "ponto-focal");

    const guidance = screen.getByRole("complementary", { name: "Orientações do ponto focal" });
    const main = screen.getByRole("main");
    expect(guidance.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("ciclo finalizado não oferece ações que criam novas coletas", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "helena.prado@sinfra.ma.gov.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-simulada" } });
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByRole("button", { name: /Ciclo MT-0012.*Obra pública em execução/i }));

    expect(screen.queryByRole("button", { name: "Adicionar respondente" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Responder como ponto focal" })).toBeNull();
    expect(screen.getByText(/ciclo finalizado.*novas coletas/i)).toBeTruthy();
  });

  test("ponto focal não cadastra respondente com e-mail reservado de outro perfil institucional", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "ponto-focal");

    await user.click(screen.getByRole("button", { name: /Ciclo MT-0016.*Estagiário/i }));
    await user.click(screen.getByRole("button", { name: "Adicionar respondente" }));
    fireEvent.change(screen.getByLabelText("Nome do respondente"), { target: { value: "Ricardo Alves" } });
    fireEvent.change(screen.getByLabelText("E-mail institucional"), {
      target: { value: "ricardo.alves@saf.ma.gov.br" },
    });
    await user.click(screen.getByRole("button", { name: "Criar coleta do respondente" }));

    expect(screen.getByRole("status").textContent).toContain("perfil institucional");
    expect(screen.queryByText("Ricardo Alves")).toBeNull();
  });

  test("cada ponto focal entra pela própria UG e registra ações com sua identidade", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ricardo.alves@saf.ma.gov.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-simulada" } });
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      screen.getByRole("heading", { name: "Ricardo Alves — Secretaria de Administração" }),
    ).toBeTruthy();
    const guidance = screen.getByRole("complementary", { name: "Orientações do ponto focal" });
    expect(within(guidance).getByText("Ponto focal · SAF")).toBeTruthy();
    expect(screen.queryByText("Ciclo VAR-0000 - Demonstração variável")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Ciclo MT-0016.*Estagiário/i }));
    expect(screen.queryByText("João Lima")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sinalizar à STC" }));
    fireEvent.change(screen.getByLabelText("Mensagem para a STC"), {
      target: { value: "A SAF precisa confirmar a competência deste dado." },
    });
    await user.click(screen.getByRole("button", { name: "Registrar sinalização" }));

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0016 - Estagiário").getByRole("button", { name: "Exibir detalhes" }));
    const signals = screen.getByRole("heading", { name: "Sinalizações dos pontos focais" }).closest("section");
    expect(signals).toBeTruthy();
    expect(within(signals as HTMLElement).getByText("SAF")).toBeTruthy();
    expect(within(signals as HTMLElement).getByText("A SAF precisa confirmar a competência deste dado.")).toBeTruthy();
    expect(within(signals as HTMLElement).getByText(/Ricardo Alves/)).toBeTruthy();
  });

  test("sinalização do ponto focal chega à STC como registro somente leitura", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "ponto-focal");

    await user.click(screen.getByRole("button", { name: /Ciclo MT-0016.*Estagiário/i }));
    await user.click(screen.getByRole("button", { name: "Sinalizar à STC" }));
    fireEvent.change(screen.getByLabelText("Mensagem para a STC"), {
      target: { value: "Precisamos de orientação sobre o período solicitado." },
    });
    await user.click(screen.getByRole("button", { name: "Registrar sinalização" }));

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0016 - Estagiário").getByRole("button", { name: "Exibir detalhes" }));

    expect(screen.getByRole("heading", { name: "Sinalizações dos pontos focais" })).toBeTruthy();
    expect(screen.getByText("Precisamos de orientação sobre o período solicitado.")).toBeTruthy();
    expect(screen.getByText("Somente leitura")).toBeTruthy();
  });

  test("respondente autenticado vê somente coletas próprias e não vê o conceito de ciclo", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("E-mail"), "joao.lima@seduc.ma.gov.br");
    await user.type(screen.getByLabelText("Senha"), "senha-simulada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("complementary", { name: "Orientações do respondente" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Minhas coletas — João Lima" })).toBeTruthy();
    expect(screen.getByText(/MT-0016\s*·\s*Estagiário/i)).toBeTruthy();
    expect(screen.queryByText("Clara Nunes")).toBeNull();
    expect(screen.queryByText(/Ciclo MT-/i)).toBeNull();
  });

  test("contagem permite mínimo e excedente", () => {
    expect(attachmentsMeetRequirement(2, 3)).toBe(false);
    expect(attachmentsMeetRequirement(3, 3)).toBe(true);
    expect(attachmentsMeetRequirement(4, 3)).toBe(true);
  });

  test("comprovante permite voltar às etapas em modo somente leitura", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "respondente", "clara.nunes@sinfra.ma.gov.br");
    await user.click(screen.getAllByRole("button", { name: "Ver comprovante" })[0]);
    const howTo = screen.getByRole("button", { name: /Etapa 1: Como responder/ });
    expect((howTo as HTMLButtonElement).disabled).toBe(false);
    await user.click(howTo);
    expect(screen.getByText("Resposta enviada — consulta somente leitura")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Preencher e subir/ }));
    expect(screen.getByText("Resposta enviada — consulta somente leitura")).toBeTruthy();
    expect(screen.getByText("mt-0018_sinfra_obras.xlsx")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: /Arraste aqui ou clique para simular a seleção/,
      }),
    ).toBeNull();
    expect(
      screen.queryByText("Arraste aqui ou clique para simular a seleção"),
    ).toBeNull();
    expect(
      screen.queryByLabelText("Simular planilha fora do modelo (colunas divergentes)"),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar rascunho" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Enviar e gerar comprovante|Reenviar corrigido/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Não tenho esta informação" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: /Anexos obrigatórios/ }));
    expect(screen.getByText("Resposta enviada — consulta somente leitura")).toBeTruthy();
    expect(screen.getByText("edital_042_2026.pdf")).toBeTruthy();
    expect(screen.getByText("publicacao_aviso_042.pdf")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar arquivo" })).toBeNull();
    expect(screen.queryAllByRole("button", { name: /^Remover / })).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: /Não tenho todos os anexos.*falar com a STC/ }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar rascunho" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Enviar e gerar comprovante|Reenviar corrigido/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Não tenho esta informação" }),
    ).toBeNull();
  });

  test("stepper anuncia semanticamente a etapa atual", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVariableDemoAsJoao(user);

    const firstStep = screen.getByRole("button", { name: /Etapa 1: Como responder/ });
    const secondStep = screen.getByRole("button", { name: /Etapa 2: Preencher e subir/ });
    expect(firstStep.getAttribute("aria-current")).toBe("step");
    expect(secondStep.getAttribute("aria-current")).toBeNull();

    await user.click(secondStep);
    expect(firstStep.getAttribute("aria-current")).toBeNull();
    expect(secondStep.getAttribute("aria-current")).toBe("step");
  });

  test("drop usa somente o nome simulado e ignora o arquivo real", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVariableDemoAsJoao(user);
    await user.click(screen.getByRole("button", { name: /Preencher e subir/ }));

    const dropInstruction = screen.getByText("Arraste aqui ou clique para simular a seleção");
    const dropzone = dropInstruction.closest(".dropzone");
    expect(dropzone).toBeTruthy();
    const realFile = new File(["conteúdo sentinela"], "arquivo-real-sentinela.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.dragOver(dropzone as HTMLElement, { dataTransfer: { files: [realFile] } });
    fireEvent.drop(dropzone as HTMLElement, { dataTransfer: { files: [realFile] } });

    expect(screen.getByText("var-0000_seduc_preenchida.xlsx")).toBeTruthy();
    expect(screen.queryByText("arquivo-real-sentinela.xlsx")).toBeNull();
  });

  test("faixa estrutural aceita zero anexos exigidos e ainda reprova planilha fora do modelo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openVariableDemoAsJoao(user);
    await user.click(screen.getByRole("button", { name: /Preencher e subir/ }));

    const qualityStrip = () =>
      screen
        .getByText("Checagem estrutural no envio — duas conferências independentes")
        .closest(".quality-strip") as HTMLElement;

    expect(qualityStrip().classList.contains("warning")).toBe(true);
    expect(qualityStrip().classList.contains("success")).toBe(false);

    await user.click(
      screen.getByRole("button", { name: /Arraste aqui ou clique para simular a seleção/ }),
    );
    expect(qualityStrip().classList.contains("success")).toBe(true);

    await user.click(screen.getByLabelText("Simular planilha fora do modelo (colunas divergentes)"));
    expect(qualityStrip().classList.contains("danger")).toBe(true);
    expect(qualityStrip().classList.contains("success")).toBe(false);
  });

  test("login único identifica o perfil pelo e-mail", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Acesse o Agiliza Transparência" })).toBeTruthy();
    expect(screen.getByLabelText("E-mail")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
    expect(screen.getByText(/Primeiro acesso como respondente\? Use o link do ciclo/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Entrar como/i })).toBeNull();
  });

  test.each(["Analista STC", "Especialista STC"] as const)(
    "sidebar de %s mantém somente os destinos persistentes",
    async (profile) => {
      const user = userEvent.setup();
      render(<App />);

      await loginAs(user, profile === "Analista STC" ? "analista" : "especialista");

      const navigation = screen.getByRole("navigation", { name: "Navegação STC" });
      expect(
        within(navigation)
          .getAllByRole("button")
          .map((button) => button.textContent?.trim()),
      ).toEqual(["Painel STC", "Histórico", "Registro"]);
      expectCurrentStcNavigation("Painel STC");
    },
  );

  test("analista recebe somente Criar Ciclo e Acompanhar ciclos na home", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "analista");

    expect(screen.getByRole("heading", { name: "Painel STC" })).toBeTruthy();
    const actions = within(screen.getByLabelText("Ações do perfil STC"));
    expect(actions.getByRole("button", { name: /Criar Ciclo/ })).toBeTruthy();
    expect(actions.getByRole("button", { name: /Acompanhar ciclos/ })).toBeTruthy();
    expect(actions.queryByRole("button", { name: /Aprovar Ciclo/ })).toBeNull();
  });

  test("especialista recebe somente Aprovar Ciclo e Acompanhar ciclos na home", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "especialista");

    expect(screen.getByRole("heading", { name: "Painel STC" })).toBeTruthy();
    const actions = within(screen.getByLabelText("Ações do perfil STC"));
    expect(actions.getByRole("button", { name: /Aprovar Ciclo/ })).toBeTruthy();
    expect(actions.getByRole("button", { name: /Acompanhar ciclos/ })).toBeTruthy();
    expect(actions.queryByRole("button", { name: /Criar Ciclo/ })).toBeNull();
    expect(actions.queryByRole("button", { name: /Análise da criação/ })).toBeNull();
  });

  test("telas operacionais do analista mantêm Painel STC como destino atual", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");

    await openStcHomeAction(user, "Criar Ciclo");
    expectCurrentStcNavigation("Painel STC");

    await openStcHomeAction(user, "Acompanhar ciclos");
    expectCurrentStcNavigation("Painel STC");
    const operationalCycle = cycleCard("Ciclo MT-0018 - Licitação");
    await user.click(operationalCycle.getByRole("button", { name: "Exibir detalhes" }));
    expectCurrentStcNavigation("Painel STC");

    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0018 - Licitação").getByRole("button", { name: "Validar respostas" }));
    expectCurrentStcNavigation("Painel STC");
  });

  test("aprovação de ciclos mantém Painel STC como destino atual", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "especialista");

    await openStcHomeAction(user, "Aprovar Ciclo");
    expectCurrentStcNavigation("Painel STC");
  });

  test("especialista continua validando respostas recebidas das UGs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "especialista");
    await openStcHomeAction(user, "Acompanhar ciclos");

    const operationalCycle = cycleCard("Ciclo MT-0018 - Licitação");
    await user.click(operationalCycle.getByRole("button", { name: "Validar respostas" }));
    expect(screen.getByRole("heading", { name: "Receber, aprovar ou rejeitar" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Aprovar resposta" }).length).toBeGreaterThan(0);
  });

  test("analista envia ciclo para análise sem gerar coletas ou links", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");

    await createCycleForReview(user, "Ciclo para revisão sem links");

    const card = cycleCard("Ciclo para revisão sem links");
    expect(card.getByText("Aguardando análise da criação")).toBeTruthy();
    expect(card.getByText("Ainda não enviado às UGs")).toBeTruthy();
    expect(card.queryByRole("button", { name: /Copiar link/ })).toBeNull();

    await loginAs(user, "ponto-focal");
    expect(screen.queryByText("Ciclo para revisão sem links")).toBeNull();
  });

  test("filtro da análise não mantém no detalhe um ciclo fora do status selecionado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "especialista");
    await openStcHomeAction(user, "Aprovar Ciclo");

    expect(screen.getByRole("heading", { name: "0 ciclo(s)" })).toBeTruthy();
    expect(screen.queryByText("Configuração completa")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Status da análise"), "aprovado");
    expect(screen.getByText("Configuração completa")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Status da análise"), "ajustes-solicitados");
    expect(screen.getByRole("heading", { name: "0 ciclo(s)" })).toBeTruthy();
    expect(screen.queryByText("Configuração completa")).toBeNull();
  });

  test("analista continua editando enquanto o ciclo aguarda análise", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await createCycleForReview(user, "Ciclo editável em análise");

    await user.click(cycleCard("Ciclo editável em análise").getByRole("button", { name: "Editar ciclo" }));
    const titleInput = screen.getByLabelText("Título");
    fireEvent.change(titleInput, { target: { value: "Ciclo atualizado pelo analista" } });
    await user.click(screen.getByRole("button", { name: "Salvar e manter em análise" }));

    await loginAs(user, "especialista");
    await openStcHomeAction(user, "Aprovar Ciclo");
    expect(screen.getByRole("button", { name: "Analisar Ciclo atualizado pelo analista" })).toBeTruthy();
  });

  test("especialista exige observação para solicitar ajustes e o analista pode reenviar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await createCycleForReview(user, "Ciclo que precisa de ajustes");

    await loginAs(user, "especialista");
    await openStcHomeAction(user, "Aprovar Ciclo");
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo que precisa de ajustes" }));
    await user.click(screen.getByRole("button", { name: "Solicitar ajustes" }));
    expect(screen.getByRole("alert").textContent).toContain("Escreva uma observação");

    await user.type(screen.getByLabelText("Observação para o analista"), "Revise as UGs selecionadas.");
    await user.click(screen.getByRole("button", { name: "Solicitar ajustes" }));

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    const card = cycleCard("Ciclo que precisa de ajustes");
    expect(card.getByText("Ajustes solicitados")).toBeTruthy();
    expect(card.getByText("Revise as UGs selecionadas.")).toBeTruthy();
    await user.click(card.getByRole("button", { name: "Revisar ajustes" }));
    expect(screen.getByRole("button", { name: "Reenviar para análise" })).toBeTruthy();
  }, 20000);

  test("alteração do especialista registra os valores anterior e novo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await createCycleForReview(user, "Ciclo antes da edição especializada");

    await loginAs(user, "especialista");
    await openStcHomeAction(user, "Aprovar Ciclo");
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo antes da edição especializada" }));
    const titleInput = screen.getByLabelText("Título do ciclo em análise");
    fireEvent.change(titleInput, { target: { value: "Ciclo revisado pelo especialista" } });
    const channelInput = screen.getByLabelText("Canal de notificação");
    fireEvent.change(channelInput, { target: { value: "Portal institucional" } });
    const observationsInput = screen.getByLabelText("Observações da criação");
    fireEvent.change(observationsInput, {
      target: { value: "Orientação revisada pelo especialista." },
    });
    await user.click(screen.getByRole("button", { name: "Termo de Recebimento" }));
    await user.click(screen.getByRole("button", { name: /SEDUC Secretaria de Estado da Educação/ }));
    await user.click(screen.getByRole("button", { name: "Fonte Oficial URL ou arquivo" }));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(
      screen.getByText('Título: "Ciclo antes da edição especializada" → "Ciclo revisado pelo especialista"'),
    ).toBeTruthy();
    expect(screen.getByText('Canal: "Email" → "Portal institucional"')).toBeTruthy();
    expect(screen.getByText(/Observações: ".+" → "Orientação revisada pelo especialista\."/)).toBeTruthy();
    expect(screen.getByText('UGs: "seduc, saf" → "saf"')).toBeTruthy();
    expect(screen.getByText(/^Campos obrigatórios: ".+" → ".+"$/)).toBeTruthy();
    expect(screen.getByText('Anexos obrigatórios: "nenhum" → "Termo de Recebimento"')).toBeTruthy();
  }, 20000);

  test("aprovação do especialista libera um link único e publica o ciclo uma única vez", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await createCycleForReview(user, "Ciclo pronto para aprovação");

    await loginAs(user, "especialista");
    await openStcHomeAction(user, "Aprovar Ciclo");
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo pronto para aprovação" }));
    await user.click(screen.getByRole("button", { name: "Aprovar e enviar às UGs" }));
    expect(screen.queryByRole("button", { name: "Aprovar e enviar às UGs" })).toBeNull();

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    const card = cycleCard("Ciclo pronto para aprovação");
    expect(card.getByText("Ciclo em andamento")).toBeTruthy();
    expect(card.getAllByRole("button", { name: /Copiar link do ciclo/ })).toHaveLength(1);

    await loginAs(user, "ponto-focal");
    expect(screen.getByText("Ciclo pronto para aprovação")).toBeTruthy();
  });

  test("prazo vazio bloqueia criação e aprovação do ciclo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await openStcHomeAction(user, "Criar Ciclo");
    await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));
    await user.click(screen.getByRole("button", { name: /MT-0016\s+Estagiário/i }));
    await user.click(screen.getByRole("button", { name: /SEDUC Secretaria de Estado da Educação/ }));

    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "" } });
    expect((screen.getByRole("button", { name: "Enviar ciclo para análise" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("renomear objeto migra ciclos ainda pendentes para o novo código", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await createCycleForReview(user, "Ciclo pendente com objeto renomeado");

    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Editar MT-0016" }));
    const code = screen.getByLabelText("Código do objeto");
    await user.clear(code);
    await user.type(code, "MT-0099");
    await user.click(screen.getByRole("button", { name: "Salvar objeto" }));

    await loginAs(user, "especialista");
    await openStcHomeAction(user, "Aprovar Ciclo");
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo pendente com objeto renomeado" }));
    expect((screen.getByLabelText("Objeto fixo") as HTMLSelectElement).value).toBe("MT-0099");
    await user.click(screen.getByRole("button", { name: "Aprovar e enviar às UGs" }));
    expect(screen.queryByRole("button", { name: "Aprovar e enviar às UGs" })).toBeNull();
  }, 20000);

  test("Registro edita dados básicos do objeto fixo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Editar MT-0016" }));
    const name = screen.getByLabelText("Nome do objeto");
    await user.clear(name);
    await user.type(name, "Estagiários estaduais");
    await user.click(screen.getByRole("button", { name: "Salvar objeto" }));
    expect(screen.getByText("MT-0016 · Estagiários Estaduais")).toBeTruthy();

    await openStcHomeAction(user, "Criar Ciclo");
    await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));
    const updatedObject = screen.getByRole("button", {
      name: /MT-0016\s+Estagiários Estaduais/i,
    });
    expect(updatedObject).toBeTruthy();
    await user.click(updatedObject);
    await user.click(screen.getByRole("button", { name: /SEDUC Secretaria de Estado da Educação/ }));
    await user.click(screen.getByRole("button", { name: "Enviar ciclo para análise" }));

    const createdCycle = cycleCard("Ciclo MT-0016 - Estagiários Estaduais");
    expect(createdCycle.getByText("Aguardando análise da criação")).toBeTruthy();
    expect(createdCycle.queryByRole("button", { name: /Copiar link da coleta/ })).toBeNull();
  });

  test("Registro invalida a seleção editada antes de reconstruir o rascunho", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await openStcHomeAction(user, "Criar Ciclo");
    await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));
    await user.click(screen.getByRole("button", { name: /MT-0016\s+Estagiário/i }));
    expect(screen.getByDisplayValue("Ciclo MT-0016 - Estagiário")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Editar MT-0016" }));
    const code = screen.getByLabelText("Código do objeto");
    const name = screen.getByLabelText("Nome do objeto");
    await user.clear(code);
    await user.type(code, "MT-0099");
    await user.clear(name);
    await user.type(name, "Estagiários estaduais");
    await user.click(screen.getByRole("button", { name: "Salvar objeto" }));

    const updatedRow = screen.getByRole("button", { name: "Editar MT-0099" }).closest("article");
    expect(updatedRow).toBeTruthy();
    const updatedRegistry = within(updatedRow as HTMLElement);
    await user.type(updatedRegistry.getByPlaceholderText("Adicionar anexo ao registro"), "Anexo atualizado");
    await user.click(updatedRegistry.getByRole("button", { name: "Adicionar" }));

    await openStcHomeAction(user, "Criar Ciclo");
    expect(screen.queryByDisplayValue("Ciclo MT-0016 - Estagiário")).toBeNull();
    const updatedObject = screen.getByRole("button", { name: /MT-0099\s+Estagiários Estaduais/i });
    await user.click(updatedObject);
    expect(screen.getByDisplayValue("Ciclo MT-0099 - Estagiários Estaduais")).toBeTruthy();
    expect(screen.getByText("Anexo atualizado")).toBeTruthy();
  });

  test("Registro migra campos e anexos quando o código do objeto muda", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));

    await user.click(screen.getByRole("button", { name: "Campos / informações" }));
    await user.selectOptions(
      screen.getByLabelText("Objeto"),
      screen.getByRole("option", { name: /MT-0016/ }),
    );
    await user.type(
      screen.getByPlaceholderText("Nome do campo (ex.: Valor empenhado)"),
      "Campo migrado",
    );
    await user.click(screen.getByRole("button", { name: "Adicionar campo" }));

    await user.click(screen.getByRole("button", { name: "Objetos fixos" }));
    const originalRow = screen.getByRole("button", { name: "Editar MT-0016" }).closest("article");
    expect(originalRow).toBeTruthy();
    const originalRegistry = within(originalRow as HTMLElement);
    await user.type(originalRegistry.getByPlaceholderText("Adicionar anexo ao registro"), "Anexo migrado");
    await user.click(originalRegistry.getByRole("button", { name: "Adicionar" }));
    await user.click(screen.getByRole("button", { name: "Editar MT-0016" }));
    const code = screen.getByLabelText("Código do objeto");
    const subject = screen.getByLabelText("Tema do objeto");
    const cadence = screen.getByLabelText("Cadência do objeto");
    await user.clear(code);
    await user.type(code, "mt-0099");
    await user.clear(subject);
    await user.type(subject, "Gestão de pessoas");
    await user.clear(cadence);
    await user.type(cadence, "Trimestral");
    await user.click(screen.getByRole("button", { name: "Salvar objeto" }));

    expect(screen.getByText("MT-0099 · Estagiário")).toBeTruthy();
    expect(screen.getByText(/Gestão de pessoas · Trimestral/)).toBeTruthy();
    expect(screen.getByText("Anexo migrado")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Campos / informações" }));
    expect(screen.getByRole("option", { name: /MT-0099/ })).toBeTruthy();
    expect(screen.getByText("Campo migrado")).toBeTruthy();

    await openStcHomeAction(user, "Criar Ciclo");
    await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));
    await user.click(screen.getByRole("button", { name: /MT-0099\s+Estagiário/i }));
    expect(screen.getByText("Anexo migrado")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar objeto fixo" }));
    await user.type(screen.getByLabelText("Código"), "MT-0016");
    await user.type(screen.getByLabelText("Nome"), "Novo objeto no código liberado");
    await user.type(
      screen.getByPlaceholderText("ex.: Número do contrato"),
      "Campo do novo objeto",
    );
    await user.click(screen.getByRole("button", { name: "Adicionar campo" }));
    await user.click(screen.getByRole("button", { name: "Salvar objeto fixo no registro" }));

    expect(screen.getByText("MT-0016 · Novo Objeto No Código Liberado")).toBeTruthy();
  }, 10000);

  test("Registro edita objeto cadastrado localmente", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar objeto fixo" }));
    await user.type(screen.getByLabelText("Código"), "MT-0098");
    await user.type(screen.getByLabelText("Nome"), "Objeto local");
    await user.type(
      screen.getByPlaceholderText("ex.: Número do contrato"),
      "Campo local",
    );
    await user.click(screen.getByRole("button", { name: "Adicionar campo" }));
    await user.click(screen.getByRole("button", { name: "Salvar objeto fixo no registro" }));

    await user.click(screen.getByRole("button", { name: "Editar MT-0098" }));
    const code = screen.getByLabelText("Código do objeto");
    const name = screen.getByLabelText("Nome do objeto");
    const subject = screen.getByLabelText("Tema do objeto");
    const cadence = screen.getByLabelText("Cadência do objeto");
    await user.clear(code);
    await user.type(code, "MT-0097");
    await user.clear(name);
    await user.type(name, "Objeto local editado");
    await user.clear(subject);
    await user.type(subject, "Tema local editado");
    await user.clear(cadence);
    await user.type(cadence, "Anual");
    await user.click(screen.getByRole("button", { name: "Salvar objeto" }));

    expect(screen.getByText("MT-0097 · Objeto Local Editado")).toBeTruthy();
    expect(screen.getByText(/Tema local editado\s*·\s*Anual/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Cadastrar objeto fixo" }));
    await user.type(screen.getByLabelText("Código"), "MT-0098");
    await user.type(screen.getByLabelText("Nome"), "Objeto com código reutilizado");
    await user.type(
      screen.getByPlaceholderText("ex.: Número do contrato"),
      "Campo reutilizado",
    );
    await user.click(screen.getByRole("button", { name: "Adicionar campo" }));
    await user.click(screen.getByRole("button", { name: "Salvar objeto fixo no registro" }));
    await user.click(screen.getByRole("button", { name: "Editar MT-0098" }));

    expect(screen.getAllByLabelText("Nome do objeto")).toHaveLength(1);
    expect(screen.getByDisplayValue("Objeto com código reutilizado")).toBeTruthy();
  }, 10000);

  test("Registro rejeita criação com código já ocupado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar objeto fixo" }));
    await user.type(screen.getByLabelText("Código"), "mt-0016");
    await user.type(screen.getByLabelText("Nome"), "Objeto duplicado");
    await user.type(screen.getByPlaceholderText("ex.: Número do contrato"), "Campo duplicado");
    await user.click(screen.getByRole("button", { name: "Adicionar campo" }));
    await user.click(screen.getByRole("button", { name: "Salvar objeto fixo no registro" }));

    expect(screen.getByRole("alert").textContent).toContain("Já existe um objeto ou registro com esse código.");
    expect(screen.getByRole("button", { name: "Salvar objeto fixo no registro" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Editar MT-0016" })).toHaveLength(1);
    expect(screen.getByText("MT-0016 · Estagiário")).toBeTruthy();
  });

  test("Registro rejeita código de objeto duplicado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Editar MT-0016" }));
    const code = screen.getByLabelText("Código do objeto");
    await user.clear(code);
    await user.type(code, "mt-0015");
    await user.click(screen.getByRole("button", { name: "Salvar objeto" }));

    expect(screen.getByRole("alert").textContent).toContain("Já existe um objeto com esse código.");
    expect(screen.getByText("MT-0016 · Estagiário")).toBeTruthy();
  });

  test("Registro edita a sigla da UG sem romper suas referências", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "UGs" }));
    await user.click(screen.getByRole("button", { name: "Editar SEDUC" }));
    const acronym = screen.getByLabelText("Sigla da UG");
    await user.clear(acronym);
    await user.type(acronym, "saf");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(screen.getByRole("alert").textContent).toContain("Já existe uma UG com essa sigla");

    await user.clear(acronym);
    await user.type(acronym, "SEDUC-NOVA");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await openStcHomeAction(user, "Acompanhar ciclos");
    const seducCycle = screen.getByText("Ciclo MT-0016 - Estagiário").closest("article");
    expect(seducCycle).toBeTruthy();
    expect(within(seducCycle as HTMLElement).getByText(/SEDUC-NOVA/)).toBeTruthy();
  });

  test("Registro rejeita cadastro de UG com sigla ou identificador já ocupado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "UGs" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar UG" }));

    await user.type(screen.getByLabelText("Sigla"), "SEDUC-");
    await user.type(screen.getByLabelText("Nome"), "Secretaria duplicada");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Nome do ponto focal"), "Pessoa duplicada");
    await user.type(screen.getByLabelText("E-mail do ponto focal"), "duplicada@seduc.ma.gov.br");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Enviar convite por e-mail (simulado)" }));

    expect(screen.getByRole("alert").textContent).toContain("Já existe uma UG com essa sigla");
    expect(screen.getAllByRole("button", { name: "Editar SEDUC" })).toHaveLength(1);
  });

  test("Registro rejeita e-mail de ponto focal já vinculado a outra UG", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "UGs" }));
    await user.click(screen.getByRole("button", { name: "Cadastrar UG" }));

    await user.type(screen.getByLabelText("Sigla"), "NOVA");
    await user.type(screen.getByLabelText("Nome"), "Nova unidade");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Nome do ponto focal"), "Outro nome");
    fireEvent.change(screen.getByLabelText("E-mail do ponto focal"), {
      target: { value: "  MARIA.COSTA@SEDUC.MA.GOV.BR  " },
    });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Enviar convite por e-mail (simulado)" }));

    expect(screen.getByRole("alert").textContent).toContain("e-mail de ponto focal");
    expect(screen.queryByRole("button", { name: "Editar NOVA" })).toBeNull();
  });

  test("Registro mantém IDs distintos ao remover e readicionar campos com o mesmo rótulo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Campos / informações" }));
    await user.selectOptions(
      screen.getByLabelText("Objeto"),
      screen.getByRole("option", { name: /MT-0016/ }),
    );

    const fieldName = screen.getByPlaceholderText("Nome do campo (ex.: Valor empenhado)");
    await user.type(fieldName, "Campo repetido");
    await user.click(screen.getByRole("button", { name: "Adicionar campo" }));
    await user.click(screen.getByRole("button", { name: "Remover campo Nome" }));
    await user.type(fieldName, "Campo repetido");
    await user.click(screen.getByRole("button", { name: "Adicionar campo" }));

    expect(screen.getAllByText("Campo repetido")).toHaveLength(2);
    const removeRepeated = screen.getAllByRole("button", { name: "Remover campo Campo repetido" });
    expect(removeRepeated).toHaveLength(2);
    await user.click(removeRepeated[0]);
    expect(screen.getAllByText("Campo repetido")).toHaveLength(1);
  });

  test("login geral abre somente as coletas associadas ao usuário", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "respondente", "clara.nunes@sinfra.ma.gov.br");

    expect(screen.getByRole("heading", { name: "Minhas coletas — Clara Nunes" })).toBeTruthy();
    expect(screen.getByText(/MT-0018\s*·\s*Licitação/i)).toBeTruthy();
    expect(screen.getByText(/MT-0012\s*·\s*Obra pública em execução/i)).toBeTruthy();
    expect(screen.queryByText(/MT-0016.*Estagiário/i)).toBeNull();
  });

  test("filtro Data/prazo encontra também a data ISO de criação", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");

    fireEvent.change(screen.getByLabelText("Data/prazo"), { target: { value: "2026-07-07" } });
    expect(screen.getByText("Ciclo MT-0016 - Estagiário")).toBeTruthy();
    expect(screen.queryByText("Ciclo MT-0018 - Licitação")).toBeNull();
  });

  test("respondente cadastrado pelo link volta a entrar com a senha que criou", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0016 - Estagiário").getByRole("button", { name: "Exibir detalhes" }));
    await user.click(screen.getByRole("button", { name: "Simular acesso pelo link" }));

    const registrationDoor = screen.getByRole("heading", { name: "Criar cadastro" }).closest("section");
    expect(registrationDoor).toBeTruthy();
    const registration = within(registrationDoor as HTMLElement);
    fireEvent.change(registration.getByLabelText("Nome completo"), { target: { value: "Ana Nova" } });
    fireEvent.change(registration.getByLabelText("E-mail"), {
      target: { value: "ana.nova@seduc.ma.gov.br" },
    });
    fireEvent.change(registration.getByLabelText("Telefone"), { target: { value: "(98) 90000-0000" } });
    fireEvent.change(registration.getByLabelText("Cargo / setor"), { target: { value: "Planejamento" } });
    await user.click(registration.getByRole("button", { name: "Continuar" }));
    fireEvent.change(registration.getByLabelText("Criar senha"), { target: { value: "senha-da-ana" } });
    await user.click(registration.getByRole("button", { name: "Confirmar e-mail e acessar a coleta" }));

    expect(screen.getByRole("heading", { name: "Estagiário" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Sair" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana.nova@seduc.ma.gov.br" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-da-ana" } });
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("heading", { name: "Minhas coletas — Ana Nova" })).toBeTruthy();
    expect(screen.getByText(/MT-0016\s*·\s*Estagiário/i)).toBeTruthy();
  });

  test("autocadastro não permite atribuir e-mail da SEDUC à SAF", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0016 - Estagiário").getByRole("button", { name: "Exibir detalhes" }));
    await user.click(screen.getByRole("button", { name: "Simular acesso pelo link" }));

    const registration = within(
      screen.getByRole("heading", { name: "Criar cadastro" }).closest("section") as HTMLElement,
    );
    fireEvent.change(registration.getByLabelText("Nome completo"), { target: { value: "Conta indevida" } });
    fireEvent.change(registration.getByLabelText("E-mail"), {
      target: { value: "conta.indevida@seduc.ma.gov.br" },
    });
    fireEvent.change(registration.getByLabelText("Cargo / setor"), { target: { value: "Teste" } });
    await user.selectOptions(registration.getByLabelText("Órgão"), "saf");
    await user.click(registration.getByRole("button", { name: "Continuar" }));
    fireEvent.change(registration.getByLabelText("Criar senha"), { target: { value: "senha-teste" } });
    await user.click(registration.getByRole("button", { name: "Confirmar e-mail e acessar a coleta" }));

    expect(screen.getByRole("status").textContent).toContain("não corresponde à UG selecionada");
    expect(screen.getByRole("heading", { name: "Identifique-se para responder" })).toBeTruthy();
  });

  test("acesso contextual usa formulários, Enter e erro associado aos campos", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0016 - Estagiário").getByRole("button", { name: "Exibir detalhes" }));
    await user.click(screen.getByRole("button", { name: "Simular acesso pelo link" }));

    const registrationForm = screen.getByRole("heading", { name: "Criar cadastro" }).closest("form");
    const loginForm = screen.getByRole("heading", { name: "Entrar" }).closest("form");
    expect(registrationForm).toBeTruthy();
    expect(loginForm).toBeTruthy();

    const registration = within(registrationForm as HTMLElement);
    await user.type(registration.getByLabelText("Nome completo"), "Ana Teclado");
    await user.type(registration.getByLabelText("E-mail"), "ana.teclado@seduc.ma.gov.br");
    await user.type(registration.getByLabelText("Cargo / setor"), "Planejamento");
    fireEvent.submit(registrationForm as HTMLElement);
    expect(registration.getByLabelText("Criar senha")).toBe(document.activeElement);

    const login = within(loginForm as HTMLElement);
    const email = login.getByLabelText("E-mail");
    const password = login.getByLabelText("Senha");
    await user.type(email, "nao.existe@seduc.ma.gov.br");
    await user.type(password, "senha-incorreta");
    fireEvent.submit(loginForm as HTMLElement);
    const error = screen.getByRole("alert");
    expect(error.id).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-describedby")).toBe(error.id);
  });

  test("autocadastro pelo link rejeita e-mail reservado de ponto focal", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0016 - Estagiário").getByRole("button", { name: "Exibir detalhes" }));
    await user.click(screen.getByRole("button", { name: "Simular acesso pelo link" }));

    const registrationDoor = screen.getByRole("heading", { name: "Criar cadastro" }).closest("section");
    expect(registrationDoor).toBeTruthy();
    const registration = within(registrationDoor as HTMLElement);
    fireEvent.change(registration.getByLabelText("Nome completo"), { target: { value: "Conta indevida" } });
    fireEvent.change(registration.getByLabelText("E-mail"), {
      target: { value: "maria.costa@seduc.ma.gov.br" },
    });
    fireEvent.change(registration.getByLabelText("Cargo / setor"), { target: { value: "Teste" } });
    await user.click(registration.getByRole("button", { name: "Continuar" }));
    fireEvent.change(registration.getByLabelText("Criar senha"), { target: { value: "outra-senha" } });
    await user.click(registration.getByRole("button", { name: "Confirmar e-mail e acessar a coleta" }));

    expect(screen.getByRole("status").textContent).toContain("perfil institucional");
    expect(screen.getByRole("heading", { name: "Identifique-se para responder" })).toBeTruthy();
  });

  test("Topbar encerra a sessão e volta ao login único", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(screen.getByRole("heading", { name: "Acesse o Agiliza Transparência" })).toBeTruthy();
  });

  test("login geral rejeita credenciais desconhecidas", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("E-mail"), "nao.existe@ma.gov.br");
    await user.type(screen.getByLabelText("Senha"), "senha-simulada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "E-mail não reconhecido. Confira o acesso informado ou use o link do ciclo para o primeiro cadastro.",
    );
  });

  test("painel orienta quando nenhum filtro encontra coleta", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    const overdueFilter = screen.getByRole("button", { name: "Sem envio no prazo" });
    await user.click(overdueFilter);
    expect(overdueFilter.getAttribute("aria-pressed")).toBe("true");
    await user.selectOptions(screen.getByLabelText("Objeto"), "MT-0016");

    expect(screen.getByText("Nenhum ciclo combina com estes filtros")).toBeTruthy();
  });

  test("Histórico inclui as duas extremidades do período", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Histórico" }));
    await user.type(screen.getByLabelText("Período inicial"), "2026-07-04");
    await user.type(screen.getByLabelText("Período final"), "2026-07-04");

    expect(screen.getByRole("heading", { name: "1 coleta(s) no filtro" })).toBeTruthy();
    expect(screen.getByText("2026-07-04")).toBeTruthy();
  });

  test("Histórico orienta quando os filtros não encontram registros", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Histórico" }));
    await user.type(
      screen.getByPlaceholderText("objeto, título ou nº do SEI"),
      "registro que não existe",
    );

    expect(
      screen.getByText("Nenhum registro encontrado no período e filtros selecionados."),
    ).toBeTruthy();
  });

  test("Registro orienta quando a lista de campos fica vazia", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "analista");
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "Campos / informações" }));

    const fieldCount = screen.getAllByRole("button", { name: /^Remover campo / }).length;
    for (let index = 0; index < fieldCount; index += 1) {
      await user.click(screen.getAllByRole("button", { name: /^Remover campo / })[0]);
    }

    expect(screen.getByText("Nenhum campo cadastrado para este objeto")).toBeTruthy();
  });

  test("clipboard ausente orienta a seleção da URL visível no card", async () => {
    const user = userEvent.setup();
    const restoreClipboard = replaceClipboard(undefined);

    try {
      render(<App />);
      await loginAs(user, "analista");
      await openStcHomeAction(user, "Acompanhar ciclos");
      const copyButton = screen.getAllByRole("button", { name: "Copiar link do ciclo" })[0];
      expectSelectableUrlInCopyCard(copyButton);
      await user.click(copyButton);

      const feedback = await screen.findByRole("status");
      expect(feedback.textContent).toBe(clipboardErrorMessage);
      expect(feedback.classList.contains("error")).toBe(true);
      expect(feedback.querySelector(".toast-icon.error")).toBeTruthy();
    } finally {
      restoreClipboard();
    }
  });

  test("clipboard rejeitado orienta a seleção da URL visível no card", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const restoreClipboard = replaceClipboard({
      writeText: (value) => {
        calls.push(value);
        return Promise.reject(new Error("clipboard indisponível"));
      },
    });

    try {
      render(<App />);
      await loginAs(user, "analista");
      await openStcHomeAction(user, "Acompanhar ciclos");
      const copyButton = screen.getAllByRole("button", { name: "Copiar link do ciclo" })[0];
      expectSelectableUrlInCopyCard(copyButton);
      await user.click(copyButton);

      const feedback = await screen.findByRole("status");
      expect(calls).toEqual([firstCollectionUrl]);
      expect(feedback.textContent).toBe(clipboardErrorMessage);
      expect(feedback.classList.contains("error")).toBe(true);
      expect(feedback.querySelector(".toast-icon.error")).toBeTruthy();
    } finally {
      restoreClipboard();
    }
  });

  test("clipboard resolvido copia a URL exata uma única vez", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const restoreClipboard = replaceClipboard({
      writeText: (value) => {
        calls.push(value);
        return Promise.resolve();
      },
    });

    try {
      render(<App />);
      await loginAs(user, "analista");
      await openStcHomeAction(user, "Acompanhar ciclos");
      await user.click(screen.getAllByRole("button", { name: "Copiar link do ciclo" })[0]);

      const feedback = await screen.findByRole("status");
      expect(calls).toEqual([firstCollectionUrl]);
      expect(feedback.textContent).toBe("Link copiado");
      expect(feedback.classList.contains("error")).toBe(false);
      expect(feedback.querySelector(".toast-icon.success")).toBeTruthy();
    } finally {
      restoreClipboard();
    }
  });

  test("clipboard pendente só confirma depois que a promessa resolve", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    let resolveClipboard!: () => void;
    const pendingClipboard = new Promise<void>((resolve) => {
      resolveClipboard = resolve;
    });
    const restoreClipboard = replaceClipboard({
      writeText: (value) => {
        calls.push(value);
        return pendingClipboard;
      },
    });

    try {
      render(<App />);
      await loginAs(user, "analista");
      await openStcHomeAction(user, "Acompanhar ciclos");
      await user.click(screen.getAllByRole("button", { name: "Copiar link do ciclo" })[0]);

      expect(calls).toEqual([firstCollectionUrl]);
      expect(screen.queryByText("Link copiado")).toBeNull();

      await act(async () => {
        resolveClipboard();
        await pendingClipboard;
      });

      const feedback = await screen.findByRole("status");
      expect(feedback.textContent).toBe("Link copiado");
      expect(feedback.querySelector(".toast-icon.success")).toBeTruthy();
    } finally {
      restoreClipboard();
    }
  });
});

describe("máquina de estados", () => {
  const cycle = {
    id: "ciclo-teste",
    deadline: "2099-01-01",
    ugIds: ["seduc", "saf"],
    creationStatus: "aprovado",
  } as unknown as CycleItem;

  const collection = (
    id: string,
    status: Collection["status"] = "pendente",
    ugId = "seduc",
  ) =>
    ({
      id,
      cycleId: cycle.id,
      ugId,
      status,
      submittedAt: status === "pendente" ? "" : "15 jul. 2026",
      receipts: [],
    }) as unknown as Collection;

  test("não finaliza enquanto uma UG continua sem resposta", () => {
    expect(deriveCycleStatus(cycle, [collection("col-a", "aprovada"), collection("col-b")])).toBe(
      "em-andamento",
    );
  });

  test("não finaliza quando uma UG destinatária ainda não possui coleta", () => {
    expect(deriveCycleStatus(cycle, [collection("col-a", "aprovada")])).toBe("em-andamento");
  });

  test("mantém o ciclo em andamento enquanto uma coleta aguarda o focal", () => {
    expect(
      deriveCycleStatus(cycle, [collection("col-a", "aguardando-ponto-focal"), collection("col-b")]),
    ).toBe("em-andamento");
  });

  test("correção permanece como etapa da coleta, sem substituir o status do ciclo", () => {
    expect(
      deriveCycleStatus(cycle, [
        collection("col-a", "aguardando-ponto-focal"),
        collection("col-b", "em-correcao"),
      ]),
    ).toBe("em-andamento");
  });

  test("finaliza quando todas as coletas estão aprovadas", () => {
    expect(
      deriveCycleStatus(cycle, [
        collection("col-a", "aprovada"),
        collection("col-b", "aprovada", "saf"),
      ]),
    ).toBe("finalizado");
  });

  test("fecha novas coletas somente na UG que já concluiu suas respostas", () => {
    const collections = [
      collection("col-a", "aprovada", "seduc"),
      collection("col-b", "aguardando-stc", "saf"),
    ];

    expect(cycleAcceptsNewCollections(cycle, collections)).toBe(true);
    expect(cycleAcceptsNewCollections(cycle, collections, "seduc")).toBe(false);
    expect(cycleAcceptsNewCollections(cycle, collections, "saf")).toBe(true);
  });

  test("calcula o dia operacional no fuso local sem antecipar a meia-noite", () => {
    const utcAfterMidnight = new Date("2026-07-16T00:30:00.000Z");

    expect(dateIsoAtTimezoneOffset(utcAfterMidnight, 180)).toBe("2026-07-15");
    expect(dateIsoAtTimezoneOffset(utcAfterMidnight, 0)).toBe("2026-07-16");
  });

  test("marca prazo vencido quando nenhuma coleta foi enviada", () => {
    const overdueCycle = { ...cycle, deadline: "2000-01-01" } as CycleItem;
    expect(
      deriveCycleStatus(overdueCycle, [collection("col-a"), collection("col-b")]),
    ).toBe("sem-envio-no-prazo");
  });

  test("reenvio e negativa respeitam o focal", () => {
    expect(statusAfterRespondentSend(true, false)).toBe("aguardando-ponto-focal");
    expect(statusAfterRespondentSend(true, true)).toBe("aguardando-ponto-focal");
    expect(statusAfterFocal(true)).toBe("aguardando-stc");
    expect(statusAfterFocal(false)).toBe("aguardando-stc");
  });
});

describe("comprovantes", () => {
  test("gera eventos distintos preservando o protocolo-base", () => {
    const envio = createReceipt(
      "envio",
      "AG-2026-00001",
      "João",
      "13 jul. 2026",
      0,
      "Resposta enviada",
    );
    const rejeicao = createReceipt(
      "rejeicao",
      "AG-2026-00001",
      "Equipe STC",
      "14 jul. 2026",
      1,
      "Correção solicitada",
    );
    const fechamento = createReceipt(
      "fechamento",
      "AG-2026-00001",
      "Equipe STC",
      "15 jul. 2026",
      2,
      "Resposta aprovada",
    );

    expect([envio.kind, rejeicao.kind, fechamento.kind]).toEqual([
      "envio",
      "rejeicao",
      "fechamento",
    ]);
    expect(new Set([envio.id, rejeicao.id, fechamento.id]).size).toBe(3);
    expect(fechamento.protocol).toBe("AG-2026-00001");
  });

  test("respondente consulta a rejeição enquanto corrige o envio", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "respondente", "paulo.sena@sefaz.ma.gov.br");
    expect(screen.getByText(/MT-0030\s*·/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Corrigir envio" }));
    await user.click(screen.getByRole("button", { name: /Comprovante/ }));

    expect(screen.getByText("Comprovante de rejeição")).toBeTruthy();
    expect(screen.getAllByText("AG-2026-00019")).toHaveLength(2);
  });

  test("wizard nomeia etapas concluídas e regiões de tabela roláveis", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loginAs(user, "respondente");

    const collection = screen.getByText(/MT-0016\s*·\s*Estagiário/i).closest("article");
    expect(collection).toBeTruthy();
    await user.click(within(collection as HTMLElement).getByRole("button", { name: "Responder coleta" }));

    expect(screen.getByRole("button", { name: /Etapa 3: Anexos obrigatórios — concluída/i })).toBeTruthy();
    const fieldsRegion = screen.getByRole("region", { name: "Estrutura das colunas da planilha" });
    expect(fieldsRegion.getAttribute("tabindex")).toBe("0");
    expect(within(fieldsRegion).getByText("Colunas exigidas na planilha-padrão", { selector: "caption" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Etapa 2: Preencher e subir/i }));
    const previewRegion = screen.getByRole("region", { name: "Prévia horizontal da planilha" });
    expect(previewRegion.getAttribute("tabindex")).toBe("0");
  });

  test("resposta negativa rejeitada pode ser reenviada como negativa", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    const cycle = cycleCard("Ciclo MT-0040 - Tabela De Cargos E Remuneração");
    await user.click(cycle.getByRole("button", { name: "Validar respostas" }));
    await user.type(screen.getByLabelText("Justificativa da rejeicao"), "Detalhe a indisponibilidade.");
    await user.click(screen.getByRole("button", { name: "Rejeitar envio" }));

    await loginAs(user, "respondente", "paulo.sena@sefaz.ma.gov.br");
    const responseCard = screen.getByText(/MT-0040\s*·\s*Tabela de Cargos e Remuneração/i).closest("article");
    expect(responseCard).toBeTruthy();
    await user.click(within(responseCard as HTMLElement).getByRole("button", { name: "Corrigir envio" }));

    const negative = screen.getByRole("button", { name: "Não tenho esta informação" });
    expect((negative as HTMLButtonElement).disabled).toBe(false);
    await user.click(negative);
    await user.type(
      screen.getByPlaceholderText(/Explique brevemente/i),
      "O órgão continua sem deter a informação solicitada.",
    );
    await user.click(screen.getByRole("button", { name: "Registrar resposta negativa" }));

    expect(screen.getByText("Resposta negativa registrada")).toBeTruthy();
    expect(within(screen.getByLabelText("Histórico de comprovantes")).getAllByText("Comprovante de envio")).toHaveLength(2);
  }, 20000);

  test("justificativa de rejeição é limpa ao trocar de coleta", async () => {
    const user = userEvent.setup();
    render(<App />);

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Ciclo MT-0018 - Licitação").getByRole("button", { name: "Validar respostas" }));

    const reason = screen.getByLabelText("Justificativa da rejeicao");
    await user.type(reason, "Motivo que pertence somente à primeira coleta.");
    const otavio = screen.getByRole("button", { name: /SINFRA.*Otávio Ramos/i });
    await user.click(otavio);

    expect((screen.getByLabelText("Justificativa da rejeicao") as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByRole("button", { name: "Rejeitar envio" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("preserva envio, rejeição, reenvio e fechamento na mesma timeline", async () => {
    const user = userEvent.setup();
    render(<App />);
    const joaoCollectionCard = () =>
      screen
        .getAllByText("João Lima")
        .map((item) => item.closest(".collection-response-card"))
        .find((item): item is HTMLElement => Boolean(item)) ?? null;

    await openVariableDemoAsJoao(user);
    await user.click(screen.getByRole("button", { name: /Preencher e subir/ }));
    await user.click(
      screen.getByRole("button", { name: /Arraste aqui ou clique para simular a seleção/ }),
    );
    await user.click(screen.getByRole("button", { name: "Enviar e gerar comprovante" }));

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    let cycleCard = screen.getByText("Ciclo VAR-0000 - Demonstração variável").closest("article");
    expect(cycleCard).toBeTruthy();
    await user.click(
      within(cycleCard as HTMLElement).getByRole("button", { name: "Validar respostas" }),
    );

    let joaoCard = joaoCollectionCard();
    expect(joaoCard).toBeTruthy();
    const rejectionReason = within(joaoCard as HTMLElement).getByLabelText(
      "Justificativa da rejeicao",
    );
    await user.type(rejectionReason, "Corrigir o período informado.");
    await user.click(
      within(joaoCard as HTMLElement).getByRole("button", { name: "Rejeitar envio" }),
    );

    joaoCard = joaoCollectionCard();
    expect(joaoCard).toBeTruthy();
    let timeline = within(joaoCard as HTMLElement).getByLabelText(
      "Histórico de comprovantes",
    );
    expect(within(timeline).getAllByText("Comprovante de envio")).toHaveLength(1);
    expect(within(timeline).getAllByText("Comprovante de rejeição")).toHaveLength(1);
    expect(within(timeline).getByText("2 evento(s) registrado(s)")).toBeTruthy();

    await loginAs(user, "respondente");
    await user.click(screen.getByRole("button", { name: "Corrigir envio" }));
    await user.click(screen.getByRole("button", { name: "Reenviar corrigido" }));

    timeline = screen.getByLabelText("Histórico de comprovantes");
    expect(within(timeline).getAllByText("Comprovante de envio")).toHaveLength(2);
    expect(within(timeline).getAllByText("Comprovante de rejeição")).toHaveLength(1);
    expect(within(timeline).getByText("3 evento(s) registrado(s)")).toBeTruthy();

    await loginAs(user, "analista");
    await openStcHomeAction(user, "Acompanhar ciclos");
    cycleCard = screen.getByText("Ciclo VAR-0000 - Demonstração variável").closest("article");
    expect(cycleCard).toBeTruthy();
    await user.click(
      within(cycleCard as HTMLElement).getByRole("button", { name: "Validar respostas" }),
    );
    joaoCard = joaoCollectionCard();
    expect(joaoCard).toBeTruthy();
    await user.click(
      within(joaoCard as HTMLElement).getByRole("button", { name: "Aprovar resposta" }),
    );

    joaoCard = joaoCollectionCard();
    expect(joaoCard).toBeTruthy();
    timeline = within(joaoCard as HTMLElement).getByLabelText(
      "Histórico de comprovantes",
    );
    expect(within(timeline).getAllByText("Comprovante de envio")).toHaveLength(2);
    expect(within(timeline).getAllByText("Comprovante de rejeição")).toHaveLength(1);
    expect(within(timeline).getAllByText("Comprovante de fechamento")).toHaveLength(1);
    expect(within(timeline).getAllByText("AG-2026-00034")).toHaveLength(4);
    expect(
      within(timeline)
        .getAllByRole("listitem")
        .map((item) => within(item).getByText(/^Comprovante de /).textContent),
    ).toEqual([
      "Comprovante de envio",
      "Comprovante de rejeição",
      "Comprovante de envio",
      "Comprovante de fechamento",
    ]);

    await loginAs(user, "respondente");
    const collectionCard = screen
      .getByText(/VAR-0000\s*·\s*Demonstração variável/i)
      .closest("article");
    expect(collectionCard).toBeTruthy();
    await user.click(
      within(collectionCard as HTMLElement).getByRole("button", { name: "Ver comprovante" }),
    );

    expect(screen.getByText("Resposta aprovada pela STC")).toBeTruthy();
    timeline = screen.getByLabelText("Histórico de comprovantes");
    expect(within(timeline).getAllByText("Comprovante de envio")).toHaveLength(2);
    expect(within(timeline).getAllByText("Comprovante de rejeição")).toHaveLength(1);
    expect(within(timeline).getAllByText("Comprovante de fechamento")).toHaveLength(1);
  }, 15000);
});
