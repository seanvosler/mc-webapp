// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: 8080, host: '0.0.0.0' },
  vite: {
    ssr: { noExternal: ['@libsql/client', 'libsql'] },
  },
});
