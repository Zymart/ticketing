// commands/admin.js - Admin-only commands
const { EmbedBuilder } = require('discord.js');

// Use global config
const config = global.config;

// Helper function to check if user is owner or admin
function isOwnerOrAdmin(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

module.exports = {
    name: 'admin',
    description: 'Admin-only commands',
    
    async execute(message, args, client) {
        // Check if user is owner or admin
        if (!isOwnerOrAdmin(message.author.id)) {
            return message.reply('❌ Only the bot owner or admins can use this command!');
        }

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('👑 Admin Commands')
                .setDescription('Available admin commands:')
                .addFields([
                    { name: '!admin info', value: 'Show bot information', inline: false },
                    { name: '!admin say <message>', value: 'Make the bot say something', inline: false },
                    { name: '!admin embed <title> | <description>', value: 'Create an embed', inline: false },
                    { name: '!admin clean <amount>', value: 'Delete messages (1-100)', inline: false }
                ])
                .setColor(config.colors.primary)
                .setFooter({ text: 'Admin commands can only be used by bot admins' });
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'info':
                await this.showInfo(message, client);
                break;
            case 'say':
                await this.sayMessage(message, args.slice(1).join(' '));
                break;
            case 'embed':
                await this.createEmbed(message, args.slice(1).join(' '));
                break;
            case 'clean':
                await this.cleanMessages(message, args[1]);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!admin` to see available commands.');
        }
    },

    async showInfo(message, client) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Information')
            .addFields([
                { name: '📊 Statistics', value: `**Servers:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Uptime:** <t:${Math.floor((Date.now() - client.uptime) / 1000)}:R>`, inline: false },
                { name: '👑 Bot Owner', value: `<@${config.ownerId}>`, inline: true },
                { name: '👥 Admins', value: config.adminIds.length > 0 ? `${config.adminIds.length} admin(s)` : 'None', inline: true },
                { name: '🎫 Order System', value: (config.ticketSettings.categoryId && config.ticketSettings.supportRoleId) ? '✅ Configured' : '❌ Not configured', inline: true },
                { name: '🔧 Prefix', value: '`!`', inline: true },
                { name: '📝 Commands', value: `${client.prefixCommands.size} prefix commands\n${client.commands.size} slash commands`, inline: true },
                { name: '💻 Version', value: 'v2.0.0', inline: true }
            ])
            .setColor(config.colors.primary)
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },

    async sayMessage(message, text) {
        if (!text) {
            return message.reply('❌ Please provide a message! Example: `!admin say Hello world!`');
        }

        try {
            await message.delete();
            message.channel.send(text);
        } catch (error) {
            message.reply('❌ Could not delete your message or send the text.');
        }
    },

    async createEmbed(message, content) {
        if (!content) {
            return message.reply('❌ Please provide content! Example: `!admin embed Title | Description`');
        }

        const parts = content.split(' | ');
        if (parts.length < 2) {
            return message.reply('❌ Please use the format: `!admin embed Title | Description`');
        }

        const title = parts[0].trim();
        const description = parts[1].trim();

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(config.colors.primary)
            .setTimestamp()
            .setFooter({ text: `Created by ${message.author.tag}` });

        try {
            await message.delete();
            message.channel.send({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not delete your message or create the embed.');
        }
    },

    async cleanMessages(message, amount) {
        if (!amount || isNaN(amount)) {
            return message.reply('❌ Please provide a valid number! Example: `!admin clean 10`');
        }

        const deleteAmount = parseInt(amount);
        
        if (deleteAmount < 1 || deleteAmount > 100) {
            return message.reply('❌ Please provide a number between 1 and 100!');
        }

        try {
            const messages = await message.channel.messages.fetch({ limit: deleteAmount + 1 });
            await message.channel.bulkDelete(messages);
            
            const confirmMsg = await message.channel.send(`✅ Deleted ${deleteAmount} messages.`);
            
            // Delete confirmation message after 3 seconds
            setTimeout(() => {
                confirmMsg.delete().catch(() => {});
            }, 3000);
        } catch (error) {
            console.error('Error cleaning messages:', error);
            message.reply('❌ Could not delete messages. They might be too old (14+ days) or I lack permissions.');
        }
    }
};
