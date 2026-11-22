"""Extract Sincodiv-DF annual AUTOMÓVEIS tables, excluding all other sections.

Usage: python scripts/prepare-regional-car-models.py /path/to/DF-{year}.pdf
Requires pdfplumber offline. Numbers are reconciled against the published
annual section totals. Inconsistent monthly/annual observations stay null.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import re
import pdfplumber

parser = argparse.ArgumentParser()
parser.add_argument('input', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
filenames = {
    2022: '2022-ranking-dos-modelos.pdf',
    2023: '2023-ranking-dos-modelos.pdf',
    2024: 'RANKING-POR-MODELO-DEZEMBRO-2024.pdf',
    2025: 'RANKING-POR-MODELO-DEZEMBRO-2025.pdf',
}
result = []

def number(cell):
    cleaned = re.sub(r'[.\s]', '', cell or '')
    assert re.fullmatch(r'\d+|-|', cleaned), repr(cell)
    return int(cleaned) if cleaned not in ['', '-'] else 0

for year, filename in filenames.items():
    file = args.input / f'DF-{year}.pdf'
    observations = []
    total = None
    pages = []
    with pdfplumber.open(file) as pdf:
        first = pdf.pages[0].extract_text()
        assert f'EM {year}, NO DISTRITO FEDERAL' in first
        assert 'AUTOMÓVEIS' in first
        for index, page in enumerate(pdf.pages):
            pages.append(index + 1)
            for table in page.extract_tables():
                for cells in table:
                    if len(cells) != 16:
                        continue
                    if cells[1] == 'TOTAL':
                        total = number(cells[-1])
                        break
                    if cells[1] and cells[2] and cells[1] != 'MARCA':
                        values = [number(cell) for cell in cells[3:]]
                        make = re.sub(r'\s+', ' ', cells[1]).strip()
                        model = re.sub(r'\s+', ' ', cells[2]).strip()
                        # A documented brand alias; model/version labels stay as published.
                        make = 'VW' if make == 'VOLKSWAGEN' else make
                        observations.append({
                            'make': make, 'model': model, 'publishedValue': values[-1],
                            'value': values[-1] if sum(values[:-1]) == values[-1] else None,
                            'issue': '' if sum(values[:-1]) == values[-1] else
                                f'Total anual publicado ({values[-1]}) difere da soma mensal ({sum(values[:-1])}).',
                        })
                if total is not None:
                    break
            if total is not None:
                break
    assert total and sum(r['publishedValue'] for r in observations) == total, (year, total)
    assert not any(r['model'] == 'STRADA' for r in observations)
    groups = {}
    for row in observations:
        key = (row['make'], row['model'])
        item = groups.setdefault(key, {'make': row['make'], 'model': row['model'], 'value': 0, 'issue': ''})
        if row['issue']:
            item['issue'] = row['issue']
        item['value'] += row['value'] or 0
    for row in groups.values():
        if row['issue']:
            row['value'] = None
    result.append({
        'uf': 'DF', 'year': year, 'sourceName': 'Sincodiv-DF · ranking anual de automóveis',
        'sourceUrl': 'https://sincodivdf.com.br/wp-content/uploads/2026/06/' + filename,
        'catalogUrl': 'https://sincodivdf.com.br/emplacamentos/',
        'sourceKind': 'industry', 'periodStart': f'{year}-01-01', 'periodEnd': f'{year}-12-31',
        'pages': pages, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
        'publishedTotal': total, 'publishedRows': len(observations),
        'classification': 'AUTOMÓVEIS, conforme classificação da publicação Sincodiv-DF.',
        'rows': list(groups.values()),
    })
    print(year, len(groups), 'models;', total, 'published total;',
          sum(bool(r['issue']) for r in groups.values()), 'inconsistent observations')
output = root / 'src/data/official/regional-car-models.json'
output.write_text(json.dumps({'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                             'publications': result}, ensure_ascii=False, indent=2) + '\n')
