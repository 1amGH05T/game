const TelegramBot = require('node-telegram-bot-api');

// Replace with your actual bot token
const token = '8544385364:AAE5uBTRwFpfsR9fFTofHgJt0XBXrRIpqho';

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '/start') {
    bot.sendMessage(chatId, 'Welcome! Send me any message and I will reply.');
  } else {
    bot.sendMessage(chatId, `You said: ${text}`);
  }
});
