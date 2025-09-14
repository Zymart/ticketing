// commands/ticket.js - Complete ticket and order management system
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Use global config
const config = global.config;

// Helper function to check permissions
function hasPermission(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

module.exports = {
    name: 'ticket',
    description: 'Advanced ticket and order management',
    
    async execute(message, args, client) {
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🎫 Advanced Ticket & Order System')
                .setDescription('**Professional order management for your business!**')
                .addFields([
                    { 
                        name: '🎛️ **Panel Creation**', 
                        value: '`!ticket panel [channel]` - Create order panel\n`!panel create [channel]` - Alternative command\n`!panel template <type>` - Use templates', 
                        inline: false 
                    },
                    { 
                        name: '👨‍💼 **Order Management** (Admins Only)', 
                        value: '`!ticket close` - Force close current order\n`!ticket add @user` - Add user to order channel\n`!ticket remove @user` - Remove user from order\n`!ticket info` - Show order details', 
                        inline: false 
                    },
                    { 
                        name: '📊 **Statistics & Info**', 
                        value: '`!ticket stats` - Order statistics\n`!ticket list` - List active orders\n`!admin info` - Complete bot information', 
                        inline: false 
                    },
                    { 
                        name: '🛍️ **Shop System**', 
                        value: '`!shop panel [channel]` - Create shop panel\n`!shop add-item` - Add items to shop\n`!shop list` - View all shop items', 
                        inline: false 
                    }
                ])
                .setColor(config.colors.primary)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/891/891462.png')
                .setFooter({ text: '💼 Professional Business Solution • Advanced Order Management' });
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'panel':
                await this.createPanel(message, args[1], client);
                break;
            case 'close':
                await this.forceClose(message, client);
                break;
            case 'add':
                await this.addUser(message, args[1], client);
                break;
            case 'remove':
                await this.removeUser(message, args[1], client);
                break;
            case 'info':
                await this.showOrderInfo(message, client);
                break;
            case 'stats':
                await this.showStats(message, client);
                break;
            case 'list':
                await this.listActive(message, client);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!ticket` to see available commands.');
        }
    },

    async createPanel(message, channelArg, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only the bot owner or admins can create order panels.');
        }

        if (!config.ticketSettings.categoryId || !config.ticketSettings.supportRoleId) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Bot Not Configured')
                .setDescription('**Please complete the setup first!**')
                .addFields([
                    { name: '🔧 Required Setup', value: 'Use `!setup status` to see what\'s missing', inline: true },
                    { name: '📁 Need Category', value: 'Use `!setup category <id>`', inline: true },
                    { name: '👨‍💼 Need Support Role', value: 'Use `!setup support <id>`', inline: true },
                ])
                .setColor(config.colors.error);
            return message.reply({ embeds: [embed] });
        }

        let channel = message.channel;
        if (channelArg) {
            const channelId = channelArg.replace(/[<>#]/g, '');
            try {
                channel = await message.guild.channels.fetch(channelId);
            } catch (error) {
                return message.reply('❌ Could not find that channel! Use the channel ID or mention.');
            }
        }

        try {
            const ticketSystem = require('../systems/ticketSystem');
            await ticketSystem.createTicketPanel(channel);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Order Panel Created Successfully!')
                .setDescription(`Your professional order panel has been created in ${channel}!`)
                .addFields([
                    { name: '📍 Location', value: `${channel}`, inline: true },
                    { name: '🎯 Template', value: config.panelSettings.title || 'Default', inline: true },
                    { name: '🚀 Status', value: 'Ready for orders!', inline: true },
                    { name: '💡 Pro Tips', value: '• Use `!panel template <type>` to change design\n• Use `!setup status` to verify all settings\n• Monitor `!ticket stats` for performance', inline: false }
                ])
                .setColor(config.colors.success)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/1239/1239425.png');

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating ticket panel:', error);
            message.reply('❌ There was an error creating the order panel. Please check bot permissions and try again.');
        }
    },

    async forceClose(message, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can force close orders.');
        }

        if (!message.channel.name.includes('order-')) {
            return message.reply('❌ This command can only be used in order channels.');
        }

        try {
            const ticketSystem = require('../systems/ticketSystem');
            
            // Create a fake interaction object for the ticket system
            const fakeInteraction = {
                channel: message.channel,
                user: message.author,
                guild: message.guild,
                deferUpdate: async () => {},
                editReply: async (options) => message.channel.send(options.content || 'Order force closed by admin.')
            };

            await ticketSystem.finalizeTicketClose(fakeInteraction);

            const embed = new EmbedBuilder()
                .setTitle('🔒 Order Force Closed')
                .setDescription(`Order has been force closed by ${message.author}`)
                .setColor(config.colors.warning);

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error force closing order:', error);
            message.reply('❌ Error force closing order.');
        }
    },

    async addUser(message, userArg, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can add users to orders.');
        }

        if (!message.channel.name.includes('order-')) {
            return message.reply('❌ This command can only be used in order channels.');
        }

        if (!userArg) {
            return message.reply('❌ Please mention a user or provide their ID!\n**Example:** `!ticket add @user` or `!ticket add 123456789`');
        }

        try {
            const userId = userArg.replace(/[<@!>]/g, '');
            const member = await message.guild.members.fetch(userId);

            await message.channel.permissionOverwrites.create(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const embed = new EmbedBuilder()
                .setTitle('👤 User Added to Order')
                .setDescription(`**${member.displayName}** has been added to this order channel.`)
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find or add that user. Make sure they are in the server.');
        }
    },

    async removeUser(message, userArg, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can remove users from orders.');
        }

        if (!message.channel.name.includes('order-')) {
            return message.reply('❌ This command can only be used in order channels.');
        }

        if (!userArg) {
            return message.reply('❌ Please mention a user or provide their ID!');
        }

        try {
            const userId = userArg.replace(/[<@!>]/g, '');
            const member = await message.guild.members.fetch(userId);

            await message.channel.permissionOverwrites.delete(member);

            const embed = new EmbedBuilder()
                .setTitle('👤 User Removed from Order')
                .setDescription(`**${member.displayName}** has been removed from this order channel.`)
                .setColor(config.colors.warning);

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Could not find or remove that user.');
        }
    },

    async showOrderInfo(message, client) {
        if (!message.channel.name.includes('order-')) {
            return message.reply('❌ This command can only be used in order channels.');
        }

        try {
            const ticketSystem = require('../systems/ticketSystem');
            const orderData = ticketSystem.orderData.get(message.channel.id);

            if (!orderData) {
                return message.reply('❌ No order data found for this channel.');
            }

            const embed = new EmbedBuilder()
                .setTitle(`📋 Order Information - ${orderData.orderId}`)
                .addFields([
                    { name: '👤 Customer', value: `${orderData.customer}`, inline: true },
                    { name: '📊 Status', value: orderData.status.toUpperCase(), inline: true },
                    { name: '🕒 Created', value: `<t:${Math.floor(orderData.createdAt / 1000)}:R>`, inline: true },
                    { name: '🎯 Service', value: orderData.serviceType, inline: true },
                    { name: '💰 Budget', value: orderData.budget, inline: true },
                    { name: '⏰ Urgency', value: orderData.urgency, inline: true },
                    { name: '📝 Details', value: orderData.details.slice(0, 500), inline: false }
                ])
                .setColor(config.colors.primary)
                .setThumbnail(orderData.customer.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            if (orderData.claimedBy) {
                embed.addFields([
                    { name: '✋ Claimed By', value: `${orderData.claimedBy}`, inline: true },
                    { name: '🕒 Claimed At', value: `<t:${Math.floor(orderData.claimedAt / 1000)}:R>`, inline: true }
                ]);
            }

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Error retrieving order information.');
        }
    },

    async showStats(message, client) {
        try {
            const ticketSystem = require('../systems/ticketSystem');
            const orders = Array.from(ticketSystem.orderData.values());
            
            const totalOrders = orders.length;
            const pendingOrders = orders.filter(o => o.status === 'pending').length;
            const processingOrders = orders.filter(o => o.status === 'processing').length;
            const completedOrders = orders.filter(o => o.status === 'completed').length;
            const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

            // Calculate completion rate
            const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

            const embed = new EmbedBuilder()
                .setTitle('📊 Order Statistics')
                .addFields([
                    { name: '📈 Total Orders', value: totalOrders.toString(), inline: true },
                    { name: '🟡 Pending', value: pendingOrders.toString(), inline: true },
                    { name: '🔵 Processing', value: processingOrders.toString(), inline: true },
                    { name: '✅ Completed', value: completedOrders.toString(), inline: true },
                    { name: '❌ Cancelled', value: cancelledOrders.toString(), inline: true },
                    { name: '📊 Success Rate', value: `${completionRate}%`, inline: true },
                    { name: '🚀 Bot Status', value: 'Online & Ready', inline: true },
                    { name: '⚡ Active Channels', value: ticketSystem.activeTickets.size.toString(), inline: true },
                    { name: '🏆 Performance', value: completionRate >= 80 ? 'Excellent' : completionRate >= 60 ? 'Good' : 'Needs Improvement', inline: true }
                ])
                .setColor(config.colors.primary)
                .setTimestamp()
                .setFooter({ text: 'Advanced Order Management System' });

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Error retrieving statistics.');
        }
    },

    async listActive(message, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can view the active orders list.');
        }

        try {
            const ticketSystem = require('../systems/ticketSystem');
            const activeOrders = Array.from(ticketSystem.orderData.values())
                .filter(o => o.status === 'pending' || o.status === 'processing')
                .sort((a, b) => a.createdAt - b.createdAt);

            if (activeOrders.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('📋 Active Orders')
                    .setDescription('🎉 No active orders! All caught up!')
                    .setColor(config.colors.success);
                return message.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setTitle(`📋 Active Orders (${activeOrders.length})`)
                .setDescription('Currently active orders in the system:')
                .setColor(config.colors.primary);

            activeOrders.slice(0, 10).forEach(order => {
                const statusEmoji = order.status === 'pending' ? '🟡' : '🔵';
                const timeAgo = `<t:${Math.floor(order.createdAt / 1000)}:R>`;
                
                embed.addFields([
                    {
                        name: `${statusEmoji} ${order.orderId} - ${order.serviceType}`,
                        value: `**Customer:** ${order.customer.displayName}\n**Status:** ${order.status.toUpperCase()}\n**Created:** ${timeAgo}\n**Budget:** ${order.budget}`,
                        inline: true
                    }
                ]);
            });

            if (activeOrders.length > 10) {
                embed.addFields([
                    { name: '📊 More Orders', value: `... and ${activeOrders.length - 10} more active orders`, inline: false }
                ]);
            }

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Error retrieving active orders list.');
        }
    }
};
