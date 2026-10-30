"""Validate a runtime against a release lock; never mutates the runtime."""
import argparse,hashlib,json
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--instance',required=True,type=Path)
parser.add_argument('--lock',required=True,type=Path)
parser.add_argument('--role',choices=['client','server'],required=True)
parser.add_argument('--output',type=Path)
args=parser.parse_args()
root=args.instance.resolve();lock=json.loads(args.lock.read_text(encoding='utf-8'))
expected={r['name']:r for r in lock['serverMods'] if args.role=='server' or r['name'] not in lock['serverOnlyMods']}
if args.role=='client':expected.update({r['name']:r for r in lock['clientOnlyMods']})
problems=[]
for name,row in expected.items():
    p=root/'mods'/name
    if not p.is_file():problems.append({'path':'mods/'+name,'problem':'missing'})
    elif hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:problems.append({'path':'mods/'+name,'problem':'different_hash'})
unexpected=[p.name for p in (root/'mods').glob('*.jar') if p.name not in expected]
for name in unexpected:problems.append({'path':'mods/'+name,'problem':'unexpected_active_jar'})
for row in lock['sharedFiles']:
    p=root/row['path']
    if not p.is_file():problems.append({'path':row['path'],'problem':'missing'})
    elif hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:problems.append({'path':row['path'],'problem':'different_hash'})
result={'release':lock['release'],'instance':str(root),'role':args.role,'expectedMods':len(expected),'sharedFiles':len(lock['sharedFiles']),'pass':not problems,'problems':problems}
if args.output:
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'release':lock['release'],'role':args.role,'pass':not problems,'expectedMods':len(expected),'sharedFiles':len(lock['sharedFiles']),'problems':problems[:20]},ensure_ascii=False))
raise SystemExit(0 if not problems else 1)
