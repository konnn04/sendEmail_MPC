import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

function emailApiPlugin() {
  return {
    name: 'email-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Cấu hình Google Client ID từ file .env
        if (req.url === '/api/config' && req.method === 'GET') {
          const googleClientId =  process.env.VITE_GOOGLE_CLIENT_ID || '';
          
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          return res.end(JSON.stringify({
            googleClientId: googleClientId
          }));
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), emailApiPlugin()],
  define: {
    '__ENV_GOOGLE_CLIENT_ID__': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || '')
  },
  server: {
    port: 3000,
    open: true
  }
});
