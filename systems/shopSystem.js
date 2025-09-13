// systems/shopSystem.js - Real Item Shop & Trading System
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const database = require('./database');

// Use global config
const config = global.config;

class ShopSystem {
    constructor() {
        this.shopItems = new Map();
        this.activeTransactions = new Map();
        this.tradeRequests = new Map();
    }

    init(client) {
        this.client = client;
        
        // Load shop items from database
        this.loadShopItems();

        // Handle button and menu interactions
        client.on('interactionCreate', async (interaction) => {
            if (interaction.isButton()) {
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
                    case 'add_item':
                        await this.showAddItemModal(interaction);
                        break;
                    case 'accept_trade':
                        await this.acceptTrade(interaction);
                        break;
                    case 'decline_trade':
                        await this.declineTrade(interaction);
                        break;
                }

                // Handle purchase confirmations
                if (interaction.customId.startsWith('confirm_purchase_')) {
                    const itemId = interaction.customId.replace('confirm_purchase_', '');
                    await this.processPurchaseConfirmation(interaction, itemId);
                }
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'shop_categories') {
                    await this.showCategoryItems(interaction);
                } else if (interaction.customId.startsWith('buy_item_')) {
                    await this.processPurchase(interaction);
                }
            }

            if (interaction.isModalSubmit()) {
                if (interaction.customId === 'add_item_modal') {
                    await this.processAddItem(interaction);
                } else if (interaction.customId === 'trade_modal') {
                    await this.processTradeRequest(interaction);
                }
            }
        });
    }

    async createShopPanel(channel) {
        const embed = new EmbedBuilder()
            .setTitle('🛍️ Real Item Marketplace & Trading Hub')
            .setDescription('**Buy and sell real game items!** Trade Roblox items, game accounts, and digital goods with real money.\n\n*Secure transactions • Real items • Trusted marketplace*')
            .addFields([
                {
                    name: '🎮 **Available Items:**',
                    value: '```• Roblox Limiteds & Items\n• Game Accounts (All Games)\n• Skins & Cosmetics\n• In-Game Currency\n• Rare Collectibles\n• Digital Game Keys```',
                    inline: true
                },
                {
                    name: '💰 **Trading System:**',
                    value: '```• Real Money Trading\n• Item-for-Item Trading\n• Secure Middleman Service\n• PayPal/Crypto Payments\n• Trade Protection\n• Reputation System```',
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
            .setFooter({ text: '💎 Real Items Only • 🛡️ Secure Trading • 💸 Fair Prices' });

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

        // Add category overview
        Object.keys(categories).forEach(category => {
            embed.addFields([
                {
                    name: `📂 ${category}`,
                    value: `${categories[category].length} items available`,
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
            embed.addFields([
                {
                    name: `${item.name} - $${item.price}`,
                    value: `${item.description}\n**Stock:** ${stockText}`,
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
                buyMenu.addOptions([{
                    label: `${item.name} - $${item.price}`,
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

        // Create purchase confirmation
        const embed = new EmbedBuilder()
            .setTitle('💳 Purchase Confirmation')
            .setDescription(`You're about to purchase: **${item.name}**`)
            .addFields([
                { name: '💎 Item', value: item.name, inline: true },
                { name: '💰 Price', value: `$${item.price}`, inline: true },
                { name: '📦 Stock', value: item.stock === -1 ? 'Unlimited' : `${item.stock} left`, inline: true },
                { name: '📝 Description', value: item.description, inline: false },
                { name: '⚠️ Important', value: 'This will create a private purchase channel where you can complete payment and receive your item.', inline: false }
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
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                    },
                    {
                        id: config.ticketSettings.supportRoleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
                    },
                ],
            });

            // Send purchase details to channel
            const purchaseEmbed = new EmbedBuilder()
                .setTitle('💳 Purchase Channel Created')
                .setDescription(`**${interaction.user.displayName}** is purchasing: **${item.name}**`)
                .addFields([
                    { name: '💎 Item', value: item.name, inline: true },
                    { name: '💰 Total Price', value: `$${item.price}`, inline: true },
                    { name: '🆔 Purchase ID', value: `#${Date.now().toString().slice(-6)}`, inline: true },
                    { name: '📋 Next Steps', value: '1️⃣ Staff will verify item availability\n2️⃣ You will receive payment instructions\n3️⃣ Complete payment via PayPal/Crypto\n4️⃣ Receive your item instantly', inline: false },
                    { name: '📞 Support', value: 'Our team will assist you with payment and delivery!', inline: false }
                ])
                .setColor(config.colors.success)
                .setThumbnail(item.image_url || 'https://cdn-icons-png.flaticon.com/512/891/891462.png')
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

            await interaction.editReply({
                content: `✅ Purchase channel created! ${purchaseChannel}`,
            });

        } catch (error) {
            console.error('Error creating purchase channel:', error);
            await interaction.editReply({
                content: '❌ Error creating purchase channel. Please contact an admin.',
            });
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
            .setPlaceholder('Example: Dominus Crown (Roblox Limited), $50 PayPal, Golden AK-47 Skin')
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
            .setPlaceholder('Example: Flexible on pricing, can add cash, looking for quick trade')
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
        // Implementation for trade request processing
        await interaction.reply({ 
            content: '🔄 Trade system is being developed. Coming soon!', 
            ephemeral: true 
        });
    }

    async showPurchases(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📦 Your Purchases')
            .setDescription('Your purchase history will appear here once you make your first purchase!')
            .setColor(config.colors.primary);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    async showShopManagement(interaction) {
        // Check if user has permission to manage shop
        const hasPermission = interaction.user.id === config.ownerId || config.adminIds.includes(interaction.user.id);
        
        if (!hasPermission) {
            return await interaction.reply({ 
                content: '❌ Only admins can manage the shop!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Shop Management')
            .setDescription('Use the `!shop` commands to manage the shop:\n\n• `!shop add-item` - Add new items\n• `!shop list` - View all items\n• `!shop stats` - View statistics')
            .setColor(config.colors.primary);

        await interaction.reply({ embeds: [embed], ephemeral: true });
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
}

module.exports = new ShopSystem();
