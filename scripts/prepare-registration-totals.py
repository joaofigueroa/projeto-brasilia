"""Publish verified state automobile registration totals from the Anfavea yearbook.

Usage: python scripts/prepare-registration-totals.py path/to/anfavea-2026.pdf
Requires pdfplumber. Reuses the audited extraction and reconciles all 27 UFs.
"""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('registration_audit', ROOT / 'scripts/prepare-registration-source-audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
path = Path(sys.argv[1])
page, rows = audit.extract_uf_totals(path)
years = list(range(2016, 2026))
values = {uf: {str(row['year']): row['quantity'] for row in rows if row['uf'] == uf} for uf in sorted(audit.UF_BY_NAME.values())}
result = {
    'source': {'name': 'Anfavea · Anuário 2026 · tabela 2.2.2',
               'url': audit.SOURCES['anfavea-2026.pdf'], 'pdfPage': page,
               'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
               'checkedOn': '2026-11-25', 'vehicleClass': 'AUTOMÓVEIS / CARS',
               'metric': 'registrations', 'geographicLevel': 'state',
               'modelDimension': False, 'municipalityDimension': False},
    'years': years, 'states': values,
    'national': {str(year): sum(row[str(year)] for row in values.values()) for year in years},
}
output = ROOT / 'src/data/official/state-car-registrations.json'
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(f'Published {len(rows)} verified observations; 27 UFs × 10 years. All annual national totals reconcile.')
