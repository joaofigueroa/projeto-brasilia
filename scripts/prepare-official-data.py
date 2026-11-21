# Offline preparation only; this is not part of the Next.js runtime.
# See docs/intelligence-data.md for input URLs, dependencies and validation.
from pathlib import Path
import json,unicodedata,re,math
import xlrd
from openpyxl import load_workbook
import argparse
parser=argparse.ArgumentParser(description='Preparar fontes públicas já baixadas; requer xlrd e openpyxl em um ambiente Python separado.')
parser.add_argument('input_directory',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
base=args.input_directory
states=json.loads((base/'states.json').read_text())
cities=json.loads((base/'cities.json').read_text())
pops={str(x['D1C']):int(x['V']) for x in json.loads((base/'population-states.json').read_text())[1:] if x['V'].isdigit()}
popc={str(x['D1C']):int(x['V']) for x in json.loads((base/'population-cities.json').read_text())[1:] if x['V'].isdigit()}
def uf(city):
 return (city.get('microrregiao') or {}).get('mesorregiao',{}).get('UF') or city['regiao-imediata']['regiao-intermediaria']['UF']
territories={'states':[{'code':s['sigla'],'id':str(s['id']),'name':s['nome'],'region':str(s['regiao']['id']),'regionName':s['regiao']['nome'],'population':pops.get(str(s['id']))} for s in states], 'cities':[{'code':str(c['id']),'name':c['nome'],'state':uf(c)['sigla'],'population':popc.get(str(c['id']))} for c in cities]}
(root/'src/data/official/territories.json').write_text(json.dumps(territories,ensure_ascii=False,separators=(',',':')))
# Geographic projection: longitude/latitude, aspect correction at 15°S.
features=json.loads((base/'map.json').read_text())['features']
def project(pt):
 return [round((pt[0]+74.5)*13,2),round((6-pt[1])*13.1,2)]
maprows=[]
for feature in features:
 state=next(s for s in states if str(s['id'])==feature['properties']['codarea'])
 g=feature['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 paths=[]
 for polygon in polys:
  for ring in polygon:
   points=[project(p) for p in ring]
   paths.append('M'+'L'.join(f'{p[0]},{p[1]}' for p in points)+'Z')
 # Area-weighted centroid of the largest outer ring.
 ring=max((p[0] for p in polys),key=lambda r:len(r))
 area=cx=cy=0
 for a,b in zip(ring,ring[1:]+ring[:1]):
  cross=a[0]*b[1]-b[0]*a[1];area+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross
 center=project([cx/(3*area),cy/(3*area)])
 maprows.append({'code':state['sigla'],'path':''.join(paths),'center':center})
(root/'src/data/brazil-map.json').write_text(json.dumps(maprows,separators=(',',':')))
print('Geography:',len(states),'states,',len(cities),'municipalities,',len(maprows),'map paths')
# Normalize only spelling, never approximate a municipality.
def norm(s):return re.sub('[^A-Z0-9]','',unicodedata.normalize('NFKD',s.upper()).encode('ascii','ignore').decode())
lookup={(uf(c)['sigla'],norm(c['nome'])):str(c['id']) for c in cities}
aliases={('SP','EMBUGUACU'):('SP','EMBUGUACU'),('SP','EMBU'):('SP','EMBUDASARTES'),('SC','PRESIDENTECASTELOBRANCO'):('SC','PRESIDENTECASTELLOBRANCO')}
fleet={'headers':[],'years':{},'unmatched':{}}
for year in [2022,2023,2024]:
 if year<2024:
  sheet=xlrd.open_workbook(str(base/f'fleet-{year}.xls')).sheet_by_index(0);rows=[sheet.row_values(i) for i in range(sheet.nrows)]
 else:rows=list(load_workbook(base/f'fleet-{year}.xlsx',read_only=True,data_only=True).active.iter_rows(values_only=True))
 header=next(r for r in rows if str(r[0]).strip().upper()=='UF' and str(r[2]).strip().upper()=='TOTAL')
 current={'states':{},'cities':{}};missing=[]
 for r in rows:
  state=str(r[0]).strip().upper()
  if state not in [s['sigla'] for s in states] or not isinstance(r[2],(int,float)):continue
  vals=[int(x or 0) for x in r[2:24]]
  current['states'].setdefault(state,[0]*22)
  current['states'][state]=[a+b for a,b in zip(current['states'][state],vals)]
  key=(state,norm(str(r[1])))
  code=lookup.get(aliases.get(key,key))
  if code:current['cities'][code]=vals
  else:missing.append([state,r[1],vals[0]])
 fleet['headers']=[str(x).strip() for x in header[2:24]]
 assert sum(x[0] for x in current['states'].values()) == int(rows[1][2]), f'National total mismatch: {year}'
 fleet['years'][str(year)]=current;fleet['unmatched'][str(year)]=missing
 print(year,'total',sum(x[0] for x in current['states'].values()),'matched cities',len(current['cities']),'unmatched',missing[:30])
(root/'src/data/official/fleet.json').write_text(json.dumps(fleet,ensure_ascii=False,separators=(',',':')))
