"""Extract the defined automotive census from a public RFB mirror; never reads QSA.

Requires duckdb. Downloads one shard per worker, filters it, then removes the raw
file. Output contains business registry fields only and records the source month.
"""
import argparse
import concurrent.futures
import json
from pathlib import Path
import re
import subprocess
import sys

local_modules = Path('.local/research-runtime/python')
if local_modules.exists():
    sys.path.insert(0, str(local_modules.resolve()))
import duckdb

parser = argparse.ArgumentParser()
parser.add_argument('--dataset', default='ArthurKrieger/cnpj-dados-receita-brasil-2026-10')
parser.add_argument('--directory', default='.local/research-runtime/census')
args = parser.parse_args()
if not re.fullmatch(r'(ArthurKrieger|cnpjaberto)/cnpj-dados-receita-brasil-\d{4}-\d{2}', args.dataset):
    raise ValueError('Use a verified CNPJ mirror repository.')
folder = Path(args.directory)
folder.mkdir(parents=True, exist_ok=True)
base = f'https://huggingface.co/datasets/{args.dataset}/resolve/main/'

def download(name, target):
    subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--retry', '2', '--max-time', '180', base + name, '--output', str(target)], check=True)

manifest_path = folder/'manifest.json'
download('_manifest.json', manifest_path)
manifest = json.loads(manifest_path.read_text())
criteria = "(cnae_fiscal_principal IN ('4520001','4520003','4520004','4530701','4530703') OR regexp_matches(coalesce(cnae_fiscal_secundaria,''), '(^|,)(4520001|4520003|4520004|4530701|4530703)(,|$)'))"
location = "((uf='DF' AND municipio='9701') OR (uf='GO' AND municipio='9373'))"

def process(entry):
    name = entry['file']
    table = entry['table']
    output = folder/Path(name).name
    if output.exists():
        return str(output)
    raw = folder/('raw-' + Path(name).name)
    download(name, raw)
    if raw.stat().st_size != entry['bytes']:
        raise ValueError('Incomplete source download: ' + name)
    con = duckdb.connect()
    con.execute("SET memory_limit='512MB'")
    con.execute('SET threads=1')
    if table == 'estabelecimentos':
        query = f"SELECT cnpj_basico,cnpj_ordem,cnpj_dv,identificador_matriz_filial,nome_fantasia,situacao_cadastral,data_inicio_atividade,cnae_fiscal_principal,cnae_fiscal_secundaria,tipo_logradouro,logradouro,numero,complemento,bairro,cep,uf,municipio,ddd1,telefone1 FROM read_parquet(?) WHERE {location} AND situacao_cadastral='02' AND {criteria}"
        con.execute(f"COPY ({query}) TO '{output}' (FORMAT PARQUET)", [str(raw)])
    else:
        con.execute("CREATE TEMP TABLE roots AS SELECT DISTINCT cnpj_basico FROM read_parquet(?)", [str(folder/'estabelecimentos*.parquet')])
        con.execute(f"COPY (SELECT e.cnpj_basico,e.razao_social,e.capital_social FROM read_parquet(?) e JOIN roots r USING(cnpj_basico)) TO '{output}' (FORMAT PARQUET)", [str(raw)])
    count = con.execute('SELECT count(*) FROM read_parquet(?)', [str(output)]).fetchone()[0]
    con.close()
    raw.unlink()
    print(f'{name}: {count} selected establishments or legal entities', flush=True)
    return str(output)

for table in ['estabelecimentos', 'empresas']:
    entries = [entry for entry in manifest['files'] if entry['table'] == table]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(process, entries))

con = duckdb.connect()
rows = con.execute("SELECT s.*,e.razao_social,e.capital_social FROM read_parquet(?) s LEFT JOIN read_parquet(?) e USING(cnpj_basico) ORDER BY s.uf,s.cnpj_basico,s.cnpj_ordem", [str(folder/'estabelecimentos*.parquet'),str(folder/'empresas*.parquet')])
columns = [item[0] for item in rows.description]
items = [dict(zip(columns,row)) for row in rows.fetchall()]
result = {'dataset':args.dataset, 'month':manifest['month'], 'source':manifest['source'], 'criteria':['4520001','4520003','4520004','4530701','4530703'], 'rows':items}
(folder/'companies.json').write_text(json.dumps(result, ensure_ascii=False))
counts = {state:sum(row['uf']==state for row in items) for state in ['DF','GO']}
print('Census extracted:', json.dumps(counts), flush=True)
