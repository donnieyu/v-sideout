import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({base:'./',plugins:[react()],resolve:{alias:{'@':path.resolve(import.meta.dirname,'src')}},build:{outDir:'../ideation-2026-09-23/weekend/a-shadcn',emptyOutDir:true}})
