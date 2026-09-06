import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const boardPath = path.resolve('../../design/research/competitor-onboarding/selected-onboarding-flow/excerlock-proposed-onboarding-v3.excalidraw');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'excerlock-board',
      configureServer(server) {
        server.middlewares.use('/excerlock-proposed-onboarding-v3.excalidraw', (_request, response) => {
          response.setHeader('Content-Type', 'application/json');
          fs.createReadStream(boardPath).pipe(response);
        });
      },
    },
  ],
});
