from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT.parent / "DocumentosAdcionais" / "levantamento de requisitos" / "Tesauro_MA_Transparente_v2_3_17_03.xlsx"
OUTPUT = ROOT / "src" / "tesauroData.ts"


ATTACHMENT_LABELS = [
    "Termo de Recebimento",
    "Anexo de Metas Fiscais",
    "Anexo de Riscos Fiscais",
    "Plano de Trabalho",
    "Relatório de Prestação de Contas",
]

MANDATORY_ATTACHMENTS_BY_OBJECT = {
    "MT-0013": ["Termo de Recebimento"],
    "MT-0022": ["Anexo de Metas Fiscais", "Anexo de Riscos Fiscais"],
    "MT-0034": ["Plano de Trabalho"],
}

MANDATORY_ATTACHMENT_EVIDENCE = {
    "MT-0013": "Termo de recebimento é documento obrigatório",
    "MT-0022": "Anexo de Metas Fiscais e o Anexo de Riscos Fiscais são partes obrigatórias",
    "MT-0034": "Anexar o plano de trabalho aprovado",
}


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return normalized or "item"


def field_type(label: str) -> str:
    lowered = label.lower()
    if any(term in lowered for term in ["valor", "taxa", "%", "percentual"]):
        return "Moeda / número"
    if any(term in lowered for term in ["data", "período", "vigência", "exercício", "mês"]):
        return "Data / período"
    if any(term in lowered for term in ["link", "fonte", "documento", "arquivo", "relatório", "ato"]):
        return "URL ou arquivo"
    if any(term in lowered for term in ["quantidade", "total", "número", "codigo", "código"]):
        return "Número / texto"
    if any(term in lowered for term in ["situação", "status", "tipo", "modalidade"]):
        return "Seleção"
    return "Texto"


def clean(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def main() -> None:
    workbook = openpyxl.load_workbook(WORKBOOK, data_only=True, read_only=True)
    objects = []
    fields_by_id = {}

    unknown_attachment_labels = {
        label
        for labels in MANDATORY_ATTACHMENTS_BY_OBJECT.values()
        for label in labels
        if label not in ATTACHMENT_LABELS
    }
    if unknown_attachment_labels:
        raise ValueError(
            "Mandatory attachments missing from ATTACHMENT_LABELS: "
            + ", ".join(sorted(unknown_attachment_labels))
        )

    for worksheet in workbook.worksheets[1:]:
        subject = worksheet.title
        for raw_row in worksheet.iter_rows(min_row=2, values_only=True):
            row = tuple(raw_row) + (None,) * (17 - len(raw_row))
            if not row[0] or not row[1]:
                continue

            flow = clean(row[11])
            if "Coleta manual" not in flow:
                continue

            metadata_labels = []
            required_metadata_labels = []
            variable_metadata_section = False
            for raw_label in re.split(r"\n+", clean(row[8])):
                label = raw_label.strip()
                if not label:
                    continue
                section_marker = (
                    unicodedata.normalize("NFKD", label)
                    .encode("ascii", "ignore")
                    .decode("ascii")
                    .upper()
                )
                if "METADADOS VARIAVEIS" in section_marker:
                    variable_metadata_section = True
                    continue
                if "METADADOS FIXOS" in section_marker:
                    variable_metadata_section = False
                    continue
                metadata_labels.append(label)
                if not variable_metadata_section:
                    required_metadata_labels.append(label)
            name = clean(row[1])
            code = clean(row[0])
            scope_note = clean(row[7])
            attachment_labels = MANDATORY_ATTACHMENTS_BY_OBJECT.get(code, [])
            evidence = MANDATORY_ATTACHMENT_EVIDENCE.get(code)
            if evidence and evidence.casefold() not in scope_note.casefold():
                raise ValueError(
                    f"Mandatory attachment evidence changed for {code}: {evidence!r}"
                )
            field_ids = []
            for label in metadata_labels:
                field_id = slug(label)
                field_ids.append(field_id)
                fields_by_id.setdefault(
                    field_id,
                    {
                        "id": field_id,
                        "label": label,
                        "type": field_type(label),
                        "hint": "Campo obrigatório definido pelo Tesauro.",
                        "required": True,
                    },
                )
            required_field_ids = [slug(label) for label in required_metadata_labels]

            objects.append(
                {
                    "id": slug(f"{row[0]}-{name}"),
                    "code": code,
                    "name": name,
                    "kind": "fixo",
                    "subject": subject,
                    "cadence": clean(row[10]),
                    "format": clean(row[13]) or clean(row[12]) or "Formato a definir",
                    "source": "Tesauro",
                    "description": clean(row[6]),
                    "scopeNote": scope_note,
                    "collectionSource": clean(row[12]),
                    "publication": clean(row[14]),
                    "legalBasis": clean(row[15]),
                    "status": clean(row[16]) or "Ativo",
                    "suggestedUgs": [],
                    "attachmentIds": [slug(label) for label in attachment_labels],
                    "fieldIds": field_ids,
                    "requiredFieldIds": required_field_ids,
                    "fields": [fields_by_id[field_id] for field_id in field_ids],
                }
            )

    fields = list(fields_by_id.values())
    attachments = [{"id": slug(label), "label": label} for label in ATTACHMENT_LABELS]

    content = (
        "export const tesauroFields = "
        + json.dumps(fields, ensure_ascii=False, indent=2)
        + " as const;\n\n"
        + "export const tesauroAttachments = "
        + json.dumps(attachments, ensure_ascii=False, indent=2)
        + " as const;\n\n"
        + "export const tesauroObjects = "
        + json.dumps(objects, ensure_ascii=False, indent=2)
        + " as const;\n\n"
        + "export type TesauroFieldData = (typeof tesauroFields)[number];\n"
        + "export type TesauroAttachmentData = (typeof tesauroAttachments)[number];\n"
        + "export type TesauroObjectData = (typeof tesauroObjects)[number];\n"
    )
    OUTPUT.write_text(content, encoding="utf-8")
    assignments = sum(len(item["fieldIds"]) for item in objects)
    required_assignments = sum(len(item["requiredFieldIds"]) for item in objects)
    mandatory_attachment_assignments = sum(len(item["attachmentIds"]) for item in objects)
    print(
        f"Wrote {OUTPUT} with {len(objects)} objects, "
        f"{len(fields)} fields, {assignments} field assignments, "
        f"{required_assignments} initially required assignments and "
        f"{mandatory_attachment_assignments} mandatory attachment assignments"
    )


if __name__ == "__main__":
    main()
