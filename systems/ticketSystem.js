// systems/ticketSystem.js - Advanced order system with forms and tracking - COMPLETE REWRITE
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const database = require('./database');

// Use global config
const config = global.config;

class TicketSystem {
    constructor() {
        this.activeTickets = new Map();
        this.orderData = new Map();
        this.loadTickets();
        this.loadOrders();
    }

    init(client) {
        this.client = client;
        
        // Handle button interactions for tickets
        client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isButton()) {
                    await this.handleButtonInteraction(interaction);
                } else if (interaction.isModalSubmit() && interaction.customId === 'order_form') {
                    await this.processOrderForm(interaction);
                }
            } catch (error) {
                console.error('Ticket system interaction error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Something went wrong. Please try again or contact an admin.',
                        ephemeral: true
                    }).catch(() => {});
                }
            }
        });
    }

    async handleButtonInteraction(interaction) {
        try {
            switch (interaction.customId) {
                case 'create_ticket':
                    await this.showOrderForm(interaction);
                    break;
                case 'close_ticket':
                    await this.closeTicket(interaction);
                    break;
                case 'confirm_close':
                    await this.finalizeTicketClose(interaction);
                    break;
                case 'cancel_close':
                    await this.cancelClose(interaction);
                    break;
                case 'claim_order':
                    await this.claimOrder(interaction);
                    break;
                case 'mark_completed':
                    await this.markOrderCompleted(interaction);
                    break;
                case 'keep_order_active':
                    await this.keepOrderActive(interaction);
                    break;
                case 'confirm_cancel_order':
                    await this.confirmCancelOrder(interaction);
                    break;
                case 'reopen_order':
                    await this.reopenOrder(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: 'This button action is not implemented yet. Please contact an admin for assistance.',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Button interaction error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred processing that button. Please try again or contact support.',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }

    async keepOrderActive(interaction) {
        await interaction.update({
            content: 'Order will remain active. Cancellation cancelled.',
            embeds: [],
            components: []
        });

        const orderData = this.orderData.get(interaction.channel.id);
        if (orderData) {
            await this.logOrderAction('cancellation_cancelled', interaction.user, interaction.channel, orderData);
        }

        const keepActiveEmbed = new EmbedBuilder()
            .setTitle('Order Remains Active')
            .setDescription('Your order cancellation has been cancelled. The order will continue processing.')
            .addFields([
                { name: 'Status', value: 'Active and being processed', inline: true },
                { name: 'Next Steps', value: 'Staff will continue working on your order', inline: true },
                { name: 'Need Help?', value: 'Contact staff in this channel', inline: true }
            ])
            .setColor(config.colors.primary);

        await interaction.followUp({ embeds: [keepActiveEmbed] });
    }

    async cancelClose(interaction) {
        await interaction.update({
            content: 'Order cancellation cancelled. Order remains active.',
            embeds: [],
            components: []
        });

        const continueEmbed = new EmbedBuilder()
            .setTitle('Order Still Active')
            .setDescription('Your order will continue processing normally.')
            .addFields([
                { name: 'What happens next?', value: 'Staff will continue working on your order as normal', inline: false },
                { name: 'Need changes?', value: 'Let staff know if you need to modify anything', inline: false },
                { name: 'Questions?', value: 'Feel free to ask staff in this channel', inline: false }
            ])
            .setColor(config.colors.success);

        await interaction.followUp({ embeds: [continueEmbed] });
    }

    async confirmCancelOrder(interaction) {
        if (!interaction.channel.name.includes('order-')) {
            return await interaction.reply({
                content: 'This command can only be used in order channels.',
                ephemeral: true
            });
        }

        await interaction.update({
            content: 'Order cancellation confirmed. Processing cancellation...',
            embeds: [],
            components: []
        });

        await this.finalizeTicketClose(interaction);
    }

    async reopenOrder(interaction) {
        if (!interaction.channel.name.includes('order-')) {
            return await interaction.reply({
                content: 'This command can only be used in order channels.',
                ephemeral: true
            });
        }

        const orderData = this.orderData.get(interaction.channel.id);
        if (!orderData) {
            return await interaction.reply({
                content: 'Order data not found.',
                ephemeral: true
            });
        }

        orderData.status = 'pending';
        orderData.reopenedBy = interaction.user;
        orderData.reopenedAt = Date.now();
        this.saveOrders();

        const reopenEmbed = new EmbedBuilder()
            .setTitle('Order Reopened')
            .setDescription(`Order has been reopened by ${interaction.user}`)
            .addFields([
                { name: 'Order ID', value: orderData.orderId, inline: true },
                { name: 'Status', value: 'Pending', inline: true },
                { name: 'Reopened By', value: `${interaction.user}`, inline: true }
            ])
            .setColor(config.colors.warning);

        await interaction.reply({ embeds: [reopenEmbed] });

        await this.updateOngoingOrders();
        await database.saveOrder(orderData);
        await this.logOrderAction('reopened', interaction.user, interaction.channel, orderData);
    }

    async logOrderAction(action, user, channel, orderData) {
        const logChannel = this.client.channels.cache.get(config.ticketSettings.logChannelId);
        if (!logChannel) return;

        try {
            const embed = new EmbedBuilder()
                .setTitle(`Order ${action.charAt(0).toUpperCase() + action.slice(1)}`)
                .addFields([
                    { name: 'Order ID', value: orderData.orderId, inline: true },
                    { name: 'Customer', value: `${orderData.customer}`, inline: true },
                    { name: 'Staff', value: `${user}`, inline: true },
                    { name: 'Service', value: orderData.serviceType, inline: true },
                    { name: 'Budget', value: orderData.budget, inline: true },
                    { name: 'Status', value: orderData.status, inline: true },
                    { name: 'Channel', value: `${channel}`, inline: false },
                    { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                ])
                .setColor(this.getActionColor(action))
                .setTimestamp();

            if (orderData.details && orderData.details.length > 0) {
                embed.addFields([
                    { name: 'Order Details', value: orderData.details.slice(0, 500) + (orderData.details.length > 500 ? '...' : ''), inline: false }
                ]);
            }

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending log message:', error);
        }
    }

    getActionColor(action) {
        const colors = {
            'created': config.colors.primary,
            'claimed': config.colors.warning,
            'completed': config.colors.success,
            'cancelled': config.colors.error,
            'reopened': config.colors.warning,
            'updated': config.colors.primary,
            'cancellation_cancelled': config.colors.success
        };
        return colors[action] || config.colors.primary;
    }

    loadTickets() {
        try {
            if (fs.existsSync('./data/tickets.json')) {
                const data = fs.readFileSync('./data/tickets.json', 'utf8');
                this.activeTickets = new Map(JSON.parse(data));
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
        }
    }

    saveTickets() {
        try {
            if (!fs.existsSync('./data')) {
                fs.mkdirSync('./data');
            }
            fs.writeFileSync('./data/tickets.json', JSON.stringify([...this.activeTickets]));
        } catch (error) {
            console.error('Error saving tickets:', error);
        }
    }

    loadOrders() {
        try {
            if (fs.existsSync('./data/orders.json')) {
                const data = fs.readFileSync('./data/orders.json', 'utf8');
                const ordersArray = JSON.parse(data);
                this.orderData = new Map(ordersArray);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    saveOrders() {
        try {
            if (!fs.existsSync('./data')) {
                fs.mkdirSync('./data');
            }
            fs.writeFileSync('./data/orders.json', JSON.stringify([...this.orderData]));
        } catch (error) {
            console.error('Error saving orders:', error);
        }
    }

    async createTicketPanel(channel) {
        const panelSettings = config.panelSettings || {};
        
        const embed = new EmbedBuilder()
            .setTitle(panelSettings.title || 'Professional Order System')
            .setDescription(panelSettings.description || '**Ready to place your order?** Click the button below to get started!\n\n*Fill out our quick order form and get instant pricing!*')
            .addFields([
                {
                    name: '**What We Offer:**',
                    value: `\`\`\`${panelSettings.services || '• Game Currency & Rare Items\n• Account Services & Boosts\n• Power-leveling & Achievements\n• Custom Gaming Services\n• VIP Packages & Bundles\n• Exclusive Limited Items'}\`\`\``,
                    inline: false
                },
                {
                    name: '**Why Choose Us:**',
                    value: `\`\`\`${panelSettings.features || '✓ Instant Pricing\n✓ 24/7 Support\n✓ Secure Transactions\n✓ Fast Delivery\n✓ Money Back Guarantee\n✓ Trusted by 1000+ Customers'}\`\`\``,
                    inline: true
                },
                {
                    name: '**Payment Methods:**',
                    value: `\`\`\`• PayPal (USD/PHP)\n• GCash (Philippines)\n• Automatic conversion\n• Secure processing\`\`\``,
                    inline: true
                }
            ])
            .setColor(config.colors.primary)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/891/891462.png')
            .setImage('https://via.placeholder.com/400x100/0099ff/ffffff?text=Professional+Gaming+Services')
            .setFooter({ text: panelSettings.footer || 'PayPal & GCash • PHP Support • Premium Service' });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel(panelSettings.buttonText || 'Place Your Order')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒')
            );

        return await channel.send({ embeds: [embed], components: [button] });
    }

    async showOrderForm(interaction) {
        const userId = interaction.user.id;

        // Check if user already has an active ticket
        if (this.activeTickets.has(userId)) {
            const existingTicketId = this.activeTickets.get(userId);
            const existingChannel = interaction.guild.channels.cache.get(existingTicketId);
            
            if (existingChannel) {
                return await interaction.reply({
                    content: `You already have an active order: ${existingChannel}`,
                    ephemeral: true
                });
            } else {
                this.activeTickets.delete(userId);
                this.saveTickets();
            }
        }

        // Check for existing active orders
        const existingOrder = Array.from(this.orderData.values())
            .find(order => order.customer.id === userId && order.status === 'pending');

        if (existingOrder) {
            const existingChannel = interaction.guild.channels.cache.get(
                Array.from(this.orderData.keys())[
                    Array.from(this.orderData.values()).indexOf(existingOrder)
                ]
            );

            if (existingChannel) {
                return await interaction.reply({
                    content: `You already have an active order: ${existingChannel}\n\nPlease complete or cancel your existing order before creating a new one.`,
                    ephemeral: true
                });
            }
        }

        // Create the order form modal
        const modal = new ModalBuilder()
            .setCustomId('order_form')
            .setTitle('Place Your Order');

        const serviceInput = new TextInputBuilder()
            .setCustomId('service_type')
            .setLabel('What service do you need?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: Valorant Account Boost, 1000 Robux, Discord Nitro')
            .setRequired(true)
            .setMaxLength(100);

        const detailsInput = new TextInputBuilder()
            .setCustomId('order_details')
            .setLabel('Order Details & Specifications')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Example: I need my Valorant account boosted from Gold 1 to Platinum 2. Current rank is Gold 1 with 45 RR. I play on NA servers and prefer weekday boosting between 6-10 PM EST.')
            .setRequired(true)
            .setMaxLength(1000);

        const quantityInput = new TextInputBuilder()
            .setCustomId('quantity')
            .setLabel('Quantity/Amount Needed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: 5 ranks up, 1000 coins, 3 items, 1 month subscription')
            .setRequired(true)
            .setMaxLength(50);

        const budgetInput = new TextInputBuilder()
            .setCustomId('budget')
            .setLabel('Your Budget (USD or PHP)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: $25, ₱1400, $10-15, or "flexible"')
            .setRequired(true)
            .setMaxLength(20);

        const urgencyInput = new TextInputBuilder()
            .setCustomId('urgency')
            .setLabel('When do you need this completed?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: ASAP, within 24 hours, this weekend, no rush')
            .setRequired(true)
            .setMaxLength(50);

        const firstRow = new ActionRowBuilder().addComponents(serviceInput);
        const secondRow = new ActionRowBuilder().addComponents(detailsInput);
        const thirdRow = new ActionRowBuilder().addComponents(quantityInput);
        const fourthRow = new ActionRowBuilder().addComponents(budgetInput);
        const fifthRow = new ActionRowBuilder().addComponents(urgencyInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    async processOrderForm(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const displayName = interaction.member.displayName;

        try {
            // Get form data with validation
            const serviceType = interaction.fields.getTextInputValue('service_type').trim();
            const details = interaction.fields.getTextInputValue('order_details').trim();
            const quantity = interaction.fields.getTextInputValue('quantity').trim();
            const budget = interaction.fields.getTextInputValue('budget').trim();
            const urgency = interaction.fields.getTextInputValue('urgency').trim();

            // Validate required fields
            if (!serviceType || !details || !quantity || !budget || !urgency) {
                return await interaction.editReply({
                    content: 'All fields are required. Please fill out the form completely.'
                });
            }

            const orderData = {
                serviceType,
                details,
                quantity,
                budget,
                urgency,
                customer: interaction.user,
                orderId: `ORD${Date.now().toString().slice(-6)}`,
                status: 'pending',
                createdAt: Date.now(),
                estimatedCompletion: this.calculateEstimatedCompletion(urgency)
            };

            // Create channel with better name handling
            const cleanName = displayName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 20);

            const channelName = `order-${cleanName}-${orderData.orderId.slice(-3)}`;
            
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: config.ticketSettings.categoryId,
                topic: `Order ${orderData.orderId} - ${serviceType} - ${budget}`,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: userId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.AttachFiles,
                        ],
                    },
                    {
                        id: config.ticketSettings.supportRoleId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                        ],
                    },
                ],
            });

            // Store order data
            this.activeTickets.set(userId, ticketChannel.id);
            this.orderData.set(ticketChannel.id, orderData);
            this.saveTickets();
            this.saveOrders();

            // Create comprehensive order embed
            const orderEmbed = new EmbedBuilder()
                .setTitle(`Order Confirmed - ${orderData.orderId}`)
                .setDescription(`**${displayName}**, your order has been received and is being reviewed by our team.`)
                .addFields([
                    { name: 'Service Type', value: `\`${orderData.serviceType}\``, inline: true },
                    { name: 'Quantity/Amount', value: `\`${orderData.quantity}\``, inline: true },
                    { name: 'Budget', value: `\`${orderData.budget}\``, inline: true },
                    { name: 'Timeline', value: `\`${orderData.urgency}\``, inline: true },
                    { name: 'Status', value: 'Pending Review', inline: true },
                    { name: 'Order ID', value: orderData.orderId, inline: true },
                    { name: 'Detailed Requirements', value: `\`\`\`${orderData.details.slice(0, 800)}\`\`\``, inline: false },
                    { name: 'Payment Methods Accepted', value: 'PayPal (USD/PHP) • GCash (Philippines) • Automatic currency conversion', inline: false },
                    { name: 'What happens next?', value: '1. Staff will review your requirements\n2. You\'ll receive exact pricing\n3. Upon agreement, work begins\n4. You\'ll get progress updates\n5. Delivery upon completion', inline: false }
                ])
                .setColor(config.colors.warning)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Ordered by ${interaction.user.tag} • PayPal & GCash accepted` })
                .setTimestamp();

            const orderButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Cancel Order')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌'),
                    new ButtonBuilder()
                        .setCustomId('claim_order')
                        .setLabel('Claim Order')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✋')
                );

            await ticketChannel.send({ 
                content: `${interaction.user} <@&${config.ticketSettings.supportRoleId}>`,
                embeds: [orderEmbed], 
                components: [orderButtons] 
            });

            // Send notifications and updates
            await this.sendOrderNotification(orderData, ticketChannel);
            await this.updateOngoingOrders();
            await this.saveOrderToDatabase(orderData);
            await this.logOrderAction('created', interaction.user, ticketChannel, orderData);

            // Success response
            await interaction.editReply({
                content: `Order placed successfully! ${ticketChannel}\n\n**Service:** ${orderData.serviceType}\n**Budget:** ${orderData.budget}\n**Timeline:** ${orderData.urgency}\n**Order ID:** ${orderData.orderId}\n\n**Payment Methods:** PayPal (USD/PHP) & GCash (PHP)\n**Next Step:** Our team will review and provide exact pricing!`,
            });

        } catch (error) {
            console.error('Error creating order:', error);
            await interaction.editReply({
                content: 'There was an error processing your order. Please try again or contact an administrator.\n\n**Common issues:**\n• Category not configured\n• Missing bot permissions\n• Server capacity limits\n\nPlease contact support if this continues.'
            });
        }
    }

    calculateEstimatedCompletion(urgency) {
        const now = Date.now();
        switch (urgency.toLowerCase()) {
            case 'asap':
            case 'urgent':
            case 'immediately':
                return now + (2 * 60 * 60 * 1000);
            case 'today':
            case 'within 24 hours':
                return now + (24 * 60 * 60 * 1000);
            case 'this weekend':
            case 'weekend':
                return now + (3 * 24 * 60 * 60 * 1000);
            case 'this week':
            case 'within a week':
                return now + (7 * 24 * 60 * 60 * 1000);
            case 'no rush':
            case 'flexible':
            case 'whenever':
                return now + (14 * 24 * 60 * 60 * 1000);
            default:
                return now + (3 * 24 * 60 * 60 * 1000);
        }
    }

    async saveOrderToDatabase(orderData) {
        try {
            await database.saveOrder(orderData);
            return true;
        } catch (error) {
            console.error('Failed to save order to database:', error);
            try {
                this.saveOrders();
                return true;
            } catch (fileError) {
                console.error('Failed to save order to file:', fileError);
                return false;
            }
        }
    }

    async claimOrder(interaction) {
        if (!interaction.channel.name.startsWith('order-')) {
            return await interaction.reply({
                content: 'This command can only be used in order channels.',
                ephemeral: true
            });
        }

        const orderData = this.orderData.get(interaction.channel.id);
        if (!orderData) {
            return await interaction.reply({
                content: 'Order data not found.',
                ephemeral: true
            });
        }

        // Update order data
        orderData.status = 'processing';
        orderData.claimedBy = interaction.user;
        orderData.claimedAt = Date.now();
        this.saveOrders();

        const claimEmbed = new EmbedBuilder()
            .setTitle('Order Claimed!')
            .setDescription(`**${interaction.user.displayName}** has claimed this order and will handle it personally.`)
            .addFields([
                { name: 'Order ID', value: orderData.orderId, inline: true },
                { name: 'Claimed By', value: `${interaction.user}`, inline: true },
                { name: 'Status', value: 'Processing', inline: true }
            ])
            .setColor(config.colors.primary)
            .setTimestamp();

        const completionButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mark_completed')
                    .setLabel('Mark as Completed')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Cancel Order')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await interaction.reply({ embeds: [claimEmbed], components: [completionButton] });

        // Update channel name to show who claimed it
        try {
            const newName = `${interaction.channel.name}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
            await interaction.channel.setName(newName);
        } catch (error) {
            console.error('Error updating channel name:', error);
        }

        await this.sendOrderUpdate(orderData, 'claimed', interaction.user);
        await this.updateOngoingOrders();
        await database.saveOrder(orderData);
        await this.logOrderAction('claimed', interaction.user, interaction.channel, orderData);
    }

    async markOrderCompleted(interaction) {
        if (!interaction.channel.name.includes('order-')) {
            return await interaction.reply({
                content: 'This command can only be used in order channels.',
                ephemeral: true
            });
        }

        const orderData = this.orderData.get(interaction.channel.id);
        if (!orderData) {
            return await interaction.reply({
                content: 'Order data not found.',
                ephemeral: true
            });
        }

        // Update order data
        orderData.status = 'completed';
        orderData.completedBy = interaction.user;
        orderData.completedAt = Date.now();
        this.saveOrders();

        const completedEmbed = new EmbedBuilder()
            .setTitle('Order Completed!')
            .setDescription(`**${orderData.serviceType}** has been completed successfully!\n\n**Thank you for your business!**`)
            .addFields([
                { name: 'Order ID', value: orderData.orderId, inline: true },
                { name: 'Customer', value: `${orderData.customer}`, inline: true },
                { name: 'Completed By', value: `${interaction.user}`, inline: true },
                { name: 'Please Rate Us!', value: 'Consider leaving a review to help others!', inline: false }
            ])
            .setColor(config.colors.success)
            .setTimestamp();

        await interaction.reply({ embeds: [completedEmbed] });

        await this.sendOrderReceived(orderData, interaction.user);
        await this.updateOngoingOrders();
        await database.saveOrder(orderData);
        await this.logOrderAction('completed', interaction.user, interaction.channel, orderData);

        // Close channel after delay
        setTimeout(async () => {
            try {
                await interaction.followUp({ content: '**Order completed!** This channel will be deleted in 10 seconds...' });
                setTimeout(async () => {
                    for (const [userId, channelId] of this.activeTickets.entries()) {
                        if (channelId === interaction.channel.id) {
                            this.activeTickets.delete(userId);
                            break;
                        }
                    }
                    this.orderData.delete(interaction.channel.id);
                    this.saveTickets();
                    this.saveOrders();
                    await interaction.channel.delete();
                }, 10000);
            } catch (error) {
                console.error('Error deleting order channel:', error);
            }
        }, 5000);
    }

    async sendOrderNotification(orderData, ticketChannel) {
        const ordersChannel = this.client.channels.cache.get(config.ticketSettings.ordersChannelId);
        if (!ordersChannel) return;

        const notificationEmbed = new EmbedBuilder()
            .setTitle('New Order Received!')
            .setDescription(`**${orderData.customer.displayName}** has placed a new order!`)
            .addFields([
                { name: 'Customer', value: `${orderData.customer}`, inline: true },
                { name: 'Order ID', value: orderData.orderId, inline: true },
                { name: 'Date', value: `<t:${Math.floor(orderData.createdAt / 1000)}:F>`, inline: true },
                { name: 'Service', value: `\`${orderData.serviceType}\``, inline: true },
                { name: 'Quantity', value: `\`${orderData.quantity}\``, inline: true },
                { name: 'Budget', value: `\`${orderData.budget}\``, inline: true },
                { name: 'Urgency', value: `\`${orderData.urgency}\``, inline: true },
                { name: 'Status', value: 'Pending', inline: true },
                { name: 'Channel', value: `${ticketChannel}`, inline: true },
                { name: 'Details', value: `\`\`\`${orderData.details.slice(0, 200)}${orderData.details.length > 200 ? '...' : ''}\`\`\``, inline: false }
            ])
            .setColor(config.colors.warning)
            .setThumbnail(orderData.customer.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Order System • ${orderData.customer.tag} • PayPal & GCash accepted` })
            .setTimestamp();

        try {
            await ordersChannel.send({ embeds: [notificationEmbed] });
        } catch (error) {
            console.error('Error sending order notification:', error);
        }
    }

    async sendOrderUpdate(orderData, action, user) {
        const ordersChannel = this.client.channels.cache.get(config.ticketSettings.ordersChannelId);
        if (!ordersChannel) return;

        if (action === 'claimed') {
            const ordersDoneEmbed = new EmbedBuilder()
                .setTitle('Order Claimed & In Progress')
                .setDescription(`Order ${orderData.orderId} has been claimed and is now being processed!`)
                .addFields([
                    { name: 'Customer', value: `${orderData.customer}`, inline: true },
                    { name: 'Order ID', value: orderData.orderId, inline: true },
                    { name: 'Claimed By', value: `${user}`, inline: true },
                    { name: 'Service', value: `${orderData.serviceType}`, inline: true },
                    { name: 'Budget', value: `${orderData.budget}`, inline: true },
                    { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: 'Status', value: 'Being Processed', inline: false }
                ])
                .setColor(config.colors.primary)
                .setThumbnail(orderData.customer.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            try {
                await ordersChannel.send({ embeds: [ordersDoneEmbed] });
            } catch (error) {
                console.error('Error sending claimed order update:', error);
            }
            return;
        }

        const statusEmojis = {
            'processing': '🔵',
            'completed': '🟢',
            'cancelled': '🔴'
        };

        const updateEmbed = new EmbedBuilder()
            .setTitle(`Order ${action.charAt(0).toUpperCase() + action.slice(1)}`)
            .setDescription(`Order ${orderData.orderId} has been ${action}`)
            .addFields([
                { name: 'Customer', value: `${orderData.customer}`, inline: true },
                { name: 'Order ID', value: orderData.orderId, inline: true },
                { name: 'Status', value: `${statusEmojis[action]} **${action.charAt(0).toUpperCase() + action.slice(1)}**`, inline: true },
                { name: 'Staff Member', value: `${user}`, inline: true },
                { name: 'Updated', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                { name: 'Service', value: `${orderData.serviceType}`, inline: true }
            ])
            .setColor(action === 'completed' ? config.colors.success : config.colors.primary)
            .setThumbnail(orderData.customer.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        try {
            await ordersChannel.send({ embeds: [updateEmbed] });
        } catch (error) {
            console.error('Error sending order update:', error);
        }
    }

    async sendOrderReceived(orderData, completedBy) {
        const receivedChannel = this.client.channels.cache.get(config.ticketSettings.receivedChannelId);
        if (!receivedChannel) return;

        const receivedEmbed = new EmbedBuilder()
            .setTitle('Order Delivered!')
            .setDescription(`**${orderData.serviceType}** has been successfully completed and delivered!`)
            .addFields([
                { name: 'Customer', value: `${orderData.customer}`, inline: true },
                { name: 'Order ID', value: orderData.orderId, inline: true },
                { name: 'Completed By', value: `${completedBy}`, inline: true },
                { name: 'Service', value: `\`${orderData.serviceType}\``, inline: true },
                { name: 'Quantity', value: `\`${orderData.quantity}\``, inline: true },
                { name: 'Budget', value: `\`${orderData.budget}\``, inline: true },
                { name: 'Completion Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                { name: 'Success!', value: 'Another satisfied customer!', inline: false }
            ])
            .setColor(config.colors.success)
            .setThumbnail(orderData.customer.displayAvatarURL({ dynamic: true }))
            .setImage('https://via.placeholder.com/400x100/00ff00/ffffff?text=ORDER+COMPLETED+SUCCESSFULLY!')
            .setFooter({ text: `Order completed by ${completedBy.tag} • PayPal & GCash accepted` })
            .setTimestamp();

        try {
            await receivedChannel.send({ embeds: [receivedEmbed] });
        } catch (error) {
            console.error('Error sending order received notification:', error);
        }
    }

    async updateOngoingOrders() {
        const ongoingChannel = this.client.channels.cache.get(config.ticketSettings.ongoingChannelId);
        if (!ongoingChannel) return;

        const pendingOrders = Array.from(this.orderData.values())
            .filter(order => order.status === 'pending')
            .sort((a, b) => a.createdAt - b.createdAt);

        if (pendingOrders.length === 0) {
            const noOrdersEmbed = new EmbedBuilder()
                .setTitle('Ongoing Orders')
                .setDescription('**No pending orders!** All orders have been claimed by staff!')
                .setColor(config.colors.success)
                .setTimestamp();

            try {
                const messages = await ongoingChannel.messages.fetch({ limit: 10 });
                await ongoingChannel.bulkDelete(messages).catch(() => {});
                await ongoingChannel.send({ embeds: [noOrdersEmbed] });
            } catch (error) {
                console.error('Error updating ongoing orders:', error);
            }
            return;
        }

        const ongoingEmbed = new EmbedBuilder()
            .setTitle('Ongoing Orders (Unclaimed)')
            .setDescription(`**${pendingOrders.length} orders** waiting to be claimed by staff`)
            .setColor(config.colors.warning)
            .setTimestamp()
            .setFooter({ text: `Last updated • ${pendingOrders.length} unclaimed orders • PayPal & GCash accepted` });

        pendingOrders.slice(0, 10).forEach((order, index) => {
            const timeAgo = `<t:${Math.floor(order.createdAt / 1000)}:R>`;
            
            ongoingEmbed.addFields([
                {
                    name: `${order.orderId} - ${order.serviceType}`,
                    value: `**Customer:** ${order.customer.displayName}\n**Budget:** ${order.budget} • **Urgency:** ${order.urgency}\n**Created:** ${timeAgo} • **Status:** Waiting for staff`,
                    inline: false
                }
            ]);
        });

        if (pendingOrders.length > 10) {
            ongoingEmbed.addFields([
                { name: 'More Orders', value: `... and ${pendingOrders.length - 10} more orders waiting`, inline: false }
            ]);
        }

        try {
            const messages = await ongoingChannel.messages.fetch({ limit: 10 });
            await ongoingChannel.bulkDelete(messages).catch(() => {});
            await ongoingChannel.send({ embeds: [ongoingEmbed] });
        } catch (error) {
            console.error('Error updating ongoing orders:', error);
        }
    }

    async closeTicket(interaction) {
        if (!interaction.channel.name.includes('order-')) {
            return await interaction.reply({
                content: 'This command can only be used in order channels.',
                ephemeral: true
            });
        }

        const orderData = this.orderData.get(interaction.channel.id);
        const isStaff = interaction.user.id === config.ownerId || 
                       config.adminIds.includes(interaction.user.id) ||
                       interaction.member.roles.cache.has(config.ticketSettings.supportRoleId);

        let embed = new EmbedBuilder()
            .setTitle('Cancel Order')
            .setDescription('Are you sure you want to cancel this order?\nThis action cannot be undone.')
            .setColor(config.colors.warning);

        if (orderData) {
            embed.addFields([
                { name: 'Order ID', value: orderData.orderId, inline: true },
                { name: 'Service', value: orderData.serviceType, inline: true },
                { name: 'Status', value: orderData.status, inline: true }
            ]);
        }

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('Yes, Cancel Order')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_close')
                    .setLabel('Keep Order Active')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        if (isStaff && orderData?.status === 'cancelled') {
            confirmButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('reopen_order')
                    .setLabel('Reopen Order')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔄')
            );
        }

        await interaction.reply({ embeds: [embed], components: [confirmButtons] });
    }

    async finalizeTicketClose(interaction) {
        await interaction.deferUpdate();

        const orderData = this.orderData.get(interaction.channel.id);

        for (const [userId, channelId] of this.activeTickets.entries()) {
            if (channelId === interaction.channel.id) {
                this.activeTickets.delete(userId);
                break;
            }
        }
        
        if (orderData) {
            orderData.status = 'cancelled';
            orderData.cancelledBy = interaction.user;
            orderData.cancelledAt = Date.now();
            await database.saveOrder(orderData);
        }
        
        this.orderData.delete(interaction.channel.id);
        this.saveTickets();
        this.saveOrders();

        await this.updateOngoingOrders();

        if (orderData) {
            await this.logOrderAction('cancelled', interaction.user, interaction.channel, orderData);
        }

        const closedEmbed = new EmbedBuilder()
            .setTitle('Order Cancelled')
            .setDescription(`Order cancelled by ${interaction.user}\n\nChannel will be deleted in 10 seconds...`)
            .setColor(config.colors.error)
            .setTimestamp();

        await interaction.editReply({ embeds: [closedEmbed], components: [] });

        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error('Error deleting order channel:', error);
            }
        }, 10000);
    }
}

module.exports = new TicketSystem();
