"""Prepare complete SC first-registration model tables from public Detran exports.

Usage: python scripts/prepare-sc-car-models.py SOURCE_DIRECTORY [--fetch]
Use --fetch to download the four public aggregate queries before validation.
Inputs: sc-response.json, sc-controls-response.json, fln-models-response.json,
fln-controls-response.json, and the matching *-request.json queries.
All files come from the public report linked by Detran-SC, not from fleet data.
"""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://www.detran.sc.gov.br/primeiro-emplacamento-e-transferencias-de-veiculos/'
RESOURCE = 'efe6e97c-9bd8-4a65-8320-ead6437dcec6'
YEARS = list(range(2016, 2026))


def fetch_exports(directory):
    directory.mkdir(parents=True, exist_ok=True)

    def column(alias, name):
        return {'Column': {'Expression': {'SourceRef': {'Source': alias}}, 'Property': name}}

    def fetch(name, city, control):
        from_tables = [{'Name': 'f', 'Entity': 'view_primeiro_emplacamento', 'Type': 0}]
        if control:
            select = [dict(column('f', field), Name=field)
                      for field in ['ano', 'mes', 'dsc_servico']]
        else:
            from_tables.append({'Name': 'v', 'Entity': 'view_marcamodelo', 'Type': 0})
            select = [dict(column('v', field), Name=field) for field in ['marca', 'modelo']]
            select.append(dict(column('f', 'ano'), Name='ano'))
        select.append({'Aggregation': {'Expression': column('f', 'num_total'), 'Function': 0},
                       'Name': 'Quantity'})
        filters = {'tpo_veiculo': ["'AUTOMOVEL'"], 'ano': [f'{year}L' for year in YEARS]}
        if city:
            filters['nom_municipio'] = ["'FLORIANOPOLIS'"]
        query = {'Version': 2, 'From': from_tables, 'Select': select, 'Where': [
            {'Condition': {'In': {'Expressions': [column('f', field)],
                                 'Values': [[{'Literal': {'Value': value}}] for value in values]}}}
            for field, values in filters.items()]}
        body = {'version': '1.0.0', 'modelId': 7641225, 'cancelQueries': [], 'queries': [{
            'Query': {'Commands': [{'SemanticQueryDataShapeCommand': {
                'Query': query, 'Binding': {'Primary': {'Groupings': [{'Projections': [0, 1, 2, 3]}]},
                                          'DataReduction': {'DataVolume': 4, 'Primary': {'Window': {'Count': 30000}}},
                                          'Version': 1}, 'ExecutionMetricsKind': 1}}]},
            'QueryId': 'verified-automobile-models'}]}
        request = directory / f'{name}-request.json'
        request.write_text(json.dumps(body))
        subprocess.run([
            'curl', '--fail', '--location', '--compressed', '--max-time', '60', '--silent', '--show-error',
            'https://wabi-brazil-south-api.analysis.windows.net/public/reports/querydata',
            '-H', f'X-PowerBI-ResourceKey: {RESOURCE}', '-H', 'Content-Type: application/json',
            '--data-binary', f'@{request}', '-o', str(directory / f'{name}-response.json'),
        ], check=True)

    jobs = [('sc', False, False), ('sc-controls', False, True),
            ('fln-models', True, False), ('fln-controls', True, True)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda args: fetch(*args), jobs))


def read_export(directory, name):
    path = directory / f'{name}-response.json'
    payload = json.loads(path.read_text())
    if len(payload['results']) != 1:
        raise ValueError('Expected one aggregate query result')
    data = payload['results'][0]['result']['data']
    datasets = data['dsr']['DS']
    if len(datasets) != 1 or datasets[0].get('IC') is not True:
        raise ValueError('Export is truncated or incomplete')
    dataset = datasets[0]
    groups = dataset['PH']
    if len(groups) != 1 or set(groups[0]) != {'DM0'}:
        raise ValueError('Unexpected data shape; review export before publishing')
    output, schema, previous = [], [], []
    for row in groups[0]['DM0']:
        schema = row.get('S', schema)
        cells = iter(row.get('C', []))
        values = []
        for index, column in enumerate(schema):
            if row.get('R', 0) & (1 << index):
                value = previous[index]
            elif row.get('Ø', 0) & (1 << index):
                value = None
            else:
                value = next(cells)
                if column.get('DN') and isinstance(value, int):
                    value = dataset['ValueDicts'][column['DN']][value]
            values.append(value)
        if next(cells, None) is not None:
            raise ValueError('Unused cells in aggregate export')
        output.append(values)
        previous = values
    events = data['metrics']['Events']
    row_counts = [e['Metrics']['RowCount'] for e in events if 'RowCount' in e.get('Metrics', {})]
    if not row_counts or any(count != len(output) for count in row_counts):
        raise ValueError('Export row count does not match independent execution metrics')
    return output, data['timestamp'], hashlib.sha256(path.read_bytes()).hexdigest()


