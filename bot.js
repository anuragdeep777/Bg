const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const express = require('express');

const TELEGRAM_BOT_TOKEN = "7898492441:AAEVYXYBCfTVVsWzPUiAlctgqPS6bVYEdmY"; // New Token
const REMOVE_BG_API_KEY = "h6GgArBPTEtH4rWKNXPG1mxA"; // Your Remove.bg API Key
const PORT = 5000;
const UPI_ID = "8873132662@ybl";
const FREE_LIMIT = 5;
const PRICE_PER_IMAGE = 10;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();

app.use(express.static('public'));

// Store user image count
const userImageCount = {};

// ✅ Welcome message when user starts the bot
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `👋 *Welcome to BG Remover Bot!* 🎉\n\n📸 Send an image, and I'll remove its background for you!\n\nn📩 Send an image now!`, { parse_mode: "Markdown" });
});

// ✅ Handle incoming photos
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    
    // Initialize user count
    if (!userImageCount[chatId]) {
        userImageCount[chatId] = 0;
    }

    // Check if user has exceeded the free limit
    if (userImageCount[chatId] >= FREE_LIMIT) {
        bot.sendMessage(chatId, `❌ *Free limit reached!*\n\n💰 To continue, pay ₹${PRICE_PER_IMAGE} per image.\n📌 *UPI ID:* \`${UPI_ID}\`\n\n📤 After payment, send a screenshot to @YourTelegramID to continue.`, { parse_mode: "Markdown" });
        return;
    }

    const fileId = msg.photo[msg.photo.length - 1].file_id;

    try {
        // Get image URL from Telegram
        const fileUrl = await bot.getFileLink(fileId);

        // Send "Processing" message
        bot.sendMessage(chatId, "⏳ Removing background, please wait...");

        // Remove background using Remove.bg API
        const response = await axios({
            method: 'POST',
            url: 'https://api.remove.bg/v1.0/removebg',
            data: { image_url: fileUrl },
            headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
            responseType: 'arraybuffer',
        });

        if (response.status !== 200) {
            throw new Error("Remove.bg API failed");
        }

        const outputPath = `removed_bg_${chatId}.png`;
        fs.writeFileSync(outputPath, response.data);

        // Send processed image back
        await bot.sendPhoto(chatId, outputPath);
        fs.unlinkSync(outputPath); // Delete file after sending

        // Increase user image count
        userImageCount[chatId]++;
        bot.sendMessage(chatId, `✅ Image processed successfully!\n📊 Remaining Free Images: *${FREE_LIMIT - userImageCount[chatId]}*`, { parse_mode: "Markdown" });

    } catch (error) {
        console.error("🚨 Error:", error.response ? error.response.data : error);
        bot.sendMessage(chatId, "❌ Error removing background. Try again later.");
    }
});

// Start Express server
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
