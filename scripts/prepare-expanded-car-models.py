"""Prepare original annual automobile publications; never infer municipal data.
Usage: python scripts/prepare-expanded-car-models.py /path/to/MT-2024.pdf-and-BR-2025.pdf
Requires pdfplumber offline. Download URLs are recorded in provenance.json.
"""
from pathlib import Path
import argparse, datetime, hashlib, json, re
import pdfplumber

parser = argparse.ArgumentParser()
parser.add_argument('input', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
retrieved = datetime.datetime.now(datetime.timezone.utc).isoformat()
resources = []

def sha(path):
    assert path.read_bytes().startswith(b'%PDF-'), f'Original PDF required: {path}'
    return hashlib.sha256(path.read_bytes()).hexdigest()

mt = args.input / 'MT-2024.pdf'
observations = []
with pdfplumber.open(mt) as pdf:
    title = re.sub(r'\s+', '', pdf.pages[0].extract_text())
    assert 'EMPLACADOSEM2024' in title and 'Estado:MatoGrosso-Segmento:Auto' in title
    assert len(pdf.pages) == 4
    for page_number, page in enumerate(pdf.pages, 1):
        for table in page.extract_tables({'text_x_tolerance': 1}):
            for cells in table:
                if len(cells) != 14 or '/' not in (cells[0] or ''):
                    continue
                name = re.sub(r'\s+', ' ', cells[0]).strip()
                make, model = name.split('/', 1)
                values = []
                for cell in cells[1:]:
                    assert cell and re.fullmatch(r'\d+|-', cell), repr(cell)
                    values.append(int(cell) if cell != '-' else 0)
                assert sum(values[:12]) == values[12], (name, values)
                observations.append({'make': make.strip(), 'model': model.strip(), 'value': values[-1], 'page': page_number})
assert len(observations) == 135
assert sum(row['value'] for row in observations) == 31513
assert not any(row['model'] in ['STRADA', 'SAVEIRO', 'CG 160'] for row in observations)
groups = {}
for row in observations:
    key = (row['make'], row['model'])
    item = groups.setdefault(key, {'make': row['make'], 'model': row['model'], 'value': 0})
    item['value'] += row['value']
mt_url = 'https://fenabravemt.com.br/wp-content/uploads/2025/01/Auto.pdf'
summary_url = 'https://fenabravemt.com.br/wp-content/uploads/2025/01/Emplacamentos-Fenabrave-MT-Dez-PDF.pdf'
summary = args.input / 'MT-2024-summary.pdf'
publication = {
    'uf': 'MT', 'city': None, 'year': 2024,
    'sourceName': 'Fenabrave-MT · ranking anual de automóveis',
    'sourceUrl': mt_url,
    'catalogUrl': 'https://fenabravemt.com.br/2025/01/10/emplacamentos-dezembro-2024/',
    'sourceKind': 'industry', 'periodStart': '2024-01-01', 'periodEnd': '2024-12-31',
    'pages': [1, 2, 3, 4], 'sha256': sha(mt),
    'publishedRows': len(observations), 'listedTotal': 31513,
    'sectionTotal': 31541, 'sectionTotalSourceUrl': summary_url, 'sectionTotalPage': 4,
    'classification': 'Segmento Auto, conforme classificação da Fenabrave-MT. Não inclui Comercial Leve, Moto, Caminhão ou Ônibus.',
    'notes': ['A lista publicada soma 31.513 emplacamentos; o resumo anual da entidade informa 31.541 automóveis. A diferença de 28 não foi atribuída a modelos. A lista não representa cobertura integral do mercado estadual.'],
    'rows': list(groups.values()),
}
(root / 'src/data/official/additional-car-models.json').write_text(json.dumps({'retrievedAt': retrieved, 'publications': [publication]}, ensure_ascii=False, indent=2) + '\n')
for path, url in [(mt, mt_url), (summary, summary_url)]:
    resources.append({'file': path.name, 'url': url, 'sha256': sha(path)})

br = args.input / 'BR-2025.pdf'
with pdfplumber.open(br) as pdf:
    page = pdf.pages[6]
    title = page.extract_text()
    assert 'Dezembro/2025' in title and 'Janeiro de 2026' in title
    text = page.crop((0, 70, page.width * .51, page.height)).extract_text(x_tolerance=1)
    rows = []
    for rank, name, count in re.findall(r'^(\d+)[º°]\s+(.+?)\s+([\d.]+)\s*$', text, re.M):
        make, model = name.split('/', 1)
        rows.append({'rank': int(rank), 'make': make.strip(), 'model': model.strip(), 'value': int(count.replace('.', ''))})
    assert [r['rank'] for r in rows] == list(range(1, 51))
    assert not any(r['model'] in ['STRADA', 'SAVEIRO'] for r in rows)
url = 'https://www.fenabrave.org.br/portal/files/2025_12_02.pdf'
path = root / 'src/data/official/car-models.json'
national = json.loads(path.read_text())
national['2025'] = {'sourceUrl': url, 'sourceName': 'Fenabrave · ranking anual de automóveis', 'page': 7, 'sha256': sha(br), 'rows': rows}
path.write_text(json.dumps(national, ensure_ascii=False, separators=(',', ':')))
resources.append({'file': br.name, 'url': url, 'sha256': sha(br)})
path = root / 'src/data/official/provenance.json'
provenance = json.loads(path.read_text())
collections = provenance['additionalCollections']
collections[:] = [c for c in collections if c['directory'] != 'expanded-models']
collections.append({'retrievedAt': retrieved, 'directory': 'expanded-models', 'resources': resources})
path.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
print('MT 2024:', len(groups), 'distinct labels;', len(observations), 'rows;', publication['listedTotal'], 'listed registrations; BR 2025:', len(rows), 'models')
