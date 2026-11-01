import {defaultSettings,upgradeHama,separatePosts,currentCatalog,initialProducts,upgradeCatalog,Product,Settings} from './data';
export const demo=false;
const base=import.meta.env.VITE_API_URL||'';
let csrf='';
export async function request(path:string,init:RequestInit={}){
 const res=await fetch(base+'/api/v1'+path,{...init,credentials:'include',headers:{'Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{}),...init.headers}});
 const body=res.status===204?null:await res.json();
 if(!res.ok)throw new Error(body?.error?.message||'Não foi possível concluir. Tente novamente.');
 if(body?.csrfToken)csrf=body.csrfToken;
 return body;
}
function local<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
export async function loadProducts(admin=false):Promise<Product[]>{if(demo){const saved=local<Product[]|null>('jubis-products-v3',null);if(saved)return separatePosts(saved);const prior=local<Product[]|null>('jubis-products-v2',null);const migrated=upgradeHama(prior||currentCatalog(upgradeCatalog(local<Product[]|null>('jubis-products-v1',null))));localStorage.setItem('jubis-products-v3',JSON.stringify(migrated));return separatePosts(migrated);}if(admin)return(await request('/admin/products')).data;let page=1;const all:Product[]=[];while(true){const result=await request('/products?pageSize=100&page='+page);all.push(...result.data);if(all.length>=result.pagination.total||!result.data.length)return all;page++}}
export async function loadSettings():Promise<Settings>{return demo?local('jubis-settings-v1',defaultSettings):(await request('/settings/public')).data;}
export async function saveProduct(p:Product,existing:boolean){if(demo){const all=await loadProducts(true);if(existing&&all.find(x=>x.id===p.id)?.version!==p.version)throw new Error('A peça foi alterada. Reabra o formulário.');localStorage.setItem('jubis-products-v3',JSON.stringify(existing?all.map(x=>x.id===p.id?{...p,version:p.version+1}:x):[...all,p]));return;} const keys=['sku','slug','name','collectionId','category','description','materials','dimensions','careInstructions','priceMode','priceCents','availability','publicationStatus','featured','version','leadTimeDays','images'] as const;const data=Object.fromEntries(keys.map(k=>[k,p[k]]));return request('/admin/products'+(existing?'/'+p.id:''),{method:existing?'PATCH':'POST',body:JSON.stringify(data)});}
export async function saveSettings(settings:Settings){if(demo){localStorage.setItem('jubis-settings-v1',JSON.stringify(settings));return;}return request('/admin/settings',{method:'PATCH',body:JSON.stringify(settings)});}
export async function upload(file:File):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Use JPG, PNG ou WebP de até 5 MB.');
 if(demo){if(file.size>900000)throw new Error('Na demonstração, use uma imagem de até 900 KB.');return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Falha na leitura da imagem.'));r.readAsDataURL(file)});}
 const form=new FormData();form.append('file',file);const res=await fetch('/api/v1/admin/uploads',{method:'POST',credentials:'include',body:form});const result=await res.json();if(!res.ok)throw new Error(result?.error?.message||'Falha ao enviar imagem.');return result.secureUrl;
}
