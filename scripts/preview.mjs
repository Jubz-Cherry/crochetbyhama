import express from 'express';
import path from 'node:path';
const app=express();app.use(express.static(path.resolve('dist')));app.get('/{*path}',(_req,res)=>res.sendFile('index.html',{root:path.resolve('dist')}));app.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
