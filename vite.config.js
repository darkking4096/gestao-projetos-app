import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // permite acesso pelo celular na mesma rede Wi-Fi
    port: 3000,
  },
  preview: {
    host: true,
    port: 3000,
  },
});
