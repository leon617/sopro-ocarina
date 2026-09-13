import {defineConfig} from 'vite';
import path from 'node:path';
export default defineConfig({ssr:{noExternal:true},resolve:{alias:{'@':path.resolve('.')}},build:{ssr:'worker.ts',outDir:'dist/server',emptyOutDir:true,minify:true,rollupOptions:{output:{entryFileNames:'index.js',format:'es'}}}});
