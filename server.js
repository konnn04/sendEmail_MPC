import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Cung cấp cấu hình Google Client ID cho client
app.get('/api/config', (req, res) => {
  const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID || '';
  res.json({
    googleClientId
  });
});

// Fallback phục vụ ứng dụng React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      res.send('Máy chủ đang hoạt động. Chạy npm run dev để phát triển ứng dụng React.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Máy chủ đang chạy tại http://localhost:${PORT}`);
});
