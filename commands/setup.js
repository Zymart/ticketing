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
                .setDescription('**Configure your advanced order bot:**')
                .addFields([
                    { 
                        name: '📁 **Channel Setup**', 
                        value: '`!setup category <channel-id>` - Set ticket category\n`!setup logs <channel-id>` - Set log channel\n`!setup orders <channel-id>` - Set orders notification\n`!setup received <channel-id>` - Set completed orders\n`!setup ongoing <channel-id>` - Set pending orders', 
                        inline: false 
                    },
                    { 
                        name: '👥 **Role & User Setup**', 
                        value: '`!setup support <role-id>` - Set support role\n`!setup admin add <user-id>` - Add admin\n`!setup admin remove <user-id>` - Remove admin\n`!setup admin list` - List all admins', 
                        inline: false 
                    },
                    { 
                        name: '🎛️ **Panel Commands**', 
                        value: '`!panel create [channel]` - Create order panel\n`!panel template gaming` - Gaming template\n`!panel template digital` - Digital template\n`!panel template services` - Services template', 
                        inline: false 
                    },
                    { 
                        name: '🛍️ **Shop Commands**', 
                        value: '`!shop panel [channel]` - Create shop panel\n`!shop add-item Name | Price | Category | Description | Stock | URL`\n`!shop list` - View all items\n`!shop stats` - Shop statistics', 
                        inline: false 
                    },
                    { 
                        name: '📊 **Status & Help**', 
                        value: '`!setup status` - Show current config\n`!admin info` - Bot statistics\n`!ticket panel [channel]` - Create ticket panel', 
                        inline: false 
                    }
                ])
                .setColor(config.colors.primary)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3524/3524659.png')
                .setFooter({ text: '💡 Pro Tip: Use channel/role IDs, not names! Enable Developer Mode to copy IDs.' });
            
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
            return message.reply('❌ Please provide a category ID!\n\n**Example:** `!setup category 1234567890123456789`\n\n**How to get ID:**\n1. Enable Developer Mode in Discord settings\n2. Right-click on the category\n3. Select "Copy ID"');
        }

        try {
            // Clean the ID (remove any extra characters)
            const cleanId = categoryId.replace(/[^0-9]/g, '');
            
            if (cleanId.length < 17 || cleanId.length > 20) {
                return message.reply('❌ Invalid category ID format! Discord IDs should be 17-20 digits long.\n\n**Make sure to:**\n• Enable Developer Mode\n• Right-click the **category** (not a channel)\n• Copy the correct ID');
            }

            const category = await message.guild.channels.fetch(cleanId).catch(() => null);
            
            if (!category) {
                return message.reply('❌ Cannot find that category! Please check:\n\n• The ID is correct\n• The category exists in this server\n• The bot has permission to see it\n• You copied a **category** ID (not channel ID)');
            }
            
            if (category.type !== ChannelType.GuildCategory) {
                return message.reply(`❌ That's not a category! You selected: **${category.name}** (${category.type})\n\n**You need to:**\n• Right-click on a **CATEGORY** (the folder-like containers)\n• Not a text/voice channel\n• Categories appear above channels in the sidebar`);
            }

            config.ticketSettings.categoryId = cleanId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Category Successfully Set!')
                .setDescription(`Ticket category: **${category.name}**\n\nAll order channels will be created under this category!`)
                .addFields([
                    { name: '📂 Category Name', value: category.name, inline: true },
                    { name: '🆔 Category ID', value: cleanId, inline: true },
                    { name: '🎫 Channels', value: `${category.children.cache.size} channels`, inline: true }
                ])
                .setColor(config.colors.success)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1239/1239425.png');

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Setup category error:', error);
            message.reply('❌ Error accessing that category. Please verify:\n\n• The bot has permission to view the category\n• The category exists in this server\n• You\'re using the correct category ID');
        }
    },

    async setupSupport(message, roleId) {
        if (!roleId) {
            return message.reply('❌ Please provide a role ID!\n\n**Example:** `!setup support 1234567890123456789`\n\n**How to get role ID:**\n1. Enable Developer Mode\n2. Right-click the role in member list or settings\n3. Select "Copy ID"');
        }

        try {
            const cleanId = roleId.replace(/[^0-9]/g, '');
            const role = await message.guild.roles.fetch(cleanId).catch(() => null);
            
            if (!role) {
                return message.reply('❌ Cannot find that role! Make sure:\n• The role exists in this server\n• The ID is correct\n• You copied a role ID (not user ID)');
            }

            config.ticketSettings.supportRoleId = cleanId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Support Role Set!')
                .setDescription(`Support role: **${role.name}**\n\nThis role will be pinged for new orders!`)
                .addFields([
                    { name: '👨‍💼 Role Name', value: role.name, inline: true },
                    { name: '🎨 Role Color', value: role.hexColor, inline: true },
                    { name: '👥 Members', value: `${role.members.size} members`, inline: true }
                ])
                .setColor(role.color || config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Setup support error:', error);
            message.reply('❌ Error setting support role. Please check the role ID and permissions.');
        }
    },

    async setupLogs(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID!\n\n**Example:** `!setup logs 1234567890123456789`');
        }

        try {
            const cleanId = channelId.replace(/[^0-9]/g, '');
            const channel = await message.guild.channels.fetch(cleanId).catch(() => null);
            
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure it\'s a **text channel** and the bot can access it.');
            }

            config.ticketSettings.logChannelId = cleanId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Log Channel Set!')
                .setDescription(`Log channel: **${channel.name}**\n\nAll order activities will be logged here!`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not access that channel. Make sure the bot has permissions and it\'s a valid text channel.');
        }
    },

    async setupOrders(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID!\n\n**Example:** `!setup orders 1234567890123456789`');
        }

        try {
            const cleanId = channelId.replace(/[^0-9]/g, '');
            const channel = await message.guild.channels.fetch(cleanId).catch(() => null);
            
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure it\'s a text channel.');
            }

            config.ticketSettings.ordersChannelId = cleanId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Orders Channel Set!')
                .setDescription(`Orders notification channel: **${channel.name}**\n\n🛒 All new orders will be announced here!`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not access that channel.');
        }
    },

    async setupReceived(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID!\n\n**Example:** `!setup received 1234567890123456789`');
        }

        try {
            const cleanId = channelId.replace(/[^0-9]/g, '');
            const channel = await message.guild.channels.fetch(cleanId).catch(() => null);
            
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure it\'s a text channel.');
            }

            config.ticketSettings.receivedChannelId = cleanId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Order Received Channel Set!')
                .setDescription(`Completed orders channel: **${channel.name}**\n\n🎉 Completed orders will be celebrated here!`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not access that channel.');
        }
    },

    async setupOngoing(message, channelId) {
        if (!channelId) {
            return message.reply('❌ Please provide a channel ID!\n\n**Example:** `!setup ongoing 1234567890123456789`');
        }

        try {
            const cleanId = channelId.replace(/[^0-9]/g, '');
            const channel = await message.guild.channels.fetch(cleanId).catch(() => null);
            
            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply('❌ Invalid channel! Make sure it\'s a text channel.');
            }

            config.ticketSettings.ongoingChannelId = cleanId;
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('✅ Ongoing Orders Channel Set!')
                .setDescription(`Pending orders channel: **${channel.name}**\n\n📋 Unclaimed orders will be tracked here!`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not access that channel.');
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
                    return message.reply('❌ Please provide a user ID!\n\n**Example:** `!setup admin add 1234567890123456789`');
                }

                const cleanUserId = args[1].replace(/[^0-9]/g, '');
                
                if (config.adminIds.includes(cleanUserId)) {
                    return message.reply('❌ That user is already an admin!');
                }

                try {
                    const user = await message.guild.members.fetch(cleanUserId);
                    config.adminIds.push(cleanUserId);
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
                    return message.reply('❌ Please provide a user ID!');
                }

                const removeUserId = args[1].replace(/[^0-9]/g, '');
                const index = config.adminIds.indexOf(removeUserId);
                
                if (index === -1) {
                    return message.reply('❌ That user is not an admin!');
                }

                try {
                    const user = await message.guild.members.fetch(removeUserId);
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
                    return message.reply('📝 No admins have been set yet.\n\nUse `!setup admin add <user-id>` to add admins.');
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
        let categoryName = '❌ Not set';
        let supportRoleName = '❌ Not set';
        let logChannelName = '❌ Not set';
        let ordersChannelName = '❌ Not set';
        let receivedChannelName = '❌ Not set';
        let ongoingChannelName = '❌ Not set';

        // Check category
        try {
            if (config.ticketSettings.categoryId) {
                const category = await message.guild.channels.fetch(config.ticketSettings.categoryId);
                categoryName = category ? `✅ ${category.name}` : '❌ Invalid ID';
            }
        } catch (error) {
            categoryName = '❌ Invalid ID';
        }

        // Check support role
        try {
            if (config.ticketSettings.supportRoleId) {
                const role = await message.guild.roles.fetch(config.ticketSettings.supportRoleId);
                supportRoleName = role ? `✅ ${role.name}` : '❌ Invalid ID';
            }
        } catch (error) {
            supportRoleName = '❌ Invalid ID';
        }

        // Check all channels
        const channels = [
            { key: 'logChannelId', name: 'logChannelName' },
            { key: 'ordersChannelId', name: 'ordersChannelName' },
            { key: 'receivedChannelId', name: 'receivedChannelName' },
            { key: 'ongoingChannelId', name: 'ongoingChannelName' }
        ];

        for (const { key, name } of channels) {
            try {
                if (config.ticketSettings[key]) {
                    const channel = await message.guild.channels.fetch(config.ticketSettings[key]);
                    eval(`${name} = channel ? \`✅ ${channel.name}\` : '❌ Invalid ID'`);
                }
            } catch (error) {
                eval(`${name} = '❌ Invalid ID'`);
            }
        }

        const setupComplete = 
            config.ticketSettings.categoryId && 
            config.ticketSettings.supportRoleId && 
            config.ticketSettings.logChannelId && 
            config.ticketSettings.ordersChannelId && 
            config.ticketSettings.receivedChannelId && 
            config.ticketSettings.ongoingChannelId;

        const embed = new EmbedBuilder()
            .setTitle('🔧 Bot Configuration Status')
            .setDescription(setupComplete ? '✅ **Setup Complete!** Your bot is ready to use!' : '⚠️ **Setup Required!** Some settings are missing.')
            .addFields([
                { name: '📁 Ticket Category', value: categoryName, inline: true },
                { name: '👨‍💼 Support Role', value: supportRoleName, inline: true },
                { name: '📝 Log Channel', value: logChannelName, inline: true },
                { name: '🛒 Orders Channel', value: ordersChannelName, inline: true },
                { name: '🎉 Received Channel', value: receivedChannelName, inline: true },
                { name: '📋 Ongoing Channel', value: ongoingChannelName, inline: true },
                { name: '👑 Bot Owner', value: `<@${config.ownerId}>`, inline: true },
                { name: '👥 Admins', value: config.adminIds.length > 0 ? `${config.adminIds.length} admin(s)` : 'None set', inline: true },
                { name: '🎛️ Next Steps', value: setupComplete ? 'Use `!panel create` to create your order panel!' : 'Complete missing settings above', inline: true }
            ])
            .setColor(setupComplete ? config.colors.success : config.colors.warning)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3524/3524659.png')
            .setFooter({ text: setupComplete ? '🚀 Ready to accept orders!' : '⚙️ Use !setup <command> to configure missing settings' });

        message.reply({ embeds: [embed] });
    }
};
