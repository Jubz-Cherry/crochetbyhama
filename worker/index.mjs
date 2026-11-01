import {seedProducts,seedSettings,indexHtml,assetPaths} from './generated.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const isOwner=(req,env)=>!!req.headers.get('oai-authenticated-user-id')&&!!env.ADMIN_EMAIL&&req.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.ADMIN_EMAIL.toLowerCase();
async function products(env){const rows=await env.DB.prepare('SELECT payload FROM products').all();const result=new Map(seedProducts.map(p=>[p.id,p]));for(const r of rows.results) {const p=JSON.parse(r.payload);result.set(p.id,p)}return [...result.values()]}
function validate(p){
 if(!p||typeof p!=='object')error('Confira os dados da peça.');
 for(const [key,max] of Object.entries({name:120,sku:40,slug:140,category:60,description:4000,materials:1000,dimensions:1000,careInstructions:1000}))if(typeof p[key]!=='string'||p[key].length>max)error('Confira o campo '+key+'.');
 if(!p.name.trim()||!p.sku.trim()||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug))error('Preencha o nome e o endereço da peça.');
 if(!['croche','hama-beads'].includes(p.collectionId)||!['DRAFT','PUBLISHED','ARCHIVED'].includes(p.publicationStatus)||!['AVAILABLE','RESERVED','MADE_TO_ORDER','SOLD_OUT','CONSULT'].includes(p.availability))error('Confira a coleção e a disponibilidade.');
 if(!['FIXED','ON_REQUEST'].includes(p.priceMode)||typeof p.featured!=='boolean'||!Number.isInteger(p.version)||p.version<1)error('Dados inválidos.');
 if(p.priceMode==='FIXED'&&(!Number.isInteger(p.priceCents)||p.priceCents<0||p.priceCents>99999999))error('Informe um preço válido.');
 if(p.leadTimeDays!==null&&(!Number.isInteger(p.leadTimeDays)||p.leadTimeDays<1||p.leadTimeDays>365))error('Prazo inválido.');
 if(!Array.isArray(p.images)||p.images.length>8)error('Use até 8 imagens.');
 for(const im of p.images)if(typeof im.secureUrl!=='string'||!(assetPaths.includes(im.secureUrl)||/^\/media\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(im.secureUrl))||typeof im.altText!=='string'||im.altText.length>300)error('Imagem não autorizada.');
 if(p.publicationStatus==='PUBLISHED'&&(!p.description.trim()||!p.images.length||p.images.some(i=>!i.altText.trim())))error('Para publicar, inclua descrição e foto com descrição.');
 return Object.fromEntries(['sku','slug','name','collectionId','category','description','materials','dimensions','careInstructions','priceMode','priceCents','availability','publicationStatus','featured','version','leadTimeDays','images'].map(k=>[k,p[k]]));
}
async function handle(req,env){
 const url=new URL(req.url),path=url.pathname,admin=path.startsWith('/api/v1/admin');
 if(admin){if(!isOwner(req,env))return json({error:{message:'Entre com a conta da proprietária para acessar o painel.'}},401);if(!['GET','HEAD'].includes(req.method)&&req.headers.get('origin')!==url.origin)return json({error:{message:'Origem não autorizada.'}},403)}
 if(path==='/api/v1/admin/auth/me')return json({user:{email:req.headers.get('oai-authenticated-user-email')}});
 if(path==='/api/v1/products'||path==='/api/v1/admin/products'&&req.method==='GET'){let all=await products(env);if(!admin)all=all.filter(p=>p.publicationStatus==='PUBLISHED');return json({data:all,pagination:{total:all.length}})}
 if(path==='/api/v1/settings/public'||path==='/api/v1/admin/settings'&&req.method==='GET'){const row=await env.DB.prepare('SELECT payload FROM settings WHERE id=1').first();return json({data:row?JSON.parse(row.payload):seedSettings})}
 if(path==='/api/v1/admin/settings'&&req.method==='PATCH'){const s=await req.json();if(typeof s.name!=='string'||!s.name.trim()||s.name.length>80||typeof s.about!=='string'||s.about.length>4000||typeof s.ordering!=='string'||s.ordering.length>4000||!/^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(s.instagramUrl))error('Confira as informações da loja.');await env.DB.prepare('INSERT INTO settings(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(JSON.stringify({name:s.name,about:s.about,ordering:s.ordering,instagramUrl:s.instagramUrl})).run();return json({data:s})}
 if((path==='/api/v1/admin/products'&&req.method==='POST')||(path.startsWith('/api/v1/admin/products/')&&req.method==='PATCH')){
  const input=validate(await req.json()),all=await products(env),existing=req.method==='PATCH',id=existing?path.split('/').pop():crypto.randomUUID();
  const old=all.find(p=>p.id===id);if(existing&&!old)error('Peça não encontrada.',404);if(existing&&old.version!==input.version)error('A peça mudou. Reabra o formulário.',409);
  if(all.some(p=>p.id!==id&&(p.slug===input.slug||p.sku===input.sku)))error('Nome de endereço ou código já utilizado.',409);
  for(const im of input.images)if(im.secureUrl.startsWith('/media/')&&!await env.BUCKET.head(im.secureUrl.slice(7)))error('Envie novamente a imagem.');
  const p={...input,id,priceCents:input.priceMode==='ON_REQUEST'?null:input.priceCents,version:existing?input.version+1:1,images:input.images.map((im,i)=>({id:typeof im.id==='string'?im.id:crypto.randomUUID(),secureUrl:im.secureUrl,altText:im.altText,sortOrder:i}))};
  const result=await env.DB.prepare('INSERT INTO products(id,slug,sku,version,payload) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,sku=excluded.sku,version=excluded.version,payload=excluded.payload WHERE products.version=?').bind(id,p.slug,p.sku,p.version,JSON.stringify(p),input.version).run();
  if(!result.meta.changes)error('A peça mudou. Reabra o formulário.',409);return json({data:p},existing?200:201);
 }
 if(path==='/api/v1/admin/uploads'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>5*1024*1024+10000)error('Use uma imagem de até 5 MB.',413);
  const form=await req.formData(),file=form.get('file');if(!file||typeof file==='string'||file.size>5*1024*1024||file.size<12)error('Use JPG, PNG ou WebP de até 5 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10',jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if(!png&&!jpg&&!webp)error('Formato de imagem inválido.');const ext=png?'png':jpg?'jpg':'webp',key=crypto.randomUUID()+'.'+ext;
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'image/'+(jpg?'jpeg':ext)}});return json({secureUrl:'/media/'+key},201);
 }
 if(path.startsWith('/media/')){const key=path.slice(7);if(!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key))return new Response('Não encontrada',{status:404});if(!isOwner(req,env)&&!(await products(env)).some(p=>p.publicationStatus==='PUBLISHED'&&p.images.some(im=>im.secureUrl===path)))return new Response('Não encontrada',{status:404});const object=await env.BUCKET.get(key);if(!object)return new Response('Não encontrada',{status:404});return new Response(object.body,{headers:{'Content-Type':object.httpMetadata.contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
 if(path.startsWith('/api/'))return json({error:{message:'Recurso não encontrado.'}},404);
 if(assetPaths.includes(path)&&env.ASSETS)return env.ASSETS.fetch(req);
 if(path.includes('.')&&path!=='/')return new Response('Não encontrado',{status:404});
 return new Response(indexHtml,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
}
export default {async fetch(req,env){try{return await handle(req,env)}catch(e){return json({error:{message:e.status?e.message:'Não foi possível salvar agora. Tente novamente.'}},e.status||500)}}};
export {validate,isOwner};
