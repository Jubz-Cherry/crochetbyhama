import express,{Request,Response,NextFunction} from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import {PrismaClient,Prisma} from '@prisma/client';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import argon2 from 'argon2';
import {v2 as cloudinary} from 'cloudinary';
import {z,ZodError} from 'zod';
import {loginInput,productInput,settingsInput,queryInput,validOrigin,publicProduct} from './validation';
const db=new PrismaClient();
const production=process.env.NODE_ENV==='production';
const origin=process.env.APP_ORIGIN||'http://localhost:5173';
const cookieName=production?'__Host-jubis-session':'jubis-session';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
const app=express();
app.disable('x-powered-by');
// Set TRUST_PROXY=1 only behind one trusted reverse proxy.
if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],imgSrc:["'self'",'data:','https://res.cloudinary.com'],connectSrc:["'self'",'https://api.cloudinary.com'],objectSrc:["'none'"],frameAncestors:["'none'"]}}}));
app.use(express.json({limit:'100kb'}));app.use(cookieParser());
app.use('/api',rateLimit({windowMs:60000,limit:200,standardHeaders:true,legacyHeaders:false,message:{error:{code:'RATE_LIMITED',message:'Muitas solicitações. Tente novamente em um minuto.'}}}));
class HttpError extends Error{constructor(public status:number,message:string,public code='REQUEST_FAILED'){super(message)}}
const fail=(status:number,message:string,code?:string)=>{throw new HttpError(status,message,code)};
const id=(req:Request,key='id')=>String(req.params[key]);
const cookieOptions={httpOnly:true,secure:production,sameSite:'lax' as const,path:'/',maxAge:8*60*60*1000};
async function auth(req:Request,res:Response,next:NextFunction){try{const token=req.cookies[cookieName];if(typeof token!=='string'||token.length>200)return fail(401,'Entre no painel para continuar.','UNAUTHENTICATED');const session=await db.session.findUnique({where:{tokenHash:hash(token)},include:{adminUser:true}});if(!session||session.revokedAt||session.expiresAt<new Date()||!session.adminUser.active||session.adminUser.role!=='OWNER')return fail(401,'Sua sessão expirou. Entre novamente.','UNAUTHENTICATED');res.locals.session=session;if(!['GET','HEAD','OPTIONS'].includes(req.method)){if(!validOrigin(req.get('origin'),origin))return fail(403,'Origem da solicitação não autorizada.','ORIGIN_INVALID');const supplied=req.get('x-csrf-token')||'';const expected=session.csrfToken;if(supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return fail(403,'Atualize a página e tente novamente.','CSRF_INVALID')}next()}catch(e){next(e)}}
app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
const publicImageSelect={id:true,secureUrl:true,altText:true,sortOrder:true};
const imageInclude={orderBy:{sortOrder:'asc' as const},select:publicImageSelect};
app.get('/api/v1/collections',async(_req,res)=>res.json({data:await db.collection.findMany({orderBy:{sortOrder:'asc'}})}));
app.get('/api/v1/products',async(req,res)=>{const q=queryInput.parse(req.query);const where:Prisma.ProductWhereInput={publicationStatus:'PUBLISHED',...(q.collection?{collectionId:q.collection}:{}),...(q.category?{category:q.category}:{}),...(q.availability?{availability:q.availability}:{}),...(q.q?{name:{contains:q.q,mode:'insensitive'}}:{})};const [data,total]=await db.$transaction([db.product.findMany({where,include:{images:imageInclude},orderBy:[{sortOrder:'asc'},{id:'asc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize}),db.product.count({where})]);res.json({data:data.map(publicProduct),pagination:{page:q.page,pageSize:q.pageSize,total}})});
app.get('/api/v1/products/:slug',async(req,res)=>{const p=await db.product.findFirst({where:{slug:String(req.params.slug),publicationStatus:'PUBLISHED'},include:{images:imageInclude}});if(!p)return fail(404,'Peça não encontrada.');res.json({data:publicProduct(p)})});
app.get('/api/v1/settings/public',async(_req,res)=>{const row=await db.siteSettings.findUnique({where:{id:1}});if(!row)return fail(503,'O catálogo está sendo preparado.');const {id,...data}=row;res.json({data})});
const loginLimit=rateLimit({windowMs:15*60000,limit:8,standardHeaders:true,legacyHeaders:false,message:{error:{code:'LOGIN_LIMIT',message:'Muitas tentativas. Aguarde 15 minutos.'}}});
app.post('/api/v1/admin/auth/login',loginLimit,async(req,res)=>{if(!validOrigin(req.get('origin'),origin))return fail(403,'Origem não autorizada.');const data=loginInput.parse(req.body);const user=await db.adminUser.findUnique({where:{email:data.email}});const valid=user?await argon2.verify(user.passwordHash,data.password):false;if(!user||!user.active||!valid)return fail(401,'E-mail ou senha inválidos.');const token=randomBytes(32).toString('hex'),csrfToken=randomBytes(24).toString('hex');await db.session.create({data:{adminUserId:user.id,tokenHash:hash(token),csrfToken,expiresAt:new Date(Date.now()+cookieOptions.maxAge)}});res.cookie(cookieName,token,cookieOptions);res.json({user:{email:user.email},csrfToken})});
app.use('/api/v1/admin',auth);
app.get('/api/v1/admin/auth/me',(_req,res)=>{const s=res.locals.session;res.json({user:{email:s.adminUser.email},csrfToken:s.csrfToken})});
app.post('/api/v1/admin/auth/logout',async(_req,res)=>{await db.session.update({where:{id:res.locals.session.id},data:{revokedAt:new Date()}});res.clearCookie(cookieName,{httpOnly:true,secure:production,sameSite:'lax',path:'/'});res.sendStatus(204)});
app.get('/api/v1/admin/products',async(_req,res)=>res.json({data:await db.product.findMany({include:{images:imageInclude},orderBy:{updatedAt:'desc'}})}));
app.get('/api/v1/admin/products/:id',async(req,res)=>{const p=await db.product.findUnique({where:{id:id(req)},include:{images:imageInclude}});if(!p)return fail(404,'Peça não encontrada.');res.json({data:p})});
async function validatedImages(images:z.infer<typeof productInput>['images']){
 const cloud=process.env.CLOUDINARY_CLOUD_NAME;if(!cloud&&images.length)fail(503,'Configure o serviço de imagens antes de publicar.');
 return Promise.all(images.map(async(im,i)=>{const url=new URL(im.secureUrl);const prefix=`/${cloud}/image/upload/`;if(url.protocol!=='https:'||url.hostname!=='res.cloudinary.com'||!url.pathname.startsWith(prefix))return fail(400,'Imagem fora do serviço autorizado.');const path=url.pathname.slice(prefix.length).replace(/^v\d+\//,'');const publicId=decodeURIComponent(path.replace(/\.[a-zA-Z0-9]+$/,''));if(!publicId.startsWith('jubis/'))return fail(400,'Pasta da imagem não autorizada.');const resource=await cloudinary.api.resource(publicId,{resource_type:'image'});if(!['jpg','jpeg','png','webp'].includes(resource.format)||resource.bytes>5*1024*1024||resource.width>8000||resource.height>8000)return fail(400,'Imagem inválida. Use JPG, PNG ou WebP de até 5 MB e 8000 pixels.');return {cloudinaryPublicId:publicId,secureUrl:resource.secure_url as string,altText:im.altText,width:resource.width as number,height:resource.height as number,sortOrder:i}}));
}
async function writeProduct(req:Request,res:Response,existing:boolean){const input=productInput.parse(req.body);const images=await validatedImages(input.images);const {images:ignored,version,...data}=input;data.priceCents=data.priceMode==='ON_REQUEST'?null:data.priceCents;const result=await db.$transaction(async tx=>{let productId:string;if(existing){const changed=await tx.product.updateMany({where:{id:id(req),version},data:{...data,version:{increment:1}}});if(!changed.count)return fail(409,'A peça foi alterada. Reabra o formulário antes de salvar.','VERSION_CONFLICT');productId=id(req);await tx.productImage.deleteMany({where:{productId}})}else{productId=(await tx.product.create({data})).id}if(images.length)await tx.productImage.createMany({data:images.map(im=>({...im,productId}))});await tx.auditLog.create({data:{adminUserId:res.locals.session.adminUserId,action:existing?'UPDATE':'CREATE',entityType:'Product',entityId:productId}});return tx.product.findUnique({where:{id:productId},include:{images:imageInclude}})});res.status(existing?200:201).json({data:result})}
app.post('/api/v1/admin/products',(req,res)=>writeProduct(req,res,false));
app.patch('/api/v1/admin/products/:id',(req,res)=>writeProduct(req,res,true));
app.post('/api/v1/admin/uploads/signature',(_req,res)=>{const secret=process.env.CLOUDINARY_API_SECRET;if(!secret)return fail(503,'Serviço de imagens ainda não configurado.');const params={timestamp:Math.floor(Date.now()/1000),folder:'jubis',public_id:randomBytes(16).toString('hex'),overwrite:false};res.json({params,signature:cloudinary.utils.api_sign_request(params,secret),cloudName:process.env.CLOUDINARY_CLOUD_NAME,apiKey:process.env.CLOUDINARY_API_KEY})});
app.get('/api/v1/admin/settings',async(_req,res)=>res.json({data:await db.siteSettings.findUnique({where:{id:1}})}));
app.patch('/api/v1/admin/settings',async(req,res)=>{const data=settingsInput.parse(req.body);const row=await db.$transaction(async tx=>{const saved=await tx.siteSettings.upsert({where:{id:1},create:{id:1,...data},update:data});await tx.auditLog.create({data:{adminUserId:res.locals.session.adminUserId,action:'UPDATE',entityType:'SiteSettings',entityId:'1'}});return saved});res.json({data:row})});
app.get('/api/v1/admin/collections/:id',async(req,res)=>{const row=await db.collection.findUnique({where:{id:id(req)}});if(!row)return fail(404,'Coleção não encontrada.');res.json({data:row})});
app.patch('/api/v1/admin/collections/:id',async(req,res)=>{const data=z.object({description:z.string().max(2000),accentColor:z.string().regex(/^#[0-9a-fA-F]{6}$/)}).strict().parse(req.body);res.json({data:await db.collection.update({where:{id:id(req)},data})})});
// Image edits are atomic with the versioned product PATCH used by the editor.
app.use('/api',(_req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Recurso não encontrado.'}}));
app.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{if(err instanceof ZodError)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:err.issues[0]?.message||'Confira os campos.',fields:err.flatten()}});if(err instanceof HttpError)return res.status(err.status).json({error:{code:err.code,message:err.message}});if(err instanceof Prisma.PrismaClientKnownRequestError){if(err.code==='P2002')return res.status(409).json({error:{code:'DUPLICATE',message:'Código, endereço ou imagem já utilizado.'}});if(err.code==='P2025')return res.status(404).json({error:{code:'NOT_FOUND',message:'Registro não encontrado.'}})}if((err as {type?:string})?.type==='entity.too.large')return res.status(413).json({error:{code:'TOO_LARGE',message:'Solicitação muito grande.'}});console.error('Request failed',err instanceof Error?err.name:'UnknownError');res.status(500).json({error:{code:'INTERNAL_ERROR',message:'Não foi possível concluir. Tente novamente.'}})});
export {app,db};
