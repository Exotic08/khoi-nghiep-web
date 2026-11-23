import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Do not expose server or Node package metadata files
app.use((req, res, next) => {
  const blocked = /^\/(server\.js|package(-lock)?\.json|node_modules(\/|$)|\.)/i;
  if (blocked.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

app.use(express.static(__dirname, { dotfiles: 'ignore' }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Nho Rung Dinh Lap static server listening on http://${HOST}:${PORT}`);
});
