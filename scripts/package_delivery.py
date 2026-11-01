from pathlib import Path
import zipfile, tarfile
root=Path(__file__).resolve().parents[1]
out=root.parent/'entregaveis'
out.mkdir(exist_ok=True)
excluded={'.git','node_modules','.npm-cache','.tests'}
with zipfile.ZipFile(out/'Jubis_Site_Codigo_e_Preview.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for p in root.rglob('*'):
        rel=p.relative_to(root)
        if not p.is_file() or any(x in excluded for x in rel.parts) or p.name=='audit.json' or p.name=='.env': continue
        archive.write(p,'jubis-site/'+rel.as_posix())
with tarfile.open(out/'jubis-site-deploy.tar.gz','w:gz') as archive:
    archive.add(root/'.openai/hosting.json',arcname='.openai/hosting.json')
    archive.add(root/'dist',arcname='dist')
print('Pacotes preparados')
