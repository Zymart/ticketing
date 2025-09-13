// commands/setup.js - Setup and admin management commands
const { EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');

// Use global config
const config = global.config;

// Helper function to check if user is owner or admin
function isOwnerOrAdmin(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

// Helper function to save config
function saveConfig() {
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

module.exports = {
    name: 'setup',
    description: 'Setup bot configuration',
    
    async execute(message, args, client) {
        // Only owner can use setup commands
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ Only the bot owner can use setup commands!');
        }

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🔧 Setup Commands')
                .setDescription('Use these commands to configure the bot:')
                .addFields([
                    { name: '!setup category <channel-id>', value: 'Set the ticket category', inline: false },
                    { name: '!setup support <role-id>', value: 'Set the support role', inline: false },
                    { name: '!setup logs <channel-id>', value: 'Set the log channel', inline: false },
                    { name: '!setup orders <channel-id>', value: 'Set the orders notification channel', inline: false },
                    { name: '!setup received <channel-id>', value: 'Set the order received channel', inline: false },
                    { name: '!setup ongoing <channel-id>', value: 'Set the ongoing orders channel', inline: false },
                    { name: '!setup admin add <user-id>', value: 'Add an admin', inline: false },
                    { name: '!setup admin remove <user-id>', value: 'Remove an admin', inline: false },
                    { name: '!setup admin list', value: 'List all admins', inline: false },
                    { name: '!setup status', value: 'Show current configuration', inline: false }
                ])
                .setColor(config.colors.primary);
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'category':
                await this.setupCategory(message, args[1]);
                break;
            case 'support':
                await this.setupSupport(message, args[1]);
                break;
            case 'logs':
                await this.setupLogs(message, args[1]);
                break;
            case 'orders':
                await this.setupOrders(message, args[1]);
                break;
            case 'received':
                await this.setupReceived(message, args[1]);
                break;
            case 'ongoing':
                await this.setupOngoing(message, args[1]);
                break;
            case 'admin':
                await this.manageAdmins(message, args.slice(1));
                break;
            case 'status':
                await this.showStatus(message);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!setup` to see available commands.');
        }
    },

    async setupCategory(message, categoryId) {
        if (!categoryId) {
            return message.reply('❌ Please provide a category ID! Example: `!setup category 123456789`');
        }

        try {
            const category = await message.guild.channels.fetch(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                return message.reply('❌ Invalid category! Make sure you provide a valid category ID.');
            }

            config.ticketSettings.categoryId = categoryId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Category Set!')
                .setDescription(`Ticket category has been set to: **${category.name}**`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find that category. Make sure the ID is correct and the bot has access to it.');
        }
    },

    async setupSupport(message, roleId) {
        if (!roleId) {
            return message.reply('❌ Please provide a role ID! Example: `!setup support 123456789`');
        }

        try {
            const role = await message.guild.roles.fetch(roleId);
            if (!role) {
                return message.reply('❌ Invalid role! Make sure you provide a valid role ID.');
            }

            config.ticketSettings.supportRoleId = roleId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Support Role Set!')
                .setDescription(`Support role has been set to: **${role.name}**`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find that role. Make sure the ID is correct.');
        }
    },

    async setupLogs(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID! Example: `!setup logs 123456789`');
        }

        try {
            const channel = await message.guild.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure you provide a valid text channel ID.');
            }

            config.ticketSettings.logChannelId = channelId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Log Channel Set!')
                .setDescription(`Log channel has been set to: **${channel.name}**`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find that channel. Make sure the ID is correct and the bot has access to it.');
        }
    },

    async setupOrders(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID! Example: `!setup orders 123456789`');
        }

        try {
            const channel = await message.guild.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure you provide a valid text channel ID.');
            }

            config.ticketSettings.ordersChannelId = channelId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Orders Channel Set!')
                .setDescription(`Orders notification channel has been set to: **${channel.name}**\n\nAll new orders will be announced here! 🛒`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find that channel. Make sure the ID is correct and the bot has access to it.');
        }
    },

    async setupReceived(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID! Example: `!setup received 123456789`');
        }

        try {
            const channel = await message.guild.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure you provide a valid text channel ID.');
            }

            config.ticketSettings.receivedChannelId = channelId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Order Received Channel Set!')
                .setDescription(`Order received channel has been set to: **${channel.name}**\n\nCompleted orders will be announced here! 🎉`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find that channel. Make sure the ID is correct and the bot has access to it.');
        }
    },

    async setupOngoing(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID! Example: `!setup ongoing 123456789`');
        }

        try {
            const channel = await message.guild.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure you provide a valid text channel ID.');
            }

            config.ticketSettings.ongoingChannelId = channelId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Ongoing Orders Channel Set!')
                .setDescription(`Ongoing orders channel has been set to: **${channel.name}**\n\nActive orders will be tracked here! 📋`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find that channel. Make sure the ID is correct and the bot has access to it.');
        }
    },

    async manageAdmins(message, args) {
        if (!args[0]) {
            return message.reply('❌ Use: `!setup admin add/remove/list <user-id>`');
        }

        const action = args[0].toLowerCase();

        switch (action) {
            case 'add':
                if (!args[1]) {
                    return message.reply('❌ Please provide a user ID! Example: `!setup admin add 123456789`');
                }

                if (config.adminIds.includes(args[1])) {
                    return message.reply('❌ That user is already an admin!');
                }

                try {
                    const user = await message.guild.members.fetch(args[1]);
                    config.adminIds.push(args[1]);
                    saveConfig();

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Admin Added!')
                        .setDescription(`**${user.user.tag}** has been added as an admin.`)
                        .setColor(config.colors.success);

                    message.reply({ embeds: [embed] });
                } catch (error) {
                    message.reply('❌ Could not find that user in this server.');
                }
                break;

            case 'remove':
                if (!args[1]) {
                    return message.reply('❌ Please provide a user ID! Example: `!setup admin remove 123456789`');
                }

                const index = config.adminIds.indexOf(args[1]);
                if (index === -1) {
                    return message.reply('❌ That user is not an admin!');
                }

                try {
                    const user = await message.guild.members.fetch(args[1]);
                    config.adminIds.splice(index, 1);
                    saveConfig();

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Admin Removed!')
                        .setDescription(`**${user.user.tag}** has been removed from admins.`)
                        .setColor(config.colors.warning);

                    message.reply({ embeds: [embed] });
                } catch (error) {
                    // Remove even if we can't fetch the user
                    config.adminIds.splice(index, 1);
                    saveConfig();
                    message.reply('✅ Admin removed from list.');
                }
                break;

            case 'list':
                if (config.adminIds.length === 0) {
                    return message.reply('📝 No admins have been set yet.');
                }

                let adminList = '';
                for (const adminId of config.adminIds) {
                    try {
                        const user = await message.guild.members.fetch(adminId);
                        adminList += `• ${user.user.tag} (${adminId})\n`;
                    } catch (error) {
                        adminList += `• Unknown User (${adminId})\n`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('👥 Current Admins')
                    .setDescription(adminList || 'No admins found.')
                    .setColor(config.colors.primary);

                message.reply({ embeds: [embed] });
                break;

            default:
                message.reply('❌ Use: `!setup admin add/remove/list <user-id>`');
        }
    },

    async showStatus(message) {
        let categoryName = 'Not set';
        let supportRoleName = 'Not set';
        let logChannelName = 'Not set';
        let ordersChannelName = 'Not set';
        let receivedChannelName = 'Not set';
        let ongoingChannelName = 'Not set';

        try {
            if (config.ticketSettings.categoryId) {
                const category = await message.guild.channels.fetch(config.ticketSettings.categoryId);
                categoryName = category ? category.name : 'Invalid ID';
            }
        } catch (error) {
            categoryName = 'Invalid ID';
        }

        try {
            if (config.ticketSettings.supportRoleId) {
                const role = await message.guild.roles.fetch(config.ticketSettings.supportRoleId);
                supportRoleName = role ? role.name : 'Invalid ID';
            }
        } catch (error) {
            supportRoleName = 'Invalid ID';
        }

        try {
            if (config.ticketSettings.logChannelId) {
                const channel = await message.guild.channels.fetch(config.ticketSettings.logChannelId);
                logChannelName = channel ? channel.name : 'Invalid ID';
            }
        } catch (error) {
            logChannelName = 'Invalid ID';
        }

        try {
            if (config.ticketSettings.ordersChannelId) {
                const channel = await message.guild.channels.fetch(config.ticketSettings.ordersChannelId);
                ordersChannelName = channel ? channel.name : 'Invalid ID';
            }
        } catch (error) {
            ordersChannelName = 'Invalid ID';
        }

        try {
            if (config.ticketSettings.receivedChannelId) {
                const channel = await message.guild.channels.fetch(config.ticketSettings.receivedChannelId);
                receivedChannelName = channel ? channel.name : 'Invalid ID';
            }
        } catch (error) {
            receivedChannelName = 'Invalid ID';
        }

        try {
            if (config.ticketSettings.ongoingChannelId) {
                const channel = await message.guild.channels.fetch(config.ticketSettings.ongoingChannelId);
                ongoingChannelName = channel ? channel.name : 'Invalid ID';
            }
        } catch (error) {
            ongoingChannelName = 'Invalid ID';
        }

        const embed = new EmbedBuilder()
            .setTitle('🔧 Bot Configuration Status')
            .addFields([
                { name: '📁 Ticket Category', value: categoryName, inline: true },
                { name: '👨‍💼 Support Role', value: supportRoleName, inline: true },
                { name: '📝 Log Channel', value: logChannelName, inline: true },
                { name: '🛒 Orders Channel', value: ordersChannelName, inline: true },
                { name: '🎉 Received Channel', value: receivedChannelName, inline: true },
                { name: '📋 Ongoing Channel', value: ongoingChannelName, inline: true },
                { name: '👑 Bot Owner', value: `<@${config.ownerId}>`, inline: true },
                { name: '👥 Admins', value: config.adminIds.length > 0 ? `${config.adminIds.length} admin(s)` : 'None', inline: true },
                { name: '✅ Setup Complete', value: (config.ticketSettings.categoryId && config.ticketSettings.supportRoleId && config.ticketSettings.logChannelId && config.ticketSettings.ordersChannelId && config.ticketSettings.receivedChannelId && config.ticketSettings.ongoingChannelId) ? 'Yes' : 'No', inline: true }
            ])
            .setColor(config.colors.primary)
            .setFooter({ text: 'Use !setup <command> to configure missing settings' });

        message.reply({ embeds: [embed] });
    }
};
