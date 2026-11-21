"""Extract only the AUTOMÓVEIS annual ranking from original Fenabrave PDFs.
Usage: python scripts/prepare-car-models.py /path/to/{2022,2023,2024}.pdf
Requires pdfplumber for offline preparation. Runtime remains Next.js.
"""
from pathlib import Path
import argparse,json,re,hashlib
import pdfplumber
parser=argparse.ArgumentParser();parser.add_argument('input',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
result={}
for year in [2022,2023,2024]:
 file=args.input/f'{year}.pdf'
 with pdfplumber.open(file) as pdf:
  page=pdf.pages[6]
  title=page.extract_text()
  assert 'acumulad' in title.lower() and str(year) in title
  text=page.crop((0,70,page.width*.51,page.height)).extract_text(x_tolerance=1)
  rows=[]
  for rank,name,count in re.findall(r'^(\d+)[º°]\s+(.+?)\s+([\d.]+)\s*$',text,re.M):
   make,model=name.split('/',1)
   rows.append({'rank':int(rank),'make':make.strip(),'model':model.strip(),'value':int(count.replace('.',''))})
  assert [r['rank'] for r in rows]==list(range(1,51)),(year,len(rows))
  assert not any(r['model']=='STRADA' for r in rows),'Commercial vehicle leaked into automobile ranking'
  url=f'https://www.fenabrave.org.br/portal/files/{year}_12_{"02" if year==2024 else "2"}.pdf'
  result[str(year)]={'sourceUrl':url,'sourceName':'Fenabrave · ranking anual de automóveis','page':7,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'rows':rows}
  print(year,len(rows),'models',next(r['value'] for r in rows if r['model']=='NIVUS'))
(root/'src/data/official/car-models.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')))
