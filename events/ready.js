// events/ready.js - Bot ready event
const { REST, Routes } = require('discord.js');
const fs = require('fs');

// Use global config
const config = global.config;

module.exports = {
    name: 'clientReady', // Fixed: Changed from 'ready' to 'clientReady'
    once: true,
    async execute(client) {
        console.log(`✅ ${client.user.tag} is ready for takeoff!`);
        
        // Set bot activity
        client.user.setActivity('🛒 Order Management System', { type: 3 }); // Type 3 = WATCHING
        
        // Register slash commands
        await registerCommands(client);
        
        console.log(`🚀 Successfully logged in as ${client.user.tag}`);
        console.log(`🔧 Serving ${client.guilds.cache.size} servers`);
        console.log(`👥 Monitoring ${client.users.cache.size} users`);
        console.log(`📊 Loaded ${client.commands.size} slash commands`);
        console.log(`⚡ Loaded ${client.prefixCommands.size} prefix commands`);
        console.log(`💼 Advanced Order & Shop Bot ready!`);
    },
};

async function registerCommands(client) {
    const commands = [];
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        if (command.data) {
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        console.log('🔄 Started refreshing application (/) commands...');
        
        // Register commands to guild (faster for development)
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );
        
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
}
