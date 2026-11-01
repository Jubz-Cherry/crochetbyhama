import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {app,db} from './app';
if(process.env.NODE_ENV==='production'&&!process.env.APP_ORIGIN?.startsWith('https://'))throw new Error('APP_ORIGIN deve usar HTTPS em produção.');
app.use(express.static(path.resolve('dist')));
app.get('/{*path}',(_req,res)=>res.sendFile('index.html',{root:path.resolve('dist')}));
const server=app.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log(`Jubis disponível na porta ${process.env.PORT||3001}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>{void db.$disconnect().then(()=>process.exit(0))})});
