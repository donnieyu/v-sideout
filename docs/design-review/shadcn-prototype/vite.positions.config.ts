import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({root:path.resolve(import.meta.dirname,'position-preview'),base:'./',plugins:[react()],resolve:{alias:{'@':path.resolve(import.meta.dirname,'src')}},build:{outDir:path.resolve(import.meta.dirname,'../ideation-2026-09-23/weekend/position-slots'),emptyOutDir:true}})
