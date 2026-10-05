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

// Kiểm tra trạng thái API Key
app.get('/api/config', (req, res) => {
  const key = process.env.RESEND_API_KEY || '';
  res.json({
    hasKey: !!key,
    maskedKey: key ? (key.length > 10 ? key.slice(0, 7) + '...' + key.slice(-4) : '***') : ''
  });
});

// Gửi email qua Resend API
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, from, apiKey } = req.body;
    const finalKey = (apiKey && apiKey.trim()) ? apiKey.trim() : process.env.RESEND_API_KEY;

    if (!finalKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chưa cấu hình Resend API Key trong .env hoặc giao diện' 
      });
    }

    const payload = {
      from: from || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject: subject || 'Thông báo',
      html: html || ''
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await resendRes.json();
    if (!resendRes.ok) {
      return res.status(resendRes.status).json({
        success: false,
        error: result.message || result.name || 'Lỗi gửi qua Resend'
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cho phép SPA React Router hoặc fallback file dist
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      res.send('Server Resend API đang hoạt động. Chạy npm run dev để phát triển ứng dụng React.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
