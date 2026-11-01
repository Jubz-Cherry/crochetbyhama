import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import argon2 from 'argon2';
import {collections,defaultSettings} from '../src/data';
const db=new PrismaClient();
try{const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD;if(!email||!password||password.length<14)throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD com ao menos 14 caracteres no ambiente.');
 for(const [i,c] of collections.entries())await db.collection.upsert({where:{id:c.id},create:{id:c.id,name:c.name,slug:c.id,description:c.description,accentColor:c.color,sortOrder:i},update:{}});
 await db.siteSettings.upsert({where:{id:1},create:{id:1,...defaultSettings},update:{}});
 const exists=await db.adminUser.findUnique({where:{email}});if(!exists)await db.adminUser.create({data:{email,passwordHash:await argon2.hash(password,{type:argon2.argon2id})}});
 console.log('Coleções, configurações e conta administrativa preparadas. Nenhum produto demonstrativo foi inserido.');
}finally{await db.$disconnect()}
