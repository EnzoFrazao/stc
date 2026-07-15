import { describe, expect, test } from "vitest";
import * as tesauroDataModule from "./tesauroData";

type TesauroField = {
  id: string;
  label: string;
};

type TesauroObject = {
  code: string;
  kind?: string;
  suggestedUgs: readonly string[];
  fieldIds?: readonly string[];
  requiredFieldIds?: readonly string[];
  attachmentIds?: readonly string[];
  fields: readonly TesauroField[];
};

type TesauroAttachment = {
  id: string;
  label: string;
  selected?: boolean;
};

const data = tesauroDataModule as unknown as {
  tesauroObjects: readonly TesauroObject[];
  tesauroFields?: readonly TesauroField[];
  tesauroAttachments?: readonly TesauroAttachment[];
};

const automatedCodes = [
  "MT-0006",
  "MT-0007",
  "MT-0008",
  "MT-0009",
  "MT-0010",
  "MT-0014",
  "MT-0017",
  "MT-0039",
];

describe("catálogo do Tesauro", () => {
  test("expõe exatamente os 41 objetos manuais como objetos fixos", () => {
    const expectedManualCodes = Array.from(
      { length: 49 },
      (_, index) => `MT-${String(index + 1).padStart(4, "0")}`,
    ).filter((code) => !automatedCodes.includes(code));

    expect(data.tesauroObjects).toHaveLength(41);
    expect(data.tesauroObjects.every((object) => object.kind === "fixo")).toBe(true);
    expect([...data.tesauroObjects.map((object) => object.code)].sort()).toEqual(
      expectedManualCodes,
    );
    expect(data.tesauroObjects.map((object) => object.code)).toContain("MT-0011");
  });

  test("não infere nem aproxima UGs sugeridas", () => {
    expect(data.tesauroObjects.every((object) => object.suggestedUgs.length === 0)).toBe(true);
  });

  test("exporta 228 campos canônicos oriundos dos Metadados Obrigatórios", () => {
    expect(Array.isArray(data.tesauroFields)).toBe(true);
    if (!data.tesauroFields) return;

    expect(data.tesauroFields).toHaveLength(228);
    expect(new Set(data.tesauroFields.map((field) => field.id)).size).toBe(228);
    expect(new Set(data.tesauroFields.map((field) => field.label)).size).toBe(228);
    expect(data.tesauroFields.map((field) => field.label)).not.toEqual(
      expect.arrayContaining([
        "── METADADOS FIXOS (obrigatórios em qualquer OB) ──",
        "── METADADOS VARIÁVEIS (conforme natureza da OB) ──",
      ]),
    );
  });

  test("preserva 389 atribuições objeto→campo usando os IDs canônicos", () => {
    expect(Array.isArray(data.tesauroFields)).toBe(true);
    if (!data.tesauroFields) return;

    const fieldsById = new Map(data.tesauroFields.map((field) => [field.id, field]));
    expect(
      data.tesauroObjects.reduce((total, object) => total + (object.fieldIds?.length ?? 0), 0),
    ).toBe(389);
    expect(
      data.tesauroObjects.reduce(
        (total, object) => total + (object.requiredFieldIds?.length ?? 0),
        0,
      ),
    ).toBe(385);

    for (const object of data.tesauroObjects) {
      expect(object.fieldIds).toEqual(object.fields.map((field) => field.id));
      expect(object.fields).toEqual(object.fieldIds?.map((fieldId) => fieldsById.get(fieldId)));
      expect(object.fieldIds).toEqual(expect.arrayContaining([...(object.requiredFieldIds ?? [])]));
    }
  });

  test("mantém os quatro campos condicionais do MT-0049 disponíveis sem torná-los universais", () => {
    const mt0049 = data.tesauroObjects.find((object) => object.code === "MT-0049");
    const conditionalIds = [
      "nome-do-programa-ou-projeto-quando-beneficio-social",
      "numero-de-beneficiarios-quando-pagamento-individualizado",
      "favorecido-cpf-cnpj-quando-fornecedor-ou-beneficiario-unico",
      "lista-de-beneficiarios-autenticacao-cpf-agencia-conta-valor-situacao-data-quando-bbpag-ou-similar",
    ];

    expect(mt0049?.fieldIds).toHaveLength(14);
    expect(mt0049?.fieldIds).toEqual(expect.arrayContaining(conditionalIds));
    expect(mt0049?.requiredFieldIds).toHaveLength(10);
    expect(mt0049?.requiredFieldIds).not.toEqual(expect.arrayContaining(conditionalIds));
  });

  test("exporta somente os cinco anexos citados como opções não selecionadas", () => {
    expect(Array.isArray(data.tesauroAttachments)).toBe(true);
    if (!data.tesauroAttachments) return;

    expect(data.tesauroAttachments.map((attachment) => attachment.label)).toEqual([
      "Termo de Recebimento",
      "Anexo de Metas Fiscais",
      "Anexo de Riscos Fiscais",
      "Plano de Trabalho",
      "Relatório de Prestação de Contas",
    ]);
    expect(data.tesauroAttachments.every((attachment) => attachment.selected === undefined)).toBe(
      true,
    );
  });

  test("associa somente os anexos inequivocamente obrigatórios a cada objeto", () => {
    const attachmentsByCode = new Map(
      data.tesauroObjects.map((object) => [object.code, object.attachmentIds ?? []]),
    );

    expect(attachmentsByCode.get("MT-0013")).toEqual(["termo-de-recebimento"]);
    expect(attachmentsByCode.get("MT-0022")).toEqual([
      "anexo-de-metas-fiscais",
      "anexo-de-riscos-fiscais",
    ]);
    expect(attachmentsByCode.get("MT-0034")).toEqual(["plano-de-trabalho"]);
    expect(attachmentsByCode.get("MT-0016")).toEqual([]);
    expect(
      data.tesauroObjects.flatMap((object) => object.attachmentIds ?? []),
    ).not.toContain("relatorio-de-prestacao-de-contas");
  });
});
