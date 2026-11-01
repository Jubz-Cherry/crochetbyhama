import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import {run} from 'node:test';
import {spec} from 'node:test/reporters';
// Compile test sources in-process; no test-worker subprocess is needed.
fs.mkdirSync('.tests/server',{recursive:true});fs.writeFileSync('.tests/package.json','{"type":"commonjs"}');
for(const file of fs.readdirSync('server').filter(f=>f.endsWith('.ts'))){const source=fs.readFileSync(path.join('server',file),'utf8');fs.writeFileSync(path.join('.tests/server',file.replace(/\.ts$/,'.js')),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)}
const stream=run({files:['.tests/server/validation.test.js','.tests/server/app.test.js'],isolation:'none'});
stream.on('test:fail',()=>{process.exitCode=1});stream.compose(spec).pipe(process.stdout);
