"""Extract auditable research evidence; does not modify the app's runtime datasets.

Usage: python scripts/prepare-registration-source-audit.py SOURCE_DIRECTORY
Requires pdfplumber. Sources and checksums are written with the extracted CSV.
"""

import csv
import hashlib
import json
import re
import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "research" / "registration-evidence"
UF_BY_NAME = {
    "ACRE": "AC", "ALAGOAS": "AL", "AMAPÁ": "AP", "AMAZONAS": "AM",
    "BAHIA": "BA", "CEARÁ": "CE", "DISTRITO FEDERAL": "DF",
    "ESPÍRITO SANTO": "ES", "GOIÁS": "GO", "MARANHÃO": "MA",
    "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG",
    "PARÁ": "PA", "PARAÍBA": "PB", "PARANÁ": "PR", "PERNAMBUCO": "PE",
    "PIAUÍ": "PI", "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN",
    "RIO GRANDE DO SUL": "RS", "RONDÔNIA": "RO", "RORAIMA": "RR",
    "SANTA CATARINA": "SC", "SÃO PAULO": "SP", "SERGIPE": "SE", "TOCANTINS": "TO",
}
SOURCES = {
    "anfavea-2026.pdf": "https://anfavea.com.br/site/wp-content/uploads/2026/07/BOOK-ANUARIO-ANFAVEA-2026BAIXA.pdf",
    "es-aug2026.pdf": "https://sincodives.com.br/assets/modules/publicacoes/download/files/2631/agosto-6.pdf",
}


def extract_uf_totals(path):
    with pdfplumber.open(path) as pdf:
        candidates = [
            (index + 1, page.extract_text() or "")
            for index, page in enumerate(pdf.pages)
        ]
    pages = [
        (number, text) for number, text in candidates
        if "2.2.2 Emplacamento de autoveículos por unidades da federação" in text
        and "AUTOMÓVEIS / CARS" in text
        and "SÃO PAULO 470.283" in text
    ]
    if len(pages) != 1:
        raise ValueError("Expected exactly one UF × year table for AUTOMÓVEIS")
    page, text = pages[0]
    data = {}
    totals = None
    for line in text.splitlines():
        match = re.fullmatch(r"(.+?) ((?:[\d.]+ ){9}[\d.]+)", line.strip())
        if not match:
            continue
        name, numbers = match.groups()
        values = [int(number.replace(".", "")) for number in numbers.split()]
        if name in UF_BY_NAME:
            data[UF_BY_NAME[name]] = values
        elif name == "TOTAL GERAL / Grand total":
            totals = values
    if set(data) != set(UF_BY_NAME.values()) or totals is None:
        raise ValueError("Missing UFs or national control totals")
    if totals != [1688288, 1856586, 2102114, 2262073, 1615942, 1558467,
                  1576662, 1721415, 1948681, 1997264]:
        raise ValueError("The source's national control totals changed")
    for index, year in enumerate(range(2016, 2026)):
        if sum(values[index] for values in data.values()) != totals[index]:
            raise ValueError(f"UF totals do not reconcile for {year}")
    return page, [
        {"uf": uf, "year": year, "vehicle_class": "AUTOMÓVEIS / CARS",
         "metric": "registrations", "quantity": values[index],
         "source": "Anfavea — Anuário 2026, tabela 2.2.2",
         "source_pdf_page": page, "source_url": SOURCES[path.name]}
        for uf, values in sorted(data.items())
        for index, year in enumerate(range(2016, 2026))
    ]


def extract_vitoria(path):
    matches = []
    with pdfplumber.open(path) as pdf:
        if "VEÍCULOS EMPLACADOS - AGOSTO 2026" not in (pdf.pages[0].extract_text() or ""):
            raise ValueError("Unexpected ES reporting period")
        for index, page in enumerate(pdf.pages):
            for line in (page.extract_text() or "").splitlines():
                match = re.fullmatch(r"VITORIA AUTOMOVEL (\d+)", line.strip())
                if match:
                    matches.append((index + 1, int(match.group(1))))
    if matches != [(13, 407)]:
        raise ValueError(f"Unexpected Vitória observation: {matches}")
    return {"uf": "ES", "municipality_ibge": "3205309", "municipality": "Vitória",
            "year": 2026, "month": 8, "vehicle_class": "AUTOMOVEL", "quantity": 407,
            "metric": "registrations", "model": None, "source_pdf_page": 13,
            "source_url": SOURCES[path.name]}


def main():
    directory = Path(sys.argv[1])
    page, rows = extract_uf_totals(directory / "anfavea-2026.pdf")
    vitoria = extract_vitoria(directory / "es-aug2026.pdf")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with (OUTPUT / "uf-car-registrations-2016-2025.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    evidence = {
        "checked_on": "2026-11-22",
        "purpose": "Source research only; not imported into the application",
        "uf_table": {"rows": len(rows), "ufs": 27, "years": list(range(2016, 2026)),
                     "pdf_page": page, "all_annual_sums_reconciled": True,
                     "model_dimension": False, "municipality_dimension": False},
        "municipal_pdf_sample": vitoria,
        "files": [
            {"file": name, "source_url": url,
             "sha256": hashlib.sha256((directory / name).read_bytes()).hexdigest()}
            for name, url in SOURCES.items()
        ],
    }
    (OUTPUT / "provenance.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")
    print(f"Verified {len(rows)} observations, 27 UFs × 10 years; all national sums reconcile.")
    print("Verified Vitória / ES, AUTOMOVEL, August 2026: 407; source page 13.")


if __name__ == "__main__":
    main()
