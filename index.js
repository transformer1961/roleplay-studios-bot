// index.js

const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Express keep-alive
app.get('/', (req, res) => res.send('✅ Roleplay Studios Bot is running.'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const ADMIN_ROLE_ID = '1381694141741924363';

// JSON data helpers
const loadData = (fileName) => {
  const path = `./data/${fileName}`;
  if (!fs.existsSync(path)) {
    return { businesses: [], gangs: [], contracts: [] }[fileName.replace('.json', '')] || [];
  }
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Error loading ${fileName}:`, err);
    return [];
  }
};

const saveData = (fileName, data) => {
  try {
    fs.writeFileSync(`./data/${fileName}`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error saving ${fileName}:`, err);
  }
};

const hasRole = (member, roleId) => member.roles.cache.has(roleId);

// Register commands
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName('bot-status').setDescription('Check if bot is online'),
    new SlashCommandBuilder().setName('ping').setDescription('Ping the bot'),
    new SlashCommandBuilder().setName('commands').setDescription('List all bot commands'),

    // Business
    new SlashCommandBuilder().setName('register-biz').setDescription('Register a business')
      .addStringOption(opt => opt.setName('name').setDescription('Business name').setRequired(true)),
    new SlashCommandBuilder().setName('approve-biz').setDescription('Approve a business by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),
    new SlashCommandBuilder().setName('deny-biz').setDescription('Deny a business by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for denial').setRequired(true)),
    new SlashCommandBuilder().setName('biz-directory').setDescription('List all businesses'),
    new SlashCommandBuilder().setName('biz-info').setDescription('View business info')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),
    new SlashCommandBuilder().setName('audit-business').setDescription('Audit a business by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),
    new SlashCommandBuilder().setName('business-terminate').setDescription('Terminate a business by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),

    // Gang
    new SlashCommandBuilder().setName('gang-apply').setDescription('Register a gang')
      .addStringOption(opt => opt.setName('name').setDescription('Gang name').setRequired(true)),
    new SlashCommandBuilder().setName('gang-approve').setDescription('Approve a gang by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),
    new SlashCommandBuilder().setName('gang-deny').setDescription('Deny a gang by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for denial').setRequired(true)),
    new SlashCommandBuilder().setName('gang-list').setDescription('List all gangs'),
    new SlashCommandBuilder().setName('gang-info').setDescription('View gang info')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),
    new SlashCommandBuilder().setName('audit-gang').setDescription('Audit a gang by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),
    new SlashCommandBuilder().setName('gang-disband').setDescription('Disband a gang by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),

    // Contracts
    new SlashCommandBuilder().setName('contract-create').setDescription('Create a contract')
      .addStringOption(opt => opt.setName('business').setDescription('Business name').setRequired(true))
      .addStringOption(opt => opt.setName('gang').setDescription('Gang name').setRequired(true))
      .addStringOption(opt => opt.setName('terms').setDescription('Contract terms').setRequired(true)),
    new SlashCommandBuilder().setName('contract-view').setDescription('View a contract by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Contract ID').setRequired(true)),
    new SlashCommandBuilder().setName('contract-terminate').setDescription('Terminate a contract by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Contract ID').setRequired(true)),
  ].map(c => c.toJSON());

  try {
    await client.application.commands.set(commands, guildId);
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Command registration error:', err);
  }
});

// Interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;

  try {
    // Utility
    if (cmd === 'bot-status') return await interaction.reply('✅ Bot is online.');
    if (cmd === 'ping') return await interaction.reply('🏓 Pong!');
    if (cmd === 'commands') {
      return await interaction.reply(
        '📋 Commands: /bot-status /ping /register-biz /approve-biz /deny-biz /biz-directory /biz-info /audit-business /business-terminate ' +
        '/gang-apply /gang-approve /gang-deny /gang-list /gang-info /audit-gang /gang-disband ' +
        '/contract-create /contract-view /contract-terminate'
      );
    }

    // Businesses
    const businesses = loadData('businesses.json').businesses ?? [];

    if (cmd === 'register-biz') {
      const name = interaction.options.getString('name');
      const nextId = businesses.length > 0 ? businesses[businesses.length - 1].id + 1 : 1;
      businesses.push({ id: nextId, name, owner: interaction.user.id, status: 'pending' });
      saveData('businesses.json', { businesses });
      return await interaction.reply(`✅ Business "${name}" registered with ID #${nextId}.`);
    }

    if (['approve-biz', 'deny-biz', 'audit-business', 'business-terminate'].includes(cmd)) {
      if (!hasRole(interaction.member, ADMIN_ROLE_ID)) return await interaction.reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const biz = businesses.find(b => b.id === id);
      if (!biz) return await interaction.reply(`❌ Business ID #${id} not found.`);

      if (cmd === 'approve-biz') {
        biz.status = 'approved';
        saveData('businesses.json', { businesses });
        return await interaction.reply(`✅ Approved business #${id} (${biz.name})`);
      }

      if (cmd === 'deny-biz') {
        const reason = interaction.options.getString('reason');
        biz.status = 'denied';
        biz.reason = reason;
        saveData('businesses.json', { businesses });
        return await interaction.reply(`❌ Denied business #${id} (${biz.name}) for: ${reason}`);
      }

      if (cmd === 'audit-business') {
        return await interaction.reply(`📋 Business Audit #${biz.id}\nName: ${biz.name}\nStatus: ${biz.status}\nOwner: <@${biz.owner}>`);
      }

      if (cmd === 'business-terminate') {
        const index = businesses.findIndex(b => b.id === id);
        businesses.splice(index, 1);
        saveData('businesses.json', { businesses });
        return await interaction.reply(`🚫 Business #${id} has been terminated.`);
      }
    }

    if (cmd === 'biz-directory') {
      if (businesses.length === 0) return await interaction.reply('🏢 No businesses found.');
      const list = businesses.map(b => `• [${b.id}] ${b.name} [${b.status}]`).join('\n');
      return await interaction.reply(`🏢 Businesses:\n${list}`);
    }

    if (cmd === 'biz-info') {
      const id = interaction.options.getInteger('id');
      const biz = businesses.find(b => b.id === id);
      if (!biz) return await interaction.reply(`❌ Business #${id} not found.`);
      return await interaction.reply(`ℹ️ Business #${biz.id}\nName: ${biz.name}\nStatus: ${biz.status}\nOwner: <@${biz.owner}>`);
    }

    // Gangs
    const gangs = loadData('gangs.json').gangs ?? [];

    if (cmd === 'gang-apply') {
      const name = interaction.options.getString('name');
      const nextId = gangs.length > 0 ? gangs[gangs.length - 1].id + 1 : 1;
      gangs.push({ id: nextId, name, leader: interaction.user.id, status: 'pending' });
      saveData('gangs.json', { gangs });
      return await interaction.reply(`✅ Gang "${name}" registered with ID #${nextId}.`);
    }

    if (['gang-approve', 'gang-deny', 'audit-gang', 'gang-disband'].includes(cmd)) {
      if (!hasRole(interaction.member, ADMIN_ROLE_ID)) return await interaction.reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const gang = gangs.find(g => g.id === id);
      if (!gang) return await interaction.reply(`❌ Gang ID #${id} not found.`);

      if (cmd === 'gang-approve') {
        gang.status = 'approved';
        saveData('gangs.json', { gangs });
        return await interaction.reply(`✅ Approved gang #${id} (${gang.name})`);
      }

      if (cmd === 'gang-deny') {
        const reason = interaction.options.getString('reason');
        gang.status = 'denied';
        gang.reason = reason;
        saveData('gangs.json', { gangs });
        return await interaction.reply(`❌ Denied gang #${id} (${gang.name}) for: ${reason}`);
      }

      if (cmd === 'audit-gang') {
        return await interaction.reply(`📋 Gang Audit #${gang.id}\nName: ${gang.name}\nStatus: ${gang.status}\nLeader: <@${gang.leader}>`);
      }

      if (cmd === 'gang-disband') {
        const index = gangs.findIndex(g => g.id === id);
        gangs.splice(index, 1);
        saveData('gangs.json', { gangs });
        return await interaction.reply(`🚫 Gang #${id} has been disbanded.`);
      }
    }

    if (cmd === 'gang-list') {
      if (gangs.length === 0) return await interaction.reply('🕶️ No gangs found.');
      const list = gangs.map(g => `• [${g.id}] ${g.name} [${g.status}]`).join('\n');
      return await interaction.reply(`🕶️ Gangs:\n${list}`);
    }

    if (cmd === 'gang-info') {
      const id = interaction.options.getInteger('id');
      const gang = gangs.find(g => g.id === id);
      if (!gang) return await interaction.reply(`❌ Gang #${id} not found.`);
      return await interaction.reply(`ℹ️ Gang #${gang.id}\nName: ${gang.name}\nStatus: ${gang.status}\nLeader: <@${gang.leader}>`);
    }

    // Contracts
    const contracts = loadData('contracts.json').contracts ?? [];

    if (cmd === 'contract-create') {
      const business = interaction.options.getString('business');
      const gang = interaction.options.getString('gang');
      const terms = interaction.options.getString('terms');
      const nextId = contracts.length > 0 ? contracts[contracts.length - 1].id + 1 : 1;
      contracts.push({ id: nextId, business, gang, terms, status: 'active' });
      saveData('contracts.json', { contracts });
      return await interaction.reply(`📄 Contract #${nextId} created between ${business} and ${gang}.`);
    }

    if (cmd === 'contract-view') {
      const id = interaction.options.getInteger('id');
      const contract = contracts.find(c => c.id === id);
      if (!contract) return await interaction.reply(`❌ Contract #${id} not found.`);
      return await interaction.reply(`📄 Contract #${contract.id}\nBusiness: ${contract.business}\nGang: ${contract.gang}\nTerms: ${contract.terms}\nStatus: ${contract.status}`);
    }

    if (cmd === 'contract-terminate') {
      if (!hasRole(interaction.member, ADMIN_ROLE_ID)) return await interaction.reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const contract = contracts.find(c => c.id === id);
      if (!contract) return await interaction.reply(`❌ Contract #${id} not found.`);
      contract.status = 'terminated';
      saveData('contracts.json', { contracts });
      return await interaction.reply(`🛑 Contract #${id} has been terminated.`);
    }

  } catch (err) {
    console.error('❌ Error handling command:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Something went wrong.', flags: 64 });
    } else {
      await interaction.reply({ content: 'Something went wrong.', flags: 64 });
    }
  }
});

client.login(token);
