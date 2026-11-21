"""Generate SVG geography from the official IBGE v3 municipal GeoJSON files.
Usage: python scripts/prepare-municipal-maps.py /path/to/downloaded/{UF}.json
"""
from pathlib import Path
import argparse,json,math
parser=argparse.ArgumentParser();parser.add_argument('input',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
catalog=json.loads((root/'src/data/official/territories.json').read_text())
names={c['code']:c['name'] for c in catalog['cities']}
out=root/'src/data/municipalities';out.mkdir(exist_ok=True)
for state in catalog['states']:
 data=json.loads((args.input/(state['code']+'.json')).read_text())
 def polygons(g):return g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 points=[p for f in data['features'] for poly in polygons(f['geometry']) for ring in poly for p in ring]
 minx,maxx=min(p[0] for p in points),max(p[0] for p in points)
 miny,maxy=min(p[1] for p in points),max(p[1] for p in points)
 cos=math.cos(math.radians((miny+maxy)/2))
 scale=min(548/((maxx-minx)*cos),528/(maxy-miny))
 padx=(580-(maxx-minx)*cos*scale)/2;pady=(560-(maxy-miny)*scale)/2
 def project(p):return [round(padx+(p[0]-minx)*cos*scale,2),round(pady+(maxy-p[1])*scale,2)]
 features=[]
 for f in data['features']:
  code=str(f['properties']['codarea']);polys=polygons(f['geometry']);segments=[]
  for polygon in polys:
   for ring in polygon:segments.append('M'+'L'.join(','.join(str(v) for v in project(p)) for p in ring)+'Z')
  ring=max((p[0] for p in polys),key=len);a=cx=cy=0
  for p,q in zip(ring,ring[1:]+ring[:1]):
   cross=p[0]*q[1]-q[0]*p[1];a+=cross;cx+=(p[0]+q[0])*cross;cy+=(p[1]+q[1])*cross
  center=project([cx/(3*a),cy/(3*a)]) if a else project(ring[0])
  features.append({'code':code,'name':names.get(code,code),'path':''.join(segments),'center':center})
 (out/(state['code']+'.json')).write_text(json.dumps({'state':state['code'],'features':features},ensure_ascii=False,separators=(',',':')))
 print(state['code'],len(features))
