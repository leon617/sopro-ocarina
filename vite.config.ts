import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {sites} from './build/sites-vite-plugin';
export default defineConfig({resolve:{alias:{'@':path.resolve('.')}},plugins:[react(),sites({mockAuth:false}),{name:'sopro-catalog-dev',configureServer(server){server.middlewares.use('/api/catalog',async(req,res)=>{try{const {GET}=await server.ssrLoadModule('/app/api/catalog/route.ts');const headers=new Headers();const response:Response=await GET(new Request('http://localhost/api/catalog'+(req.url||''),{headers}));res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e instanceof Error?e.message:'Catálogo indisponível.'}));}});}}],build:{outDir:'dist/client',emptyOutDir:true},server:{host:'127.0.0.1'}});
