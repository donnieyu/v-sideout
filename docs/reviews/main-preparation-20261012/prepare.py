"""Read-only source inventory + isolated UI candidate, without staging or live DB access."""
from pathlib import Path
import hashlib, json, subprocess, tempfile, tarfile, io, shutil
root=Path(__file__).resolve().parents[3]
out=Path(__file__).resolve().parent
run=lambda *args:subprocess.check_output(args,cwd=root)
paths=sorted(set(run('git','diff','--name-only','HEAD','-z').decode().split('\0')+run('git','ls-files','--others','--exclude-standard','-z').decode().split('\0'))-{''})
def category(p):
 if p.startswith('docs/reviews/main-preparation-20261012/'): return 'preparation'
 if p in ['docs/CLOUDFLARE_OPERATIONS.md','web/wrangler.production.json']: return 'separate-operations'
 if p.startswith('docs/reviews/sites-test-deployment-20261012/') or p in ['web/app/layout.tsx','web/lib/auth/credentials.ts','web/package.json','web/package-lock.json','web/tests/sideout-credentials-runtime.test.ts'] or (p.startswith('web/tests/') and p.endswith('.mjs')): return 'hosting-auth'
 if p.startswith(('web/components/sideout/','web/lib/sideout/','web/tests/sideout-','web/scripts/verify-allocation-toolbar-scroll.mjs')) or p=='web/app/session/new/page.tsx': return 'approved-ui'
 if p.startswith(('docs/design-review/allocation-actions-preview/','docs/design-review/allocation-ui-evolution-20261006/','docs/reviews/mobile-navigation-20261009/')): return 'preserved-experiment'
 if p=='web/DESIGN.md' or p.startswith(('docs/reviews/','docs/superpowers/plans/','docs/design-review/schedule-home-concepts-20261009/')): return 'approved-evidence'
 return 'unclassified'
entries=[]
for p in paths:
 f=root/p
 entries.append({'path':p,'category':category(p),'sha256':hashlib.sha256(f.read_bytes()).hexdigest() if f.is_file() else None,'bytes':f.stat().st_size if f.is_file() else 0})
assert not [e for e in entries if e['category']=='unclassified'], 'Unknown changes must be classified explicitly'
meta={'head':run('git','rev-parse','HEAD').decode().strip(),'main':run('git','rev-parse','main').decode().strip(),'entries':entries}
(out/'inventory.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
for cat in sorted({e['category'] for e in entries}):
 (out/(cat+'-files.txt')).write_text(''.join(e['path']+'\n' for e in entries if e['category']==cat))
candidate=Path(tempfile.mkdtemp(prefix='sideout-main-ui-'))
with tarfile.open(fileobj=io.BytesIO(run('git','archive','HEAD','web','.nvmrc')),mode='r:') as archive: archive.extractall(candidate,filter='data')
for e in entries:
 if e['category']=='approved-ui':
  target=candidate/e['path'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/e['path'],target)
# The dependency lockfile is HEAD's, not the hosting patch. Install separately.
(out/'candidate.json').write_text(json.dumps({'path':str(candidate),'base':meta['head'],'overlayCategory':'approved-ui','excluded':'hosting/auth, experiments, operations, local state'},indent=2)+'\n')
print(json.dumps({'candidate':str(candidate),'categories':{cat:len([e for e in entries if e['category']==cat]) for cat in sorted({e['category'] for e in entries})}},ensure_ascii=False))
