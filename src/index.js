import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode';

const { Client, LocalAuth } = pkg;

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // sirve index.html

// --- Levanta el servidor primero para evitar 502 ---
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// --- Inicializa WhatsApp después de escuchar el puerto ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// --- QR en tiempo real ---
client.on('qr', async qr => {
    const qrDataUrl = await qrcode.toDataURL(qr);
    io.emit('qr', qrDataUrl);
});

// --- WhatsApp listo ---
client.on('ready', () => {
    console.log('WhatsApp listo!');
    io.emit('ready');
});