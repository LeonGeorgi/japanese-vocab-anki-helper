import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function readBooleanFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue
  }

  return ['1', 'true', 'on', 'enabled'].includes(value.toLowerCase())
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ankiBackfillEnabled = readBooleanFlag(env.VITE_FEATURE_ANKI_BACKFILL, mode !== 'production')

  return {
    base: '/',
    plugins: [react()],
    define: {
      __ANKI_BACKFILL_ENABLED__: JSON.stringify(ankiBackfillEnabled),
    },
    build: {
      assetsDir: 'assets',
      sourcemap: false,
    },
  }
})
