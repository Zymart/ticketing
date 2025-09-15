// index.js - Main bot file
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');

// Load config from environment variables or config file
const config = {
    token: process.env.DISCORD_TOKEN || require('./config.json').token,
    clientId: process.env.CLIENT_ID || require('./config.json').clientId,
    guildId: process.env.GUILD_ID || require('./config.json').guildId,
    ownerId: process.env.OWNER_ID || require('./config.json').ownerId || "730629579533844512",
    adminIds: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],
    ticketSettings: {
        categoryId: process.env.CATEGORY_ID || "",
        supportRoleId: process.env.SUPPORT_ROLE_ID || "",
        logChannelId: process.env.LOG_CHANNEL_ID || "",
        ordersChannelId: process.env.ORDERS_CHANNEL_ID || "",
        receivedChannelId: process.env.RECEIVED_CHANNEL_ID || "",
        ongoingChannelId: process.env.ONGOING_CHANNEL_ID || ""
    },
    panelSettings: {
        title: "🛒 Professional Order System",
        description: "**Ready to place your order?** Click the button below to get started!\n\n*Fill out our quick order form and get instant pricing!*",
        buttonText: "Place Your Order",
        services: "• Game Currency & Rare Items\n• Account Services & Boosts\n• Power-leveling & Achievements\n• Custom Gaming Services\n• VIP Packages & Bundles\n• Exclusive Limited Items",
        features: "✓ Instant Pricing\n✓ 24/7 Support\n✓ Secure Transactions\n✓ Fast Delivery\n✓ Money Back Guarantee\n✓ Trusted by 1000+ Customers",
        payments: "• PayPal • Crypto\n• Gift Cards • Bank Transfer\n• Cashapp • Venmo",
        footer: "🛡️ Secure Orders • 💯 Satisfaction Guaranteed • ⭐ Premium Service"
    },
    colors: {
        primary: "#0099ff",
        success: "#00ff00", 
        warning: "#ffaa00",
        error: "#ff0000"
    }
};

// Create config.json if it doesn't exist (for Railway compatibility)
if (!fs.existsSync('./config.json')) {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

// Load existing config and merge with environment variables
try {
    const existingConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    // Merge existing config with environment variables (env vars take priority)
    Object.assign(config, existingConfig);
    config.token = process.env.DISCORD_TOKEN || config.token;
    config.clientId = process.env.CLIENT_ID || config.clientId;
    config.guildId = process.env.GUILD_ID || config.guildId;
    config.ownerId = process.env.OWNER_ID || config.ownerId;
    config.adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : (config.adminIds || []);
    if (process.env.CATEGORY_ID) config.ticketSettings.categoryId = process.env.CATEGORY_ID;
    if (process.env.SUPPORT_ROLE_ID) config.ticketSettings.supportRoleId = process.env.SUPPORT_ROLE_ID;
    if (process.env.LOG_CHANNEL_ID) config.ticketSettings.logChannelId = process.env.LOG_CHANNEL_ID;
    if (process.env.ORDERS_CHANNEL_ID) config.ticketSettings.ordersChannelId = process.env.ORDERS_CHANNEL_ID;
    if (process.env.RECEIVED_CHANNEL_ID) config.ticketSettings.receivedChannelId = process.env.RECEIVED_CHANNEL_ID;
    if (process.env.ONGOING_CHANNEL_ID) config.ticketSettings.ongoingChannelId = process.env.ONGOING_CHANNEL_ID;
} catch (error) {
    console.log('Creating new config file...');
}

// Export config for other files to use
global.config = config;

const PREFIX = '!';

// Initialize the bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Collections for commands
client.commands = new Collection();
client.prefixCommands = new Collection();

// Load slash commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) {
        client.commands.set(command.data.name, command);
    }
    if (command.name) {
        client.prefixCommands.set(command.name, command);
    }
}

// Load events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Handle prefix commands
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Regular command handling
    const command = client.prefixCommands.get(commandName);
    if (!command) return;

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(`Error executing prefix command ${commandName}:`, error);
        message.reply('❌ There was an error executing this command!');
    }
});

// Load ticket system
const ticketSystem = require('./systems/ticketSystem');
ticketSystem.init(client);

// Load shop system
const shopSystem = require('./systems/shopSystem');
shopSystem.init(client);

// Handle message events for shop system (for image uploads)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    await shopSystem.handleMessage(message);
});

// Load database system
const database = require('./systems/database');
database.initDatabase();

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(config.token);
