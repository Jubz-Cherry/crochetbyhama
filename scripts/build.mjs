import ts from 'typescript';
import {build} from 'vite';
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,'.');
const program=ts.createProgram(parsed.fileNames,{...parsed.options,noEmit:true});
const errors=ts.getPreEmitDiagnostics(program);
if(errors.length){console.error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:f=>f,getCurrentDirectory:ts.sys.getCurrentDirectory,getNewLine:()=> '\n'}));process.exit(1)}
await build({configFile:'vite.config.mjs',configLoader:'native'});
