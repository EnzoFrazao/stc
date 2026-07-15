import { afterEach, describe, expect, test } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, {
  attachmentsMeetRequirement,
  createReceipt,
  deriveCycleStatus,
  statusAfterFocal,
  statusAfterRespondentSend,
  type Collection,
  type CycleItem,
} from "./App";

Object.defineProperty(window, "scrollTo", {
  value: () => undefined,
  writable: true,
});

afterEach(() => cleanup());

const firstCollectionUrl = "https://agiliza.ma.gov.br/coleta/agz-100-seduc";
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
  await user.click(screen.getByRole("button", { name: "Entrar como respondente" }));
  await user.type(screen.getByLabelText("E-mail do respondente"), "joao.lima@seduc.ma.gov.br");
  await user.type(screen.getByLabelText("Senha do respondente"), "senha-simulada");
  await user.click(screen.getByRole("button", { name: "Acessar minhas coletas" }));
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
  test("contagem permite mínimo e excedente", () => {
    expect(attachmentsMeetRequirement(2, 3)).toBe(false);
    expect(attachmentsMeetRequirement(3, 3)).toBe(true);
    expect(attachmentsMeetRequirement(4, 3)).toBe(true);
  });

  test("comprovante permite voltar às etapas em modo somente leitura", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como respondente" }));
    await user.type(
      screen.getByLabelText("E-mail do respondente"),
      "clara.nunes@sinfra.ma.gov.br",
    );
    await user.type(screen.getByLabelText("Senha do respondente"), "senha-simulada");
    await user.click(screen.getByRole("button", { name: "Acessar minhas coletas" }));
    await user.click(screen.getAllByRole("button", { name: "Ver comprovante" })[0]);
    const howTo = screen.getByRole("button", { name: "1 Como responder" });
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

    const firstStep = screen.getByRole("button", { name: "1 Como responder" });
    const secondStep = screen.getByRole("button", { name: "2 Preencher e subir" });
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

  test("login separa a STC entre analista e especialista", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Entrar como ponto focal" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar como Analista STC" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar como Especialista STC" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Entrar como STC" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir link da coleta (SEI)" })).toBeTruthy();
  });

  test.each(["Analista STC", "Especialista STC"] as const)(
    "sidebar de %s mantém somente os destinos persistentes",
    async (profile) => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByRole("button", { name: `Entrar como ${profile}` }));

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

    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));

    expect(screen.getByRole("heading", { name: "Painel STC" })).toBeTruthy();
    const actions = within(screen.getByLabelText("Ações do perfil STC"));
    expect(actions.getByRole("button", { name: /Criar Ciclo/ })).toBeTruthy();
    expect(actions.getByRole("button", { name: /Acompanhar ciclos/ })).toBeTruthy();
    expect(actions.queryByRole("button", { name: /Aprovar Ciclo/ })).toBeNull();
  });

  test("especialista recebe somente Aprovar Ciclo e Acompanhar ciclos na home", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Entrar como Especialista STC" }));

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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));

    await openStcHomeAction(user, "Criar Ciclo");
    expectCurrentStcNavigation("Painel STC");

    await openStcHomeAction(user, "Acompanhar ciclos");
    expectCurrentStcNavigation("Painel STC");
    const operationalCycle = cycleCard("Coleta MT-0018 - Licitação");
    await user.click(operationalCycle.getByRole("button", { name: "Exibir detalhes" }));
    expectCurrentStcNavigation("Painel STC");

    await openStcHomeAction(user, "Acompanhar ciclos");
    await user.click(cycleCard("Coleta MT-0018 - Licitação").getByRole("button", { name: "Validar respostas" }));
    expectCurrentStcNavigation("Painel STC");
  });

  test("aprovação de ciclos mantém Painel STC como destino atual", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Especialista STC" }));

    await openStcHomeAction(user, "Aprovar Ciclo");
    expectCurrentStcNavigation("Painel STC");
  });

  test("especialista continua validando respostas recebidas das UGs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Especialista STC" }));
    await openStcHomeAction(user, "Acompanhar ciclos");

    const operationalCycle = cycleCard("Coleta MT-0018 - Licitação");
    await user.click(operationalCycle.getByRole("button", { name: "Validar respostas" }));
    expect(screen.getByRole("heading", { name: "Receber, aprovar ou rejeitar" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Aprovar resposta" }).length).toBeGreaterThan(0);
  });

  test("analista envia ciclo para análise sem gerar coletas ou links", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));

    await createCycleForReview(user, "Ciclo para revisão sem links");

    const card = cycleCard("Ciclo para revisão sem links");
    expect(card.getByText("Aguardando análise da criação")).toBeTruthy();
    expect(card.getByText("Ainda não enviado às UGs")).toBeTruthy();
    expect(card.queryByRole("button", { name: /Copiar link/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ponto focal" }));
    expect(screen.queryByText("Ciclo para revisão sem links")).toBeNull();
  });

  test("filtro da análise não mantém no detalhe um ciclo fora do status selecionado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Especialista STC" }));
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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await createCycleForReview(user, "Ciclo editável em análise");

    await user.click(cycleCard("Ciclo editável em análise").getByRole("button", { name: "Editar ciclo" }));
    const titleInput = screen.getByLabelText("Título");
    await user.clear(titleInput);
    await user.type(titleInput, "Ciclo atualizado pelo analista");
    await user.click(screen.getByRole("button", { name: "Salvar e manter em análise" }));

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
    await openStcHomeAction(user, "Aprovar Ciclo");
    expect(screen.getByRole("button", { name: "Analisar Ciclo atualizado pelo analista" })).toBeTruthy();
  });

  test("especialista exige observação para solicitar ajustes e o analista pode reenviar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await createCycleForReview(user, "Ciclo que precisa de ajustes");

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
    await openStcHomeAction(user, "Aprovar Ciclo");
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo que precisa de ajustes" }));
    await user.click(screen.getByRole("button", { name: "Solicitar ajustes" }));
    expect(screen.getByRole("alert").textContent).toContain("Escreva uma observação");

    await user.type(screen.getByLabelText("Observação para o analista"), "Revise as UGs selecionadas.");
    await user.click(screen.getByRole("button", { name: "Solicitar ajustes" }));

    await user.click(screen.getByRole("button", { name: "Analista STC" }));
    await openStcHomeAction(user, "Acompanhar ciclos");
    const card = cycleCard("Ciclo que precisa de ajustes");
    expect(card.getByText("Ajustes solicitados")).toBeTruthy();
    expect(card.getByText("Revise as UGs selecionadas.")).toBeTruthy();
    await user.click(card.getByRole("button", { name: "Revisar ajustes" }));
    expect(screen.getByRole("button", { name: "Reenviar para análise" })).toBeTruthy();
  });

  test("alteração do especialista registra os valores anterior e novo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await createCycleForReview(user, "Ciclo antes da edição especializada");

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
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
  });

  test("aprovação do especialista gera uma coleta por UG e ativa o ciclo uma única vez", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await createCycleForReview(user, "Ciclo pronto para aprovação");

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
    await openStcHomeAction(user, "Aprovar Ciclo");
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo pronto para aprovação" }));
    await user.click(screen.getByRole("button", { name: "Aprovar e enviar às UGs" }));
    expect(screen.queryByRole("button", { name: "Aprovar e enviar às UGs" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Analista STC" }));
    await openStcHomeAction(user, "Acompanhar ciclos");
    const card = cycleCard("Ciclo pronto para aprovação");
    expect(card.getByText("Ativo")).toBeTruthy();
    expect(card.getAllByRole("button", { name: /Copiar link da coleta/ })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Ponto focal" }));
    expect(screen.getByText("Ciclo pronto para aprovação")).toBeTruthy();
  });

  test("Registro edita dados básicos do objeto fixo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
    expect(screen.queryByDisplayValue("Anexo atualizado")).toBeNull();
  });

  test("Registro migra campos e anexos quando o código do objeto muda", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
    expect(screen.queryByDisplayValue("Anexo migrado")).toBeNull();

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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await user.click(screen.getByRole("button", { name: "Registro" }));
    await user.click(screen.getByRole("button", { name: "UGs" }));
    await user.click(screen.getByRole("button", { name: "Editar SEDUC" }));
    const acronym = screen.getByLabelText("Sigla da UG");
    await user.clear(acronym);
    await user.type(acronym, "saf");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(screen.getByRole("alert").textContent).toContain("Já existe uma UG com essa sigla.");

    await user.clear(acronym);
    await user.type(acronym, "SEDUC-NOVA");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await openStcHomeAction(user, "Acompanhar ciclos");
    const seducCycle = screen.getByText("Coleta MT-0016 - Estagiário").closest("article");
    expect(seducCycle).toBeTruthy();
    expect(within(seducCycle as HTMLElement).getByText("SEDUC-NOVA")).toBeTruthy();
  });

  test("Registro rejeita cadastro de UG com sigla ou identificador já ocupado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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

  test("Registro mantém IDs distintos ao remover e readicionar campos com o mesmo rótulo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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

    await user.click(screen.getByRole("button", { name: "Entrar como respondente" }));
    await user.type(
      screen.getByLabelText("E-mail do respondente"),
      "clara.nunes@sinfra.ma.gov.br",
    );
    await user.type(screen.getByLabelText("Senha do respondente"), "senha-simulada");
    await user.click(screen.getByRole("button", { name: "Acessar minhas coletas" }));

    expect(screen.getByRole("heading", { name: "Minhas coletas — Clara Nunes" })).toBeTruthy();
    expect(screen.getByText(/MT-0018\s*·\s*Licitação/i)).toBeTruthy();
    expect(screen.getByText(/MT-0012\s*·\s*Obra pública em execução/i)).toBeTruthy();
    expect(screen.queryByText(/MT-0016.*Estagiário/i)).toBeNull();
  });

  test("Topbar abre a entrada geral do respondente sem sessão", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await user.click(screen.getByRole("button", { name: "Respondente" }));

    expect(
      screen.getByRole("heading", { name: "Entrar nas minhas coletas" }),
    ).toBeTruthy();
  });

  test("login geral rejeita credenciais desconhecidas", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como respondente" }));
    await user.type(screen.getByLabelText("E-mail do respondente"), "nao.existe@ma.gov.br");
    await user.type(screen.getByLabelText("Senha do respondente"), "senha-simulada");
    await user.click(screen.getByRole("button", { name: "Acessar minhas coletas" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "Cadastro não encontrado — confira o e-mail ou entre pelo link recebido no SEI.",
    );
  });

  test("painel orienta quando nenhum filtro encontra coleta", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await openStcHomeAction(user, "Acompanhar ciclos");
    const overdueFilter = screen.getByRole("button", { name: "Não enviado no prazo" });
    await user.click(overdueFilter);
    expect(overdueFilter.getAttribute("aria-pressed")).toBe("true");
    await user.selectOptions(screen.getByLabelText("Objeto"), "MT-0016");

    expect(screen.getByText("Nenhum ciclo combina com estes filtros")).toBeTruthy();
  });

  test("Histórico inclui as duas extremidades do período", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
    await user.click(screen.getByRole("button", { name: "Histórico" }));
    await user.type(screen.getByLabelText("Período inicial"), "2026-07-04");
    await user.type(screen.getByLabelText("Período final"), "2026-07-04");

    expect(screen.getByRole("heading", { name: "1 coleta(s) no filtro" })).toBeTruthy();
    expect(screen.getByText("2026-07-04")).toBeTruthy();
  });

  test("Histórico orienta quando os filtros não encontram registros", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
    await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
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
      await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
      await openStcHomeAction(user, "Acompanhar ciclos");
      const copyButton = screen.getAllByRole("button", { name: /^Copiar link da coleta da / })[0];
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
      await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
      await openStcHomeAction(user, "Acompanhar ciclos");
      const copyButton = screen.getAllByRole("button", { name: /^Copiar link da coleta da / })[0];
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
      await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
      await openStcHomeAction(user, "Acompanhar ciclos");
      await user.click(screen.getAllByRole("button", { name: /^Copiar link da coleta da / })[0]);

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
      await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
      await openStcHomeAction(user, "Acompanhar ciclos");
      await user.click(screen.getAllByRole("button", { name: /^Copiar link da coleta da / })[0]);

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
    collectionIds: ["col-a", "col-b"],
  } as CycleItem;

  const collection = (
    id: string,
    status?: "aprovado" | "aguardando-ponto-focal" | "reaberto",
  ) =>
    ({
      id,
      cycleId: cycle.id,
      submissions: status
        ? [{ id: `sub-${id}`, status, isNegative: false, attachments: [], observations: [] }]
        : [],
    }) as unknown as Collection;

  test("não finaliza enquanto uma UG continua sem resposta", () => {
    expect(deriveCycleStatus(cycle, [collection("col-a", "aprovado"), collection("col-b")])).toBe(
      "aguardando-analise-stc",
    );
  });

  test("não finaliza se uma coleta esperada estiver ausente do estado recebido", () => {
    expect(deriveCycleStatus(cycle, [collection("col-a", "aprovado")])).toBe(
      "aguardando-analise-stc",
    );
  });

  test("expõe o gate do focal no ciclo", () => {
    expect(
      deriveCycleStatus(cycle, [collection("col-a", "aguardando-ponto-focal"), collection("col-b")]),
    ).toBe("aguardando-ponto-focal");
  });

  test("correção prevalece sobre o gate do ponto focal", () => {
    expect(
      deriveCycleStatus(cycle, [
        collection("col-a", "aguardando-ponto-focal"),
        collection("col-b", "reaberto"),
      ]),
    ).toBe("correcao");
  });

  test("finaliza quando todas as coletas estão aprovadas", () => {
    expect(
      deriveCycleStatus(cycle, [
        collection("col-a", "aprovado"),
        collection("col-b", "aprovado"),
      ]),
    ).toBe("finalizado");
  });

  test("marca prazo vencido quando nenhuma coleta foi enviada", () => {
    const overdueCycle = { ...cycle, deadline: "2000-01-01" } as CycleItem;
    expect(
      deriveCycleStatus(overdueCycle, [collection("col-a"), collection("col-b")]),
    ).toBe("nao-enviado-no-prazo");
  });

  test("reenvio e negativa respeitam o focal", () => {
    expect(statusAfterRespondentSend(true, false)).toBe("aguardando-ponto-focal");
    expect(statusAfterRespondentSend(true, true)).toBe("aguardando-ponto-focal");
    expect(statusAfterFocal(true)).toBe("resposta-negativa");
    expect(statusAfterFocal(false)).toBe("enviado");
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

    await user.click(screen.getByRole("button", { name: "Abrir link da coleta (SEI)" }));
    await user.type(
      screen.getByPlaceholderText("ex.: joao.lima@seduc.ma.gov.br"),
      "paulo.sena@sefaz.ma.gov.br",
    );
    await user.type(screen.getByLabelText("Senha"), "senha-teste");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByText(/MT-0016\s*·\s*SEDUC\s*·\s*Objeto fixo/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Estagiário" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Voltar ao painel" }));
    expect(screen.getByText(/MT-0016\s*·\s*Estagiário/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Corrigir envio" }));
    await user.click(screen.getByRole("button", { name: /Comprovante/ }));

    expect(screen.getByText("Comprovante de rejeição")).toBeTruthy();
    expect(screen.getAllByText("AG-2026-00019")).toHaveLength(2);
  });

  test("preserva envio, rejeição, reenvio e fechamento na mesma timeline", async () => {
    const user = userEvent.setup();
    render(<App />);
    const joaoSubmissionCard = () =>
      screen.getAllByText("João Lima")[0].closest(".submission-card");

    await openVariableDemoAsJoao(user);
    await user.click(screen.getByRole("button", { name: /Preencher e subir/ }));
    await user.click(
      screen.getByRole("button", { name: /Arraste aqui ou clique para simular a seleção/ }),
    );
    await user.click(screen.getByRole("button", { name: "Enviar e gerar comprovante" }));

    await user.click(screen.getByRole("button", { name: "Analista STC" }));
    await openStcHomeAction(user, "Acompanhar ciclos");
    let cycleCard = screen.getByText("Coleta VAR-0000 - Demonstração variável").closest("article");
    expect(cycleCard).toBeTruthy();
    await user.click(
      within(cycleCard as HTMLElement).getByRole("button", { name: "Validar respostas" }),
    );

    let joaoCard = joaoSubmissionCard();
    expect(joaoCard).toBeTruthy();
    const rejectionReason = within(joaoCard as HTMLElement).getByLabelText(
      "Justificativa da rejeicao",
    );
    await user.type(rejectionReason, "Corrigir o período informado.");
    await user.click(
      within(joaoCard as HTMLElement).getByRole("button", { name: "Rejeitar envio" }),
    );

    joaoCard = joaoSubmissionCard();
    expect(joaoCard).toBeTruthy();
    let timeline = within(joaoCard as HTMLElement).getByLabelText(
      "Histórico de comprovantes",
    );
    expect(within(timeline).getAllByText("Comprovante de envio")).toHaveLength(1);
    expect(within(timeline).getAllByText("Comprovante de rejeição")).toHaveLength(1);
    expect(within(timeline).getByText("2 evento(s) registrado(s)")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Respondente" }));
    await user.click(screen.getByRole("button", { name: "Corrigir envio" }));
    await user.click(screen.getByRole("button", { name: "Reenviar corrigido" }));

    timeline = screen.getByLabelText("Histórico de comprovantes");
    expect(within(timeline).getAllByText("Comprovante de envio")).toHaveLength(2);
    expect(within(timeline).getAllByText("Comprovante de rejeição")).toHaveLength(1);
    expect(within(timeline).getByText("3 evento(s) registrado(s)")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Analista STC" }));
    await openStcHomeAction(user, "Acompanhar ciclos");
    cycleCard = screen.getByText("Coleta VAR-0000 - Demonstração variável").closest("article");
    expect(cycleCard).toBeTruthy();
    await user.click(
      within(cycleCard as HTMLElement).getByRole("button", { name: "Validar respostas" }),
    );
    joaoCard = joaoSubmissionCard();
    expect(joaoCard).toBeTruthy();
    await user.click(
      within(joaoCard as HTMLElement).getByRole("button", { name: "Aprovar resposta" }),
    );

    joaoCard = joaoSubmissionCard();
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

    await user.click(screen.getByRole("button", { name: "Respondente" }));
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
