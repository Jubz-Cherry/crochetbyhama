import {defineConfig} from 'vite';
import ts from 'typescript';
let resolved;
// Pure-JavaScript transform also works on Windows hosts that restrict native child processes.
export default defineConfig({
 plugins:[{name:'jubis-typescript',enforce:'pre',configResolved(config){resolved=config},transform(code,id){if(!/\.[cm]?[jt]sx?(\?|$)/.test(id))return;code=code.replace(/process\.env\.NODE_ENV/g,JSON.stringify(resolved?.command==='build'?'production':'development')).replace(/import\.meta\.env\.([A-Z_]+)/g,(_,key)=>JSON.stringify(resolved?.env[key])??'undefined');if(resolved?.command==='build')code=code.replace(/import\.meta\.hot/g,'undefined');code=code.replace(/\bprocess\.env\b/g,'({})');if(id.includes('node_modules'))return {code,map:null};const result=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,sourceMap:true},fileName:id});return {code:result.outputText,map:result.sourceMapText}}}],
 esbuild:false,resolve:{preserveSymlinks:true},optimizeDeps:{noDiscovery:true,include:[]},
 server:{host:'127.0.0.1',proxy:{'/api':'http://127.0.0.1:3001'}},
 build:{sourcemap:false,minify:false}
});



