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
app.use(express.static('public'));

server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// --- Inicializa WhatsApp pero no disparamos QR automáticamente ---
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

// --- Reconexión automática ---
client.on('disconnected', reason => {
    console.log('Cliente desconectado:', reason);
    client.initialize();
});

client.initialize();

// --- API para enviar mensajes ---
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

// --- Socket.io ---
io.on('connection', socket => {
    console.log('Cliente conectado al socket');

    // Permitir generar QR bajo demanda
    socket.on('request-qr', () => {
        console.log('QR solicitado por cliente');
        // Forzar la generación de QR si el cliente no tiene sesión
        client.initialize();
    });
});