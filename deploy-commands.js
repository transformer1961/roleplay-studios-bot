const { REST, Routes } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [];
const index = require('./index.js'); // Optional: dynamically import from index.js if you're exporting commands

// Register static commands (you can import from index.js or define manually)
commands.push(
  {
    name: 'ping',
    description: 'Ping the bot'
  },
  {
    name: 'bot-status',
    description: 'Check if bot is online'
  }
  // Add all others from index.js here if not dynamically imported
);

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🧹 Deleting old commands...');
    const old = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
    for (const cmd of old) {
      await rest.delete(Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, cmd.id));
      console.log(`❌ Deleted ${cmd.name}`);
    }

    console.log('✅ Registering new slash commands...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    console.log('🎉 Commands registered!');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
})();
