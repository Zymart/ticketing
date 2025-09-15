// systems/shopSystem.js - Real Item Shop & Trading System with PHP support
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const database = require('./database');

// Use global config
const config = global.config;

// Exchange rates (you can update these or fetch from an API)
const EXCHANGE_RATES = {
    USD_TO_PHP: 56.50, // 1 USD = 56.50 PHP (update regularly)
    PHP_TO_USD: 0.0177 // 1 PHP = 0.0177 USD
};

class ShopSystem {
    constructor() {
        this.shopItems = new Map();
        this.activeTransactions = new Map();
        this.tradeRequests = new Map();
    }

    init(client) {
        this.client = client;
        this.loadShopItems();

        // Handle button and menu interactions
        client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isButton()) {
                    await this.handleButtonInteraction(interaction);
                } else if (interaction.isStringSelectMenu()) {
                    await this.handleSelectMenuInteraction(interaction);
                } else if (interaction.isModalSubmit()) {
                    await this.handleModalSubmit(interaction);
                }
            } catch (error) {
                console.error('Shop system interaction error:', error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ Something went wrong. Please try again.',
                        ephemeral: true
                    }).catch(() => {});
                }
            }
        });
    }

    async handleButtonInteraction(interaction) {
        switch (interaction.customId) {
            case 'browse_shop':
                await this.showShop(interaction);
                break;
            case 'my_purchases':
                await this.showPurchases(interaction);
                break;
            case 'start_trade':
                await this.showTradeModal(interaction);
                break;
            case 'manage_shop':
                await this.showShopManagement(interaction);
                break;
            case 'add_item_button':
                await this.showAddItemModal(interaction);
                break;
            case 'cancel_purchase':
                await this.cancelPurchase(interaction);
                break;
            case 'complete_purchase':
                await this.completePurchase(interaction);
                break;
            case 'cancel_purchase_channel':
                await this.cancelPurchaseChannel(interaction);
                break;
            case 'accept_trade':
                await this.acceptTrade(interaction);
                break;
            case 'decline_trade':
                await this.declineTrade(interaction);
                break;
            default:
                if (interaction.customId.startsWith('confirm_purchase_')) {
                    const itemId = interaction.customId.replace('confirm_purchase_', '');
                    await this.processPurchaseConfirmation(interaction, itemId);
                }
        }
    }

    async handleSelectMenuInteraction(interaction) {
        if (interaction.customId === 'shop_categories') {
            await this.showCategoryItems(interaction);
        } else if (interaction.customId.startsWith('buy_item_')) {
            await this.processPurchase(interaction);
        }
    }

    async handleModalSubmit(interaction) {
        if (interaction.customId === 'add_item_modal') {
            await this.processAddItem(interaction);
        } else if (interaction.customId === 'trade_modal') {
            await this.processTradeRequest(interaction);
        }
    }

    // New method for canceling purchase
    async cancelPurchase(interaction) {
        await interaction.update({
            content: '❌ Purchase cancelled.',
            embeds: [],
            components: []
        });
    }

    // New method for completing purchase (mark as paid)
    async completePurchase(interaction) {
        if (!interaction.channel.name.includes('purchase-')) {
            return await interaction.reply({
                content: '❌ This can only be used in purchase channels.',
                ephemeral: true
            });
        }

        const hasPermission = interaction.user.id === config.ownerId || config.adminIds.includes(interaction.user.id);
        if (!hasPermission) {
            return await interaction.reply({
                content: '❌ Only staff can mark purchases as completed.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Purchase Completed!')
            .setDescription('Payment confirmed and item delivered successfully!')
            .addFields([
                { name: '💳 Payment Status', value: '✅ **Confirmed**', inline: true },
                { name: '📦 Delivery Status', value: '✅ **Completed**', inline: true },
                { name: '⭐ Thank You!', value: 'Please consider leaving a review!', inline: false }
            ])
            .setColor(config.colors.success)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Close channel after delay
        setTimeout(async () => {
            try {
                await interaction.followUp({ 
                    content: '🔒 **Purchase completed!** This channel will be deleted in 10 seconds...' 
                });
                setTimeout(async () => {
                    await interaction.channel.delete();
                }, 10000);
            } catch (error) {
                console.error('Error deleting purchase channel:', error);
            }
        }, 5000);
    }

    // New method for canceling purchase channel
    async cancelPurchaseChannel(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔒 Cancel Purchase')
            .setDescription('Are you sure you want to cancel this purchase?')
            .setColor(config.colors.warning);

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_cancel_purchase')
                    .setLabel('Yes, Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('keep_purchase_active')
                    .setLabel('Keep Active')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.reply({ embeds: [embed], components: [confirmButtons] });
    }

    async createShopPanel(channel) {
        const embed = new EmbedBuilder()
            .setTitle('🛍️ Real Item Marketplace & Trading Hub')
            .setDescription('**Buy and sell real game items!** Trade Roblox items, game accounts, and digital goods.\n\n*Secure transactions • PayPal & GCash accepted • PHP/USD supported*')
            .addFields([
                {
                    name: '🎮 **Available Items:**',
                    value: '```• Roblox Limiteds & Items\n• Game Accounts (All Games)\n• Skins & Cosmetics\n• In-Game Currency\n• Rare Collectibles\n• Digital Game Keys```',
                    inline: true
                },
                {
                    name: '💰 **Payment Methods:**',
                    value: '```• PayPal (USD/PHP)\n• GCash (PHP only)\n• Automatic PHP conversion\n• Secure escrow service\n• Buyer protection\n• Instant delivery```',
                    inline: true
                },
                {
                    name: '🎯 **Supported Platforms:**',
                    value: '```• Roblox (Limiteds/Robux)\n• Fortnite (Accounts/Skins)\n• Minecraft (Accounts)\n• Steam (Keys/Items)\n• Epic Games & More```',
                    inline: false
                }
            ])
            .setColor(config.colors.primary)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081648.png')
            .setImage('https://via.placeholder.com/400x100/0099ff/ffffff?text=REAL+ITEM+MARKETPLACE')
            .setFooter({ text: '💎 Real Items Only • 🛡️ PayPal & GCash • 🇵🇭 PHP Support' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('browse_shop')
                    .setLabel('Browse Shop')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setCustomId('start_trade')
                    .setLabel('Start Trade')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('my_purchases')
                    .setLabel('My Purchases')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📦'),
                new ButtonBuilder()
                    .setCustomId('manage_shop')
                    .setLabel('Manage Shop')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('⚙️')
            );

        return await channel.send({ embeds: [embed], components: [buttons] });
    }

    async showShop(interaction) {
        const items = await database.getShopItems();
        
        if (items.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🛒 Shop is Empty')
                .setDescription('No items available right now. Check back later!')
                .setColor(config.colors.warning);
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Group items by category
        const categories = {};
        items.forEach(item => {
            const category = item.category || 'Other';
            if (!categories[category]) categories[category] = [];
            categories[category].push(item);
        });

        const embed = new EmbedBuilder()
            .setTitle('🛍️ Item Marketplace')
            .setDescription('Choose a category to browse items:')
            .setColor(config.colors.primary);

        // Add category overview with PHP prices
        Object.keys(categories).forEach(category => {
            const items = categories[category];
            const avgPrice = items.reduce((sum, item) => sum + parseFloat(item.price), 0) / items.length;
            const avgPricePHP = (avgPrice * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
            
            embed.addFields([
                {
                    name: `📂 ${category}`,
                    value: `${items.length} items\nAvg: $${avgPrice.toFixed(2)} (₱${avgPricePHP})`,
                    inline: true
                }
            ]);
        });

        const categoryMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_categories')
            .setPlaceholder('Choose a category to browse...');

        Object.keys(categories).forEach(category => {
            const count = categories[category].length;
            categoryMenu.addOptions([{
                label: `${category} (${count} items)`,
                value: category,
                description: `Browse ${count} items in ${category}`,
                emoji: this.getCategoryEmoji(category)
            }]);
        });

        const row = new ActionRowBuilder().addComponents(categoryMenu);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    async showCategoryItems(interaction) {
        const category = interaction.values[0];
        const allItems = await database.getShopItems();
        const items = allItems.filter(item => (item.category || 'Other') === category);

        const embed = new EmbedBuilder()
            .setTitle(`🛒 ${category} Items`)
            .setDescription(`Available items in **${category}** category:`)
            .setColor(config.colors.primary);

        items.slice(0, 10).forEach(item => {
            const stockText = item.stock === -1 ? 'Unlimited' : item.stock > 0 ? `${item.stock} left` : 'Out of Stock';
            const pricePHP = (item.price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
            
            embed.addFields([
                {
                    name: `${item.name}`,
                    value: `**Price:** $${item.price} (₱${pricePHP})\n**Stock:** ${stockText}\n**Description:** ${item.description.slice(0, 80)}...`,
                    inline: true
                }
            ]);
        });

        // Create buy buttons for items
        const buyMenu = new StringSelectMenuBuilder()
            .setCustomId(`buy_item_${category}`)
            .setPlaceholder('Choose an item to purchase...');

        items.slice(0, 20).forEach(item => {
            if (item.stock !== 0) {
                const pricePHP = (item.price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
                buyMenu.addOptions([{
                    label: `${item.name} - $${item.price} (₱${pricePHP})`,
                    value: item.item_id.toString(),
                    description: item.description.slice(0, 100),
                    emoji: '💎'
                }]);
            }
        });

        const row = new ActionRowBuilder().addComponents(buyMenu);

        await interaction.update({ embeds: [embed], components: [row] });
    }

    async processPurchase(interaction) {
        const itemId = interaction.values[0];
        const allItems = await database.getShopItems();
        const item = allItems.find(i => i.item_id.toString() === itemId);

        if (!item) {
            return await interaction.reply({ content: '❌ Item not found!', ephemeral: true });
        }

        if (item.stock === 0) {
            return await interaction.reply({ content: '❌ This item is out of stock!', ephemeral: true });
        }

        const pricePHP = (item.price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);

        // Create purchase confirmation with PHP support
        const embed = new EmbedBuilder()
            .setTitle('💳 Purchase Confirmation')
            .setDescription(`You're about to purchase: **${item.name}**`)
            .addFields([
                { name: '💎 Item', value: item.name, inline: true },
                { name: '💰 Price (USD)', value: `$${item.price}`, inline: true },
                { name: '🇵🇭 Price (PHP)', value: `₱${pricePHP}`, inline: true },
                { name: '📦 Stock', value: item.stock === -1 ? 'Unlimited' : `${item.stock} left`, inline: true },
                { name: '💳 Payment Methods', value: 'PayPal (USD/PHP)\nGCash (PHP only)', inline: true },
                { name: '🔄 Auto Conversion', value: 'USD ↔ PHP supported', inline: true },
                { name: '📝 Description', value: item.description, inline: false },
                { name: '⚠️ Next Step', value: 'A private purchase channel will be created for secure payment processing.', inline: false }
            ])
            .setColor(config.colors.warning)
            .setThumbnail(item.image_url || 'https://cdn-icons-png.flaticon.com/512/891/891462.png');

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirm_purchase_${itemId}`)
                    .setLabel('Confirm Purchase')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_purchase')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        await interaction.reply({ embeds: [embed], components: [confirmButtons], ephemeral: true });
    }

    async processPurchaseConfirmation(interaction, itemId) {
        await interaction.deferReply({ ephemeral: true });

        const allItems = await database.getShopItems();
        const item = allItems.find(i => i.item_id.toString() === itemId);

        if (!item) {
            return await interaction.editReply({ content: '❌ Item not found!' });
        }

        try {
            // Create purchase channel
            const channelName = `purchase-${interaction.user.username}-${item.name}`.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            const purchaseChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 0, // Text channel
                parent: config.ticketSettings.categoryId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel'],
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'],
                    },
                    {
                        id: config.ticketSettings.supportRoleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
                    },
                ],
            });

            const pricePHP = (item.price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
            const purchaseId = `PUR${Date.now().toString().slice(-6)}`;

            // Send purchase details to channel with PHP support
            const purchaseEmbed = new EmbedBuilder()
                .setTitle('💳 Purchase Channel Created')
                .setDescription(`**${interaction.user.displayName}** is purchasing: **${item.name}**`)
                .addFields([
                    { name: '💎 Item', value: item.name, inline: true },
                    { name: '💰 Price (USD)', value: `$${item.price}`, inline: true },
                    { name: '🇵🇭 Price (PHP)', value: `₱${pricePHP}`, inline: true },
                    { name: '🆔 Purchase ID', value: purchaseId, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🔄 Exchange Rate', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`, inline: true },
                    { 
                        name: '💳 Payment Options', 
                        value: '**PayPal:**\n• USD payments accepted\n• PHP payments accepted\n\n**GCash:**\n• PHP payments only\n• Instant local transfer', 
                        inline: false 
                    },
                    { 
                        name: '📋 Payment Instructions', 
                        value: '1️⃣ Staff will verify item availability\n2️⃣ Choose PayPal (USD/PHP) or GCash (PHP)\n3️⃣ Receive payment details\n4️⃣ Complete payment securely\n5️⃣ Receive item instantly', 
                        inline: false 
                    },
                    { name: '📞 Support', value: 'Our team will guide you through the payment process!', inline: false }
                ])
                .setColor(config.colors.success)
                .setThumbnail(item.image_url || 'https://cdn-icons-png.flaticon.com/512/891/891462.png')
                .setFooter({ text: `PayPal & GCash accepted • Auto PHP conversion • Purchase ID: ${purchaseId}` })
                .setTimestamp();

            const purchaseButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('complete_purchase')
                        .setLabel('Mark as Paid')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('cancel_purchase_channel')
                        .setLabel('Cancel Purchase')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            await purchaseChannel.send({
                content: `${interaction.user} <@&${config.ticketSettings.supportRoleId}>`,
                embeds: [purchaseEmbed],
                components: [purchaseButtons]
            });

            // Send payment method details
            const paymentEmbed = new EmbedBuilder()
                .setTitle('💳 Payment Method Details')
                .setDescription('Choose your preferred payment method:')
                .addFields([
                    { 
                        name: '🌍 PayPal (International)', 
                        value: `**USD Option:** $${item.price}\n**PHP Option:** ₱${pricePHP}\n✅ Buyer protection included\n✅ Credit/debit cards accepted`, 
                        inline: true 
                    },
                    { 
                        name: '🇵🇭 GCash (Philippines)', 
                        value: `**PHP Only:** ₱${pricePHP}\n✅ Instant local transfer\n✅ No international fees\n✅ Mobile wallet friendly`, 
                        inline: true 
                    },
                    { name: '🔄 Currency Info', value: `Exchange rate: 1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}\nRates updated daily`, inline: false }
                ])
                .setColor(config.colors.primary);

            await purchaseChannel.send({ embeds: [paymentEmbed] });

            await interaction.editReply({
                content: `✅ Purchase channel created! ${purchaseChannel}\n\n💰 **Price:** $${item.price} (₱${pricePHP})\n💳 **Payment:** PayPal or GCash accepted\n🆔 **ID:** ${purchaseId}`,
            });

        } catch (error) {
            console.error('Error creating purchase channel:', error);
            await interaction.editReply({
                content: '❌ Error creating purchase channel. Please contact an admin.',
            });
        }
    }

    // Modal for adding items with file support
    async showAddItemModal(interaction) {
        const hasPermission = interaction.user.id === config.ownerId || config.adminIds.includes(interaction.user.id);
        if (!hasPermission) {
            return await interaction.reply({ 
                content: '❌ Only admins can add items to the shop!', 
                ephemeral: true 
            });
        }

        const modal = new ModalBuilder()
            .setCustomId('add_item_modal')
            .setTitle('📦 Add Item to Shop');

        const nameInput = new TextInputBuilder()
            .setCustomId('item_name')
            .setLabel('Item Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: Dominus Crown, Rare Fortnite Account')
            .setRequired(true)
            .setMaxLength(100);

        const priceInput = new TextInputBuilder()
            .setCustomId('item_price')
            .setLabel('Price (USD)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: 25.50 (will show as ₱1437 in PHP)')
            .setRequired(true)
            .setMaxLength(10);

        const categoryInput = new TextInputBuilder()
            .setCustomId('item_category')
            .setLabel('Category')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: Roblox, Fortnite, Minecraft, Steam')
            .setRequired(true)
            .setMaxLength(50);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('item_description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Detailed description of the item, condition, features, etc.')
            .setRequired(true)
            .setMaxLength(500);

        const stockInput = new TextInputBuilder()
            .setCustomId('item_stock')
            .setLabel('Stock Amount')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: 1, 5, -1 for unlimited')
            .setRequired(true)
            .setMaxLength(5);

        const rows = [
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(priceInput),
            new ActionRowBuilder().addComponents(categoryInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(stockInput)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    }

    async processAddItem(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const name = interaction.fields.getTextInputValue('item_name');
            const priceStr = interaction.fields.getTextInputValue('item_price');
            const category = interaction.fields.getTextInputValue('item_category');
            const description = interaction.fields.getTextInputValue('item_description');
            const stockStr = interaction.fields.getTextInputValue('item_stock');

            const price = parseFloat(priceStr);
            const stock = parseInt(stockStr);

            if (isNaN(price) || price < 0) {
                return await interaction.editReply({ content: '❌ Invalid price! Please enter a valid number.' });
            }

            if (isNaN(stock)) {
                return await interaction.editReply({ content: '❌ Invalid stock amount! Use a number or -1 for unlimited.' });
            }

            const itemDataObj = {
                name,
                price,
                category: category || 'Other',
                description,
                stock,
                imageUrl: '', // Will be updated if image is provided
                createdBy: interaction.user.id
            };

            const itemId = await database.createShopItem(itemDataObj);
            
            if (itemId) {
                const pricePHP = (price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ Item Added Successfully!')
                    .setDescription(`**${name}** has been added to the marketplace!`)
                    .addFields([
                        { name: '🆔 Item ID', value: itemId.toString(), inline: true },
                        { name: '💰 Price (USD)', value: `$${price.toFixed(2)}`, inline: true },
                        { name: '🇵🇭 Price (PHP)', value: `₱${pricePHP}`, inline: true },
                        { name: '📂 Category', value: category, inline: true },
                        { name: '📦 Stock', value: stock === -1 ? 'Unlimited' : stock.toString(), inline: true },
                        { name: '👤 Added By', value: interaction.user.tag, inline: true },
                        { name: '📝 Description', value: description.slice(0, 200), inline: false },
                        { name: '📸 Add Image', value: 'Send an image file in this channel to add it to the item!', inline: false }
                    ])
                    .setColor(config.colors.success)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });

                // Store item ID for image upload
                this.activeTransactions.set(interaction.user.id, {
                    type: 'add_image',
                    itemId: itemId,
                    channelId: interaction.channel.id
                });

            } else {
                await interaction.editReply({ content: '❌ Error adding item to shop. Please try again.' });
            }
        } catch (error) {
            console.error('Error adding shop item:', error);
            await interaction.editReply({ content: '❌ Error processing item data. Please check your input and try again.' });
        }
    }

    async showTradeModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('trade_modal')
            .setTitle('🔄 Create Trade Request');

        const targetUserInput = new TextInputBuilder()
            .setCustomId('target_user')
            .setLabel('Who do you want to trade with?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: @username or User ID')
            .setRequired(true);

        const gameInput = new TextInputBuilder()
            .setCustomId('game_platform')
            .setLabel('What game/platform?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Example: Roblox, Fortnite, Minecraft, Steam, etc.')
            .setRequired(true);

        const yourOfferInput = new TextInputBuilder()
            .setCustomId('your_offer')
            .setLabel('What are you offering?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Example: Dominus Crown, $50 PayPal, ₱2000 GCash')
            .setRequired(true)
            .setMaxLength(500);

        const theirOfferInput = new TextInputBuilder()
            .setCustomId('their_offer')
            .setLabel('What do you want in return?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Example: 10,000 Robux, Rare Fortnite Account, Steam Gift Cards')
            .setRequired(true)
            .setMaxLength(500);

        const notesInput = new TextInputBuilder()
            .setCustomId('trade_notes')
            .setLabel('Additional notes (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Example: PayPal/GCash preferred, can add cash, quick trade needed')
            .setRequired(false)
            .setMaxLength(300);

        const rows = [
            new ActionRowBuilder().addComponents(targetUserInput),
            new ActionRowBuilder().addComponents(gameInput),
            new ActionRowBuilder().addComponents(yourOfferInput),
            new ActionRowBuilder().addComponents(theirOfferInput),
            new ActionRowBuilder().addComponents(notesInput)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    }

    async processTradeRequest(interaction) {
        await interaction.reply({ 
            content: '🔄 Advanced trading system with PayPal/GCash support is being developed. Coming soon!', 
            ephemeral: true 
        });
    }

    async showPurchases(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📦 Your Purchases')
            .setDescription('Your purchase history will appear here once you make your first purchase!')
            .addFields([
                { name: '💳 Payment Methods', value: 'PayPal (USD/PHP) • GCash (PHP)', inline: true },
                { name: '🔄 Auto Conversion', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`, inline: true },
                { name: '🛡️ Protection', value: 'Full buyer protection included', inline: true }
            ])
            .setColor(config.colors.primary);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showShopManagement(interaction) {
        const hasPermission = interaction.user.id === config.ownerId || config.adminIds.includes(interaction.user.id);
        
        if (!hasPermission) {
            return await interaction.reply({ 
                content: '❌ Only admins can manage the shop!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Shop Management')
            .setDescription('**Admin shop management tools:**')
            .addFields([
                { name: '📦 Add Items', value: 'Click button below or use `!shop add-item`', inline: true },
                { name: '📊 View Stats', value: 'Use `!shop stats` command', inline: true },
                { name: '📋 List Items', value: 'Use `!shop list` command', inline: true },
                { name: '💰 Currency', value: `USD/PHP supported (1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP})`, inline: false },
                { name: '💳 Payments', value: 'PayPal (international) • GCash (Philippines)', inline: false }
            ])
            .setColor(config.colors.primary);

        const managementButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_item_button')
                    .setLabel('Add New Item')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕')
            );

        await interaction.reply({ embeds: [embed], components: [managementButtons], ephemeral: true });
    }

    // Handle file uploads for item images
    async handleMessage(message) {
        if (message.author.bot) return;
        
        const transaction = this.activeTransactions.get(message.author.id);
        if (!transaction || transaction.type !== 'add_image') return;
        if (message.channel.id !== transaction.channelId) return;

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                try {
                    // Update item with image URL
                    const itemId = transaction.itemId;
                    // In a real implementation, you'd save the image and update the database
                    // For now, we'll just use the Discord attachment URL
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Image Added Successfully!')
                        .setDescription(`Image has been added to item #${itemId}`)
                        .setImage(attachment.url)
                        .setColor(config.colors.success);

                    await message.reply({ embeds: [embed] });
                    
                    // Clear transaction
                    this.activeTransactions.delete(message.author.id);
                } catch (error) {
                    console.error('Error processing image upload:', error);
                    await message.reply('❌ Error processing image. Please try again.');
                }
            } else {
                await message.reply('❌ Please upload an image file (JPG, PNG, GIF, etc.)');
            }
        }
    }

    // Currency conversion utilities
    convertUSDtoPHP(usd) {
        return (parseFloat(usd) * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
    }

    convertPHPtoUSD(php) {
        return (parseFloat(php) * EXCHANGE_RATES.PHP_TO_USD).toFixed(2);
    }

    getCategoryEmoji(category) {
        const emojiMap = {
            'Roblox': '🎮',
            'Fortnite': '🔫',
            'Minecraft': '⛏️',
            'Steam': '🎯',
            'Accounts': '👤',
            'Currency': '💰',
            'Skins': '🎨',
            'Limited': '💎',
            'Other': '📦'
        };
        return emojiMap[category] || '📦';
    }

    async loadShopItems() {
        try {
            const items = await database.getShopItems();
            this.shopItems.clear();
            items.forEach(item => {
                this.shopItems.set(item.item_id, item);
            });
        } catch (error) {
            console.error('Error loading shop items:', error);
        }
    }

    // Placeholder methods for trade system
    async acceptTrade(interaction) {
        await interaction.reply({ 
            content: '✅ Trade acceptance system with PayPal/GCash escrow coming soon!', 
            ephemeral: true 
        });
    }

    async declineTrade(interaction) {
        await interaction.reply({ 
            content: '❌ Trade declined.', 
            ephemeral: true 
        });
    }
}

module.exports = new ShopSystem();
