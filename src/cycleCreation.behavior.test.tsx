import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

Object.defineProperty(window, "scrollTo", {
  value: () => undefined,
  writable: true,
});

afterEach(() => cleanup());

async function openCreateCycle(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Entrar como Analista STC" }));
  await user.click(
    within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", {
      name: /Criar Ciclo/i,
    }),
  );
}

function toggleButtons(groupName: string) {
  return within(screen.getByRole("group", { name: groupName })).getAllByRole("button");
}

async function createFixedCycle(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  ugName = /SEDUC Secretaria de Estado da Educação/,
) {
  await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));
  await user.click(screen.getByRole("button", { name: /MT-0016\s+Estagiário/i }));
  await user.click(screen.getByRole("button", { name: ugName }));
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: title } });
  await user.click(screen.getByRole("button", { name: "Enviar ciclo para análise" }));
}

async function createVariableCycle(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  objectName: string,
) {
  await user.click(screen.getByRole("button", { name: /Objeto variável/i }));
  fireEvent.change(screen.getByLabelText("Nome do objeto"), { target: { value: objectName } });
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: title } });
  const ugButtons = toggleButtons("Unidades gestoras do ciclo");
  await user.click(ugButtons[0]);
  const fieldButtons = toggleButtons("Campos obrigatórios do ciclo");
  await user.click(fieldButtons[0]);
  await user.click(screen.getByRole("button", { name: "Enviar ciclo para análise" }));
}

