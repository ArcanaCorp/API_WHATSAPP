import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

import express from 'express';
import qrcode from 'qrcode';

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public')); // servir index.html

// Cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth() // guarda sesión localmente
});

let qrCodeData = null;

// Generar QR y actualizar variable
client.on('qr', async qr => {
    qrCodeData = await qrcode.toDataURL(qr); // QR como imagen en base64
});

// Mensaje de sesión listo
client.on('ready', () => {
    console.log('WhatsApp listo!');
});

// Inicializar cliente
client.initialize();

// Endpoint para obtener QR
app.get('/qr', (req, res) => {
    if (!qrCodeData) return res.send('QR no disponible todavía. Recarga en unos segundos.');
    res.send(`<img src="${qrCodeData}" />`);
});

// Endpoint para enviar mensaje
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

app.listen(port, () => console.log(`Servidor corriendo en http://localhost:${port}`));