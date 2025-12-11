import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import qrcode from 'qrcode';

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // sirve index.html

// Configuración del cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'unique_client_id' }),
    puppeteer: { headless: true } // usa Chromium portable
});

client.on('qr', async qr => {
    const qrDataUrl = await qrcode.toDataURL(qr);
    io.emit('qr', qrDataUrl); // envia QR en tiempo real
});

client.on('ready', () => {
    console.log('WhatsApp listo!');
    io.emit('ready');
});

client.initialize();

// API para enviar mensaje
app.post('/send', async (req, res) => {
    const { number, text } = req.body;
    if (!number || !text) return res.status(400).json({ error: 'Faltan parámetros' });

    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, text);
        res.json({ success: true, number, text });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'No se pudo enviar el mensaje' });
    }
});

// Socket.io para conexiones en tiempo real
io.on('connection', socket => {
    console.log('Cliente conectado al socket');
});

server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));