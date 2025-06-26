const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const express = require('express');
const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.GUILD_ID;
const ADMIN_ROLE_ID = '1381694141741924363';

app.get('/', (_, res) => res.send('✅ Roleplay Studios Bot is running.'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

const loadData = (file) =>
  fs.existsSync(`./data/${file}`)
    ? JSON.parse(fs.readFileSync(`./data/${file}`, 'utf8'))
    : { businesses: [], gangs: [], contracts: [] }[file.split('.')[0]] || [];

const saveData = (file, data) =>
  fs.writeFileSync(`./data/${file}`, JSON.stringify(data, null, 2));

const hasRole = (member, roleId) => member.roles.cache.has(roleId);

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [

    // ⚙️ Utility
    new SlashCommandBuilder().setName('bot-status').setDescription('Check if bot is online'),
    new SlashCommandBuilder().setName('ping').setDescription('Ping the bot'),
    new SlashCommandBuilder().setName('commands').setDescription('List all bot commands'),

    // 🏢 Business Commands
    new SlashCommandBuilder().setName('register-biz').setDescription('Register a business')
      .addStringOption(opt => opt.setName('name').setDescription('Business name').setRequired(true)),
    new SlashCommandBuilder().setName('approve-biz').setDescription('Approve a business by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),
    new SlashCommandBuilder().setName('deny-biz').setDescription('Deny a business')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('biz-directory').setDescription('List all businesses'),
    new SlashCommandBuilder().setName('biz-info').setDescription('View business info')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),
    new SlashCommandBuilder().setName('audit-business').setDescription('Audit a business')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),
    new SlashCommandBuilder().setName('business-terminate').setDescription('Terminate a business')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),
    new SlashCommandBuilder().setName('business-update').setDescription('Update business info')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true))
      .addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(false))
      .addStringOption(opt => opt.setName('status').setDescription('New status').setRequired(false)),
    new SlashCommandBuilder().setName('business-roster').setDescription('View business role members')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business ID').setRequired(true)),

    // 🥷 Gang Commands
    new SlashCommandBuilder().setName('gang-apply').setDescription('Register a gang')
      .addStringOption(opt => opt.setName('name').setDescription('Gang name').setRequired(true)),
    new SlashCommandBuilder().setName('gang-approve').setDescription('Approve a gang')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),
    new SlashCommandBuilder().setName('gang-deny').setDescription('Deny a gang')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)),
    new SlashCommandBuilder().setName('gang-list').setDescription('List all gangs'),
    new SlashCommandBuilder().setName('gang-info').setDescription('View gang info')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),
    new SlashCommandBuilder().setName('audit-gang').setDescription('Audit a gang')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),
    new SlashCommandBuilder().setName('gang-disband').setDescription('Disband a gang')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),
    new SlashCommandBuilder().setName('gang-update').setDescription('Update gang info')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true))
      .addStringOption(opt => opt.setName('name').setDescription('New name').setRequired(false))
      .addStringOption(opt => opt.setName('status').setDescription('New status').setRequired(false)),
    new SlashCommandBuilder().setName('gang-roster').setDescription('View gang role members')
      .addIntegerOption(opt => opt.setName('id').setDescription('Gang ID').setRequired(true)),

    // 📄 Contract Commands
    new SlashCommandBuilder().setName('contract-create').setDescription('Create a contract')
      .addStringOption(opt => opt.setName('business').setDescription('Business name').setRequired(true))
      .addStringOption(opt => opt.setName('gang').setDescription('Gang name').setRequired(true))
      .addStringOption(opt => opt.setName('terms').setDescription('Terms').setRequired(true)),
    new SlashCommandBuilder().setName('contract-view').setDescription('View a contract')
      .addIntegerOption(opt => opt.setName('id').setDescription('Contract ID').setRequired(true)),
    new SlashCommandBuilder().setName('contract-terminate').setDescription('Terminate a contract')
      .addIntegerOption(opt => opt.setName('id').setDescription('Contract ID').setRequired(true)),
    new SlashCommandBuilder().setName('contract-edit').setDescription('Edit a contract')
      .addIntegerOption(opt => opt.setName('id').setDescription('Contract ID').setRequired(true))
      .addStringOption(opt => opt.setName('business').setDescription('New business name').setRequired(false))
      .addStringOption(opt => opt.setName('gang').setDescription('New gang name').setRequired(false))
      .addStringOption(opt => opt.setName('terms').setDescription('New terms').setRequired(false)),
    new SlashCommandBuilder().setName('contract-list').setDescription('List all contracts'),

    // 🔎 Smart Utility
    new SlashCommandBuilder().setName('business-check').setDescription('Check business or gang status by ID')
      .addIntegerOption(opt => opt.setName('id').setDescription('Business or Gang ID').setRequired(true)),
  ];

  await client.application.commands.set(commands.map(cmd => cmd.toJSON()), guildId);
  console.log('✅ Slash commands registered');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;
  const member = interaction.member;

  try {
    const businesses = loadData('businesses.json').businesses ?? [];
    const gangs = loadData('gangs.json').gangs ?? [];
    const contracts = loadData('contracts.json').contracts ?? [];

    const reply = (msg) => interaction.reply({ content: msg, flags: 64 });

    // ✅ Utility Commands
    if (cmd === 'bot-status') return reply('✅ Bot is online.');
    if (cmd === 'ping') return reply('🏓 Pong!');
    if (cmd === 'commands') return reply('📋 View full command list in the official docs.');

    // 🏢 Business Commands
    if (cmd === 'register-biz') {
      const name = interaction.options.getString('name');
      const id = businesses.length ? businesses[businesses.length - 1].id + 1 : 1;
      businesses.push({ id, name, owner: interaction.user.id, status: 'pending' });
      saveData('businesses.json', { businesses });
      return reply(`✅ Registered business "${name}" with ID #${id}`);
    }

    if (cmd === 'approve-biz') {
      if (!hasRole(member, ADMIN_ROLE_ID)) return reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const biz = businesses.find(b => b.id === id);
      if (!biz) return reply(`❌ Business #${id} not found.`);
      biz.status = 'approved';
      saveData('businesses.json', { businesses });

      const role = await interaction.guild.roles.create({ name: biz.name, reason: 'Business approved' });
      const user = await interaction.guild.members.fetch(biz.owner).catch(() => null);
      if (user) await user.roles.add(role).catch(() => {});
      return reply(`✅ Approved business #${id} and created role.`);
    }

    if (cmd === 'deny-biz') {
      if (!hasRole(member, ADMIN_ROLE_ID)) return reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const reason = interaction.options.getString('reason');
      const biz = businesses.find(b => b.id === id);
      if (!biz) return reply(`❌ Business #${id} not found.`);
      biz.status = 'denied';
      biz.reason = reason;
      saveData('businesses.json', { businesses });
      return reply(`❌ Denied business #${id} for: ${reason}`);
    }

    if (cmd === 'biz-directory') {
      const list = businesses.map(b => `• [${b.id}] ${b.name} (${b.status})`).join('\n') || 'No businesses.';
      return reply(list);
    }

    if (cmd === 'biz-info') {
      const id = interaction.options.getInteger('id');
      const biz = businesses.find(b => b.id === id);
      if (!biz) return reply(`❌ Business #${id} not found.`);
      return reply(`ℹ️ Business #${biz.id}\nName: ${biz.name}\nStatus: ${biz.status}\nOwner: <@${biz.owner}>`);
    }

    if (cmd === 'business-update') {
      if (!hasRole(member, ADMIN_ROLE_ID)) return reply('❌ Permission denied.');
      const id = parseInt(interaction.options.getString('id'));
      const newName = interaction.options.getString('name');
      const newStatus = interaction.options.getString('status');
      const index = businesses.findIndex(b => b.id === id || b.name === interaction.options.getString('id'));
      if (index === -1) return reply(`❌ Business not found.`);
      if (newName) businesses[index].name = newName;
      if (newStatus) businesses[index].status = newStatus;
      saveData('businesses.json', { businesses });
      return reply(`✅ Business updated.`);
    }

    if (cmd === 'business-roster') {
      const idOrName = interaction.options.getString('id');
      const biz = businesses.find(b => b.id === parseInt(idOrName)) || businesses.find(b => b.name.toLowerCase() === idOrName.toLowerCase());
      if (!biz) return reply(`❌ Business not found.`);
      const role = interaction.guild.roles.cache.find(r => r.name === biz.name);
      if (!role) return reply(`❌ Role not found.`);
      const members = role.members.map(m => `<@${m.id}>`).join(', ') || 'None';
      return reply(`👥 Roster for ${role.name}: ${members}`);
    }

    // 🔫 Gang Commands
    if (cmd === 'gang-apply') {
      const name = interaction.options.getString('name');
      const id = gangs.length ? gangs[gangs.length - 1].id + 1 : 1;
      gangs.push({ id, name, leader: interaction.user.id, status: 'pending' });
      saveData('gangs.json', { gangs });
      return reply(`✅ Registered gang "${name}" with ID #${id}`);
    }

    if (cmd === 'gang-approve') {
      if (!hasRole(member, ADMIN_ROLE_ID)) return reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const gang = gangs.find(g => g.id === id);
      if (!gang) return reply(`❌ Gang #${id} not found.`);
      gang.status = 'approved';
      saveData('gangs.json', { gangs });

      const role = await interaction.guild.roles.create({ name: gang.name, reason: 'Gang approved' });
      const user = await interaction.guild.members.fetch(gang.leader).catch(() => null);
      if (user) await user.roles.add(role).catch(() => {});
      return reply(`✅ Approved gang #${id} and created role.`);
    }

    if (cmd === 'gang-deny') {
      if (!hasRole(member, ADMIN_ROLE_ID)) return reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const reason = interaction.options.getString('reason');
      const gang = gangs.find(g => g.id === id);
      if (!gang) return reply(`❌ Gang #${id} not found.`);
      gang.status = 'denied';
      gang.reason = reason;
      saveData('gangs.json', { gangs });
      return reply(`❌ Denied gang #${id} for: ${reason}`);
    }

    if (cmd === 'gang-list') {
      const list = gangs.map(g => `• [${g.id}] ${g.name} (${g.status})`).join('\n') || 'No gangs.';
      return reply(list);
    }

    if (cmd === 'gang-info') {
      const id = interaction.options.getInteger('id');
      const gang = gangs.find(g => g.id === id);
      if (!gang) return reply(`❌ Gang #${id} not found.`);
      return reply(`ℹ️ Gang #${gang.id}\nName: ${gang.name}\nStatus: ${gang.status}\nLeader: <@${gang.leader}>`);
    }

    if (cmd === 'gang-update') {
      if (!hasRole(member, ADMIN_ROLE_ID)) return reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const newName = interaction.options.getString('name');
      const newStatus = interaction.options.getString('status');
      const index = gangs.findIndex(g => g.id === id);
      if (index === -1) return reply(`❌ Gang ID #${id} not found.`);
      if (newName) gangs[index].name = newName;
      if (newStatus) gangs[index].status = newStatus;
      saveData('gangs.json', { gangs });
      return reply(`✅ Gang #${id} updated.`);
    }

    if (cmd === 'gang-roster') {
      const id = interaction.options.getInteger('id');
      const gang = gangs.find(g => g.id === id);
      if (!gang) return reply(`❌ Gang #${id} not found.`);
      const role = interaction.guild.roles.cache.find(r => r.name === gang.name);
      if (!role) return reply(`❌ Role not found.`);
      const members = role.members.map(m => `<@${m.id}>`).join(', ') || 'None';
      return reply(`👥 Roster for ${role.name}: ${members}`);
    }

    // 📜 Contract System
    if (cmd === 'contract-create') {
      const business = interaction.options.getString('business');
      const gang = interaction.options.getString('gang');
      const terms = interaction.options.getString('terms');
      const id = contracts.length ? contracts[contracts.length - 1].id + 1 : 1;
      contracts.push({ id, business, gang, terms, status: 'active' });
      saveData('contracts.json', { contracts });
      return reply(`📄 Contract #${id} created.`);
    }

    if (cmd === 'contract-edit') {
      if (!hasRole(member, ADMIN_ROLE_ID)) return reply('❌ Permission denied.');
      const id = interaction.options.getInteger('id');
      const contract = contracts.find(c => c.id === id);
      if (!contract) return reply(`❌ Contract not found.`);
      const b = interaction.options.getString('business');
      const g = interaction.options.getString('gang');
      const t = interaction.options.getString('terms');
      if (b) contract.business = b;
      if (g) contract.gang = g;
      if (t) contract.terms = t;
      saveData('contracts.json', { contracts });
      return reply(`✅ Contract #${id} updated.`);
    }

    if (cmd === 'contract-terminate') {
      const id = interaction.options.getInteger('id');
      const index = contracts.findIndex(c => c.id === id);
      if (index === -1) return reply(`❌ Contract not found.`);
      contracts.splice(index, 1);
      saveData('contracts.json', { contracts });
      return reply(`🗑️ Contract #${id} terminated.`);
    }

    if (cmd === 'contract-view') {
      const id = interaction.options.getInteger('id');
      const c = contracts.find(c => c.id === id);
      if (!c) return reply(`❌ Contract not found.`);
      return reply(`📃 Contract #${c.id}\nBusiness: ${c.business}\nGang: ${c.gang}\nTerms: ${c.terms}\nStatus: ${c.status}`);
    }

    if (cmd === 'contract-list') {
      const list = contracts.map(c => `#${c.id}: ${c.business} ↔ ${c.gang} (${c.status})`).join('\n') || 'No contracts.';
      return reply(list);
    }

    // 🔎 Smart Checker
    if (cmd === 'business-check') {
      const id = interaction.options.getInteger('id');
      const biz = businesses.find(b => b.id === id);
      const gang = gangs.find(g => g.id === id);
      if (biz) return reply(`📋 Business Check: ${biz.name} - ${biz.status}`);
      if (gang) return reply(`📋 Gang Check: ${gang.name} - ${gang.status}`);
      return reply('❌ ID not found in business or gang.');
    }

  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Something went wrong.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
    }
  }
});

client.login(token);
