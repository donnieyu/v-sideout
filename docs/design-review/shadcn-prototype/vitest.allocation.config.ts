import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
 plugins:[react()],
 resolve:{alias:{'@':path.resolve(import.meta.dirname,'src')}},
 test:{environment:'jsdom',include:['src/allocation-ab.test.tsx','src/session-editor.test.tsx','src/navigation.test.ts','src/roster.test.tsx','src/roster-transitions.test.tsx','src/roster-state.test.ts','src/roster-fixtures.test.ts','src/roster-ssot.integration.test.tsx']},
})
