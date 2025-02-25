require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;
const UPI_ID = process.env.UPI_ID;

const userUsage = {}; // Track user image count

// 🔹 Start Command (Welcome Message)
bot.start((ctx) => {
    ctx.reply(
        `👋 Welcome to the Background Remover Bot! 🖼️\n\n🎉 You get 5 FREE images!\n💰 After that, pay ₹10 per image via UPI: ${UPI_ID}\n\n📸 Send an image to remove its background.`
    );
});

// 🔹 Handle Image Messages
bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    userUsage[userId] = (userUsage[userId] || 0) + 1;

    if (userUsage[userId] > 5) {
        return ctx.reply(`⚠️ Free limit reached! Pay ₹10 per image to ${UPI_ID} and then send your image.`);
    }

    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const fileUrl = await ctx.telegram.getFileLink(fileId);

    ctx.reply('⏳ Processing your image...');

    try {
        const response = await axios({
            method: 'POST',
            url: 'https://api.remove.bg/v1.0/removebg',
            data: { image_url: fileUrl.href, size: 'auto' },
            headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
            responseType: 'arraybuffer',
        });

        const filePath = path.join(__dirname, `removed-${userId}.png`);
        fs.writeFileSync(filePath, response.data);

        ctx.replyWithPhoto({ source: filePath }, { caption: '✅ Background Removed!' });

        fs.unlinkSync(filePath); // Delete file after sending
    } catch (error) {
        ctx.reply('❌ Error removing background. Try again later.');
    }
});

// 🔹 Start Bot
bot.launch();
console.log('✅ Telegram Bot is running...');