describe("criação e aprovação de ciclos", () => {
  test("seleções da criação e da aprovação expõem o estado pressionado e a tela usa o vocabulário aprovado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCreateCycle(user);

    const fixedKind = screen.getByRole("button", { name: /Objeto fixo/i });
    const variableKind = screen.getByRole("button", { name: /Objeto variável/i });
    expect(fixedKind.getAttribute("aria-pressed")).toBe("false");
    expect(variableKind.getAttribute("aria-pressed")).toBe("false");

    await user.click(fixedKind);
    expect(fixedKind.getAttribute("aria-pressed")).toBe("true");
    expect(variableKind.getAttribute("aria-pressed")).toBe("false");

    const fixedObject = screen.getByRole("button", { name: /MT-0016\s+Estagiário/i });
    expect(fixedObject.getAttribute("aria-pressed")).toBe("false");
    await user.click(fixedObject);
    expect(fixedObject.getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: /SEDUC Secretaria de Estado da Educação/ }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Ciclo com estado acessível" } });
    await user.click(screen.getByRole("button", { name: "Enviar ciclo para análise" }));
    await user.click(screen.getByRole("button", { name: "Especialista STC" }));

    expect(screen.getByText("Aprovação e acompanhamento")).toBeTruthy();
    await user.click(
      within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", { name: /Aprovar Ciclo/i }),
    );
    expect(screen.getByRole("heading", { name: "Aprovar Ciclo" })).toBeTruthy();

    const queueItem = screen.getByRole("button", { name: "Analisar Ciclo com estado acessível" });
    expect(queueItem.getAttribute("aria-pressed")).toBe("true");
    const reviewUg = screen.getByRole("button", { name: /SEDUC Secretaria de Estado da Educação/ });
    expect(reviewUg.getAttribute("aria-pressed")).toBe("true");
  });

  test("objeto fixo usa os 41 objetos manuais, campos canônicos e mantém MT-0016 sem UG ou anexo pré-selecionado", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await openCreateCycle(user);
    await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));

    expect(container.querySelectorAll(".tesauro-object-button")).toHaveLength(41);
    expect(screen.getByRole("button", { name: /MT-0001\s+/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /MT-0018\s+Licitação/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /MT-0006\s+/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /MT-0016\s+Estagiário/i }));

    const ugButtons = toggleButtons("Unidades gestoras do ciclo");
    expect(ugButtons.every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);

    const fieldButtons = toggleButtons("Campos obrigatórios do ciclo");
    expect(fieldButtons).toHaveLength(228);
    expect(fieldButtons.some((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(fieldButtons.some((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(screen.getByText("Campos do objeto")).toBeTruthy();
    expect(screen.getByText("Outros campos do Tesauro")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Buscar campo"), { target: { value: "Fonte Oficial" } });
    expect(screen.getByRole("button", { name: /Fonte Oficial/i })).toBeTruthy();

    const attachmentButtons = toggleButtons("Anexos obrigatórios do ciclo");
    expect(attachmentButtons).toHaveLength(5);
    expect(attachmentButtons.every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(screen.getByLabelText("Nome do anexo personalizado")).toBeTruthy();
  });

  test("objeto fixo pré-seleciona somente os anexos obrigatórios indicados pelo Tesauro", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCreateCycle(user);
    await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));

    const attachmentButton = (name: RegExp) =>
      within(screen.getByRole("group", { name: "Anexos obrigatórios do ciclo" })).getByRole(
        "button",
        { name },
      );

    await user.click(screen.getByRole("button", { name: /MT-0013\s+Obra Pública Concluída/i }));
    expect(
      screen.getByText(/Anexos explicitamente obrigatórios do objeto fixo começam marcados/i),
    ).toBeTruthy();
    expect(attachmentButton(/Termo de Recebimento/i).getAttribute("aria-pressed")).toBe("true");
    expect(attachmentButton(/Anexo de Metas Fiscais/i).getAttribute("aria-pressed")).toBe("false");

    await user.click(
      screen.getByRole("button", { name: /MT-0022\s+Lei de Diretrizes Orçamentárias/i }),
    );
    expect(attachmentButton(/Termo de Recebimento/i).getAttribute("aria-pressed")).toBe("false");
    expect(attachmentButton(/Anexo de Metas Fiscais/i).getAttribute("aria-pressed")).toBe("true");
    expect(attachmentButton(/Anexo de Riscos Fiscais/i).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: /MT-0034\s+Convênio Celebrado/i }));
    expect(attachmentButton(/Anexo de Metas Fiscais/i).getAttribute("aria-pressed")).toBe("false");
    expect(attachmentButton(/Plano de Trabalho/i).getAttribute("aria-pressed")).toBe("true");
    expect(
      attachmentButton(/Relatório de Prestação de Contas/i).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  test("MT-0049 pré-seleciona os campos fixos e mantém os condicionais disponíveis", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCreateCycle(user);
    await user.click(screen.getByRole("button", { name: /Objeto fixo/i }));
    await user.click(screen.getByRole("button", { name: /MT-0049\s+Ordem Bancária/i }));

    const fields = screen.getByRole("group", { name: "Campos obrigatórios do ciclo" });
    expect(
      within(fields).getByRole("button", { name: /^Número da OB/i }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      within(fields)
        .getByRole("button", { name: /Nome do Programa ou Projeto \[quando benefício social\]/i })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(within(fields).getAllByRole("button")).toHaveLength(228);
  });

  test("objeto variável não mostra catálogo de objetos e abre toda a configuração vazia com código estável", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await openCreateCycle(user);
    await user.click(screen.getByRole("button", { name: /Objeto variável/i }));

    expect(container.querySelector(".object-scroll")).toBeNull();
    expect(screen.getByLabelText("Nome do objeto")).toBeTruthy();
    expect(screen.getAllByText("VAR-0001").length).toBeGreaterThan(0);
    expect(toggleButtons("Unidades gestoras do ciclo").every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(toggleButtons("Campos obrigatórios do ciclo")).toHaveLength(228);
    expect(toggleButtons("Campos obrigatórios do ciclo").every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(toggleButtons("Anexos obrigatórios do ciclo")).toHaveLength(5);
    expect(screen.getByText("Resumo da solicitação")).toBeTruthy();
    expect(screen.getByLabelText("Mensagem final / email padrão")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Enviar ciclo para análise" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.change(screen.getByLabelText("Nome do objeto"), { target: { value: "Objeto emergencial" } });
    expect(screen.getAllByText("VAR-0001").length).toBeGreaterThan(0);
  });

  test("especialista recebe uma fila cronológica única com origem de fixos e variáveis", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCreateCycle(user);
    await createFixedCycle(user, "Primeiro ciclo da fila");

    await user.click(screen.getByRole("button", { name: "Painel STC" }));
    await user.click(
      within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", { name: /Criar Ciclo/i }),
    );
    await createVariableCycle(user, "Segundo ciclo da fila", "Objeto pontual da fila");

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
    await user.click(
      within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", { name: /Aprovar Ciclo/i }),
    );

    const queue = screen.getByRole("region", { name: "Fila única de aprovação" });
    const queueButtons = within(queue).getAllByRole("button");
    expect(queueButtons[0].textContent).toContain("Primeiro ciclo da fila");
    expect(queueButtons[1].textContent).toContain("Segundo ciclo da fila");
    expect(screen.getByText("Origem: Tesauro/Registro")).toBeTruthy();

    await user.click(within(queue).getByRole("button", { name: "Analisar Segundo ciclo da fila" }));
    expect(screen.getByText("Origem: objeto único deste ciclo")).toBeTruthy();
    expect(screen.getAllByText(/VAR-0001/).length).toBeGreaterThan(0);
  });

  test("especialista recalcula os anexos obrigatórios ao trocar o objeto fixo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCreateCycle(user);
    await createFixedCycle(user, "Ciclo com objeto alterado na análise");

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
    await user.click(
      within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", {
        name: /Aprovar Ciclo/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Analisar Ciclo com objeto alterado na análise" }),
    );

    await user.selectOptions(screen.getByLabelText("Objeto fixo"), "MT-0013");
    const analysisAttachments = screen.getByRole("group", {
      name: "Anexos obrigatórios na análise",
    });
    expect(
      within(analysisAttachments)
        .getByRole("button", { name: /Termo de Recebimento/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    await user.selectOptions(screen.getByLabelText("Objeto fixo"), "MT-0016");
    expect(
      within(analysisAttachments)
        .getByRole("button", { name: /Termo de Recebimento/i })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  test("aprovação gera planilha somente para variável e uma coleta por UG", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCreateCycle(user);
    await createVariableCycle(user, "Ciclo variável aprovado", "Objeto único aprovado");

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
    await user.click(
      within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", { name: /Aprovar Ciclo/i }),
    );
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo variável aprovado" }));
    await user.click(screen.getByRole("button", { name: "Aprovar e enviar às UGs" }));
    await user.selectOptions(screen.getByLabelText("Status da análise"), "aprovado");
    await user.click(screen.getByRole("button", { name: "Consultar Ciclo variável aprovado" }));

    expect(screen.getByText("Planilha gerada a partir dos campos selecionados")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Analista STC" }));
    await user.click(
      within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", { name: /Acompanhar ciclos/i }),
    );
    const card = screen.getByText("Ciclo variável aprovado", { selector: "strong" }).closest("article");
    expect(card).toBeTruthy();
    expect(within(card as HTMLElement).getAllByRole("button", { name: /Copiar link da coleta/ })).toHaveLength(1);
  });

  test("aprovação de fixo informa que o modelo ainda precisa ser vinculado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCreateCycle(user);
    await createFixedCycle(user, "Ciclo fixo aprovado");

    await user.click(screen.getByRole("button", { name: "Especialista STC" }));
    await user.click(
      within(screen.getByLabelText("Ações do perfil STC")).getByRole("button", { name: /Aprovar Ciclo/i }),
    );
    await user.click(screen.getByRole("button", { name: "Analisar Ciclo fixo aprovado" }));
    await user.click(screen.getByRole("button", { name: "Aprovar e enviar às UGs" }));
    await user.selectOptions(screen.getByLabelText("Status da análise"), "aprovado");
    await user.click(screen.getByRole("button", { name: "Consultar Ciclo fixo aprovado" }));

    expect(screen.getByText("Modelo fixo MT-0016 pendente de vinculação")).toBeTruthy();
    expect(screen.queryByText("Planilha gerada a partir dos campos selecionados")).toBeNull();
  });

  test("painel do respondente não anuncia download para modelo fixo ainda não vinculado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Entrar como respondente" }));
    fireEvent.change(screen.getByLabelText("E-mail do respondente"), {
      target: { value: "clara.nunes@sinfra.ma.gov.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha do respondente"), {
      target: { value: "senha-simulada" },
    });
    await user.click(screen.getByRole("button", { name: "Acessar minhas coletas" }));

    expect(screen.getAllByText(/Modelo fixo MT-0018 pendente de vinculação/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Planilha-padrão pronta para download")).toBeNull();
  });

  test("modelo fixo pendente bloqueia seleção de planilha e envio do respondente", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Abrir link da coleta (SEI)" }));
    fireEvent.change(screen.getByPlaceholderText("ex.: joao.lima@seduc.ma.gov.br"), {
      target: { value: "joao.lima@seduc.ma.gov.br" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-simulada" } });
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await user.click(screen.getByRole("button", { name: /Preencher e subir/ }));

    expect(
      screen.getByText(
        "O modelo fixo MT-0016 ainda não foi vinculado. Não é possível subir ou enviar respostas.",
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Modelo fixo MT-0016 pendente de vinculação",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    const upload = screen.getByRole("button", {
      name: /Arraste aqui ou clique para simular a seleção/,
    }) as HTMLButtonElement;
    expect(upload.disabled).toBe(true);
    fireEvent.drop(upload, { dataTransfer: { files: [new File(["x"], "sentinela.xlsx")] } });
    expect(screen.queryByText("mt-0016_seduc_preenchida.xlsx")).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Enviar e gerar comprovante" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Não tenho esta informação" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Salvar rascunho" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
