from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT.parent / "DocumentosAdcionais" / "levantamento de requisitos" / "Tesauro_MA_Transparente_v2_3_17_03.xlsx"
OUTPUT = ROOT / "src" / "tesauroData.ts"


SUBJECT_UGS = {
    "Institucional": ["seduc", "saf", "sinfra", "sefaz"],
    "Gestão Fiscal": ["sefaz", "saf"],
    "Obras e Infraestrutura": ["sinfra", "saf"],
    "Pessoal": ["saf", "seduc"],
    "Licitações e Contratos": ["seduc", "saf", "sinfra", "sefaz"],
    "Planejamento e Resultados": ["sefaz", "saf", "seduc"],
    "Transparência Passiva": ["sefaz", "seduc"],
    "Emendas Parlamentares": ["sefaz", "saf"],
    "Controle e Integridade": ["sefaz", "saf"],
    "Convênios e Transferências": ["saf", "seduc", "sinfra"],
    "Dados Abertos": ["seduc", "saf", "sinfra", "sefaz"],
}


OBJECT_UGS = {
    "OBRA": ["sinfra", "saf"],
    "LICITAÇÃO": ["seduc", "saf", "sinfra", "sefaz"],
    "CONTRATO": ["seduc", "saf", "sinfra", "sefaz"],
    "TRABALHADOR": ["saf", "seduc"],
    "ESTAGIÁRIO": ["saf", "seduc"],
    "OUVIDORIA": ["sefaz"],
    "PEDIDO DE INFORMAÇÃO": ["sefaz", "seduc"],
    "DÍVIDA ATIVA": ["sefaz"],
    "ORDEM BANCÁRIA": ["sefaz", "saf"],
    "EMENDA": ["sefaz", "saf"],
    "CONVÊNIO": ["saf", "seduc", "sinfra"],
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


def suggested_ugs(subject: str, name: str) -> list[str]:
    for key, values in OBJECT_UGS.items():
        if key in name:
            return values
    return SUBJECT_UGS.get(subject, ["seduc", "saf", "sinfra", "sefaz"])


def clean(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def main() -> None:
    workbook = openpyxl.load_workbook(WORKBOOK, data_only=True, read_only=True)
    objects = []

    for worksheet in workbook.worksheets[1:]:
        subject = worksheet.title
        for raw_row in worksheet.iter_rows(min_row=2, values_only=True):
            row = tuple(raw_row) + (None,) * (17 - len(raw_row))
            if not row[0] or not row[1]:
                continue

            flow = clean(row[11])
            if "Coleta manual" not in flow and "Maranhão Transparente" not in flow:
                continue

            metadata_labels = [
                item.strip()
                for item in re.split(r"\n+", clean(row[8]))
                if item.strip() and "──" not in item
            ]
            fields = [
                {
                    "id": slug(label),
                    "label": label,
                    "type": field_type(label),
                    "hint": f"Campo obrigatório do Tesauro para {clean(row[1]).title()}.",
                    "required": True,
                }
                for label in metadata_labels
            ]

            name = clean(row[1])
            objects.append(
                {
                    "id": slug(f"{row[0]}-{name}"),
                    "code": clean(row[0]),
                    "name": name,
                    "subject": subject,
                    "cadence": clean(row[10]),
                    "format": clean(row[13]) or clean(row[12]) or "Formato a definir",
                    "source": "Tesauro",
                    "description": clean(row[6]),
                    "scopeNote": clean(row[7]),
                    "collectionSource": clean(row[12]),
                    "publication": clean(row[14]),
                    "legalBasis": clean(row[15]),
                    "status": clean(row[16]) or "Ativo",
                    "suggestedUgs": suggested_ugs(subject, name),
                    "fields": fields,
                }
            )

    content = (
        "export const tesauroObjects = "
        + json.dumps(objects, ensure_ascii=False, indent=2)
        + " as const;\n\n"
        + "export type TesauroObjectData = (typeof tesauroObjects)[number];\n"
    )
    OUTPUT.write_text(content, encoding="utf-8")
    print(f"Wrote {OUTPUT} with {len(objects)} objects")


if __name__ == "__main__":
    main()