def verify_request(directory, name, city):
    payload = json.loads((directory / f'{name}-request.json').read_text())
    if payload['modelId'] != 7641225:
        raise ValueError('Unexpected public dataset')
    query = payload['queries'][0]['Query']['Commands'][0]['SemanticQueryDataShapeCommand']['Query']
    actual = {rule['Condition']['In']['Expressions'][0]['Column']['Property']:
              [row[0]['Literal']['Value'] for row in rule['Condition']['In']['Values']]
              for rule in query['Where']}
    expected = {'tpo_veiculo': ["'AUTOMOVEL'"], 'ano': [f'{year}L' for year in YEARS]}
    if city:
        expected['nom_municipio'] = ["'FLORIANOPOLIS'"]
    if actual != expected:
        raise ValueError('Wrong vehicle class, years or geography in source query')


def prepare(directory):
    publications, provenance = [], []
    for models_name, controls_name, city in [('sc', 'sc-controls', None),
                                            ('fln-models', 'fln-controls', '4205407')]:
        for name in [models_name, controls_name]:
            verify_request(directory, name, city)
        models, retrieved, models_hash = read_export(directory, models_name)
        controls, _, controls_hash = read_export(directory, controls_name)
        if {row[2] for row in models} != set(YEARS):
            raise ValueError('Missing or unexpected years in model export')
        for year in YEARS:
            entries = [row for row in models if row[2] == year]
            monthly = [row for row in controls if row[0] == year]
            if len(monthly) != 12 or {row[1] for row in monthly} != set(range(1, 13)):
                raise ValueError(f'Incomplete annual period: {city or "SC"} / {year}')
            if any(row[2] != 'PRIMEIRO EMPLACAMENTO' for row in monthly):
                raise ValueError('Transfer or another service is mixed into new registrations')
            if any(not isinstance(row[-1], int) or row[-1] < 0 for row in entries + monthly):
                raise ValueError('Invalid quantities')
            if sum(row[-1] for row in entries) != sum(row[-1] for row in monthly):
                raise ValueError(f'Models do not reconcile with independent monthly totals: {year}')
            keys = [(row[0], row[1]) for row in entries]
            if len(set(keys)) != len(keys):
                raise ValueError('Duplicate model observations')
            notes = [
                'Detran-SC: serviço PRIMEIRO EMPLACAMENTO e tipo AUTOMOVEL, com os 12 meses completos; transferências e demais tipos excluídos.',
                'As denominações de marca e modelo são as do cadastro público. A classificação administrativa e o universo diferem do resumo setorial da Anfavea; as duas séries não são somadas.',
            ]
            if any(not row[0] or not row[1] for row in entries):
                notes.append('Há grupo sem marca ou modelo informado na fonte; sua quantidade foi preservada sem inferir a identificação.')
            publications.append({
                'uf': 'SC', 'city': city, 'year': year,
                'territoryLabel': 'Florianópolis · SC' if city else 'Santa Catarina',
                'sourceName': 'Detran-SC · primeiro emplacamento de automóveis',
                'sourceUrl': SOURCE, 'sourceKind': 'government',
                'periodStart': f'{year}-01-01', 'periodEnd': f'{year}-12-31',
                'classification': 'AUTOMOVEL', 'publishedRows': len(entries),
                'publishedTotal': sum(row[-1] for row in monthly),
                'monthlyTotals': [{'month': row[1], 'value': row[3]} for row in sorted(monthly)],
                'retrievedAt': retrieved, 'sha256': models_hash,
                'controlsSha256': controls_hash, 'completeExport': True, 'notes': notes,
                'rows': [{'make': row[0] or 'Marca não informada',
                          'model': row[1] or 'Modelo não informado', 'value': row[3]}
                         for row in sorted(entries, key=lambda row: (-row[3], row[0] or '', row[1] or ''))],
            })
        for name in [models_name, controls_name]:
            for kind in ['request', 'response']:
                file = directory / f'{name}-{kind}.json'
                provenance.append({'file': file.name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    return {'sourceUrl': SOURCE, 'publicReportResource': RESOURCE,
            'years': YEARS, 'files': provenance, 'publications': publications}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    parser.add_argument('--fetch', action='store_true', help='Fetch the four public aggregate queries before validation')
    args = parser.parse_args()
    if args.fetch:
        fetch_exports(args.directory)
    result = prepare(args.directory)
    path = ROOT / 'src/data/official/sc-car-models.json'
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Verified {len(result["publications"])} complete annual tables; '
          f'{sum(p["publishedRows"] for p in result["publications"])} model/year observations.')
