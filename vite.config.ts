import basicSsl from '@vitejs/plugin-basic-ssl';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function matjarkDevErrorTerminalPlugin(): Plugin {
  return {
    name: 'matjark-dev-error-terminal',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__matjark_dev_error', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const origin = req.headers.origin;
        const requestHost = req.headers.host;
        if (origin && requestHost) {
          try {
            if (new URL(origin).host !== requestHost) {
              res.statusCode = 403;
              res.end('Forbidden');
              return;
            }
          } catch {
            res.statusCode = 400;
            res.end('Invalid Origin');
            return;
          }
        }

        let body = '';
        let bodyBytes = 0;
        let rejected = false;
        req.setEncoding('utf8');

        req.on('data', (chunk: string) => {
          if (rejected) return;
          bodyBytes += Buffer.byteLength(chunk, 'utf8');
          if (bodyBytes > 24 * 1024) {
            rejected = true;
            res.statusCode = 413;
            res.end('Payload Too Large');
            return;
          }
          body += chunk;
        });

        req.on('end', () => {
          if (rejected) return;
          try {
            const payload = JSON.parse(body) as {
              type?: unknown;
              message?: unknown;
              stack?: unknown;
              source?: unknown;
              line?: unknown;
              column?: unknown;
              timestamp?: unknown;
            };
            const type = typeof payload.type === 'string' ? payload.type.slice(0, 80) : 'Runtime Error';
            const message = typeof payload.message === 'string' ? payload.message.slice(0, 8000) : 'No error message';
            const stack = typeof payload.stack === 'string' ? payload.stack.slice(0, 12000) : '';
            const source = typeof payload.source === 'string' ? payload.source.slice(0, 1000) : '';
            const position = [
              typeof payload.line === 'number' ? payload.line : null,
              typeof payload.column === 'number' ? payload.column : null,
            ].filter((value) => value !== null).join(':');
            const timestamp = typeof payload.timestamp === 'string'
              ? payload.timestamp
              : new Date().toLocaleString();

            console.error('\n\x1b[31m[MATJARK BROWSER ERROR]\x1b[0m');
            console.error(`Type: ${type}`);
            console.error(`Time: ${timestamp}`);
            console.error(`Message: ${message}`);
            if (source) console.error(`Source: ${source}${position ? `:${position}` : ''}`);
            if (stack) console.error(`Stack:\n${stack}`);
            console.error('\x1b[31m--------------------------------------------------\x1b[0m\n');

            res.statusCode = 204;
            res.end();
          } catch {
            res.statusCode = 400;
            res.end('Invalid Error Payload');
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [basicSsl(), react(), tailwindcss(), matjarkDevErrorTerminalPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
