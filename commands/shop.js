// commands/shop.js - Shop management commands
const { EmbedBuilder } = require('discord.js');
const shopSystem = require('../systems/shopSystem');
const database = require('../systems/database');

// Use global config
const config = global.config;

// Helper function to check permissions
function hasPermission(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

module.exports = {
    name: 'shop',
    description: 'Shop management commands',
    
    async execute(message, args, client) {
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🛍️ Shop Commands')
                .setDescription('Available shop commands:')
                .addFields([
                    { name: '!shop panel [channel]', value: 'Create shop panel in current or specified channel', inline: false },
                    { name: '!shop add-item <details>', value: 'Add new item to shop (admins only)', inline: false },
                    { name: '!shop list', value: 'List all shop items', inline: false },
                    { name: '!shop remove <item-id>', value: 'Remove item from shop (admins only)', inline: false },
                    { name: '!shop stats', value: 'Show shop statistics', inline: false }
                ])
                .setColor(config.colors.primary);
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'panel':
                await this.createShopPanel(message, args[1]);
                break;
            case 'list':
                await this.listItems(message);
                break;
            case 'remove':
                await this.removeItem(message, args[1]);
                break;
            case 'stats':
                await this.showStats(message);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!shop` to see available commands.');
        }
    },

    async createShopPanel(message, channelArg) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can create shop panels.');
        }

        let channel = message.channel;
        if (channelArg) {
            const channelId = channelArg.replace(/[<>#]/g, '');
            try {
                channel = await message.guild.channels.fetch(channelId);
            } catch (error) {
                return message.reply('❌ Could not find that channel!');
            }
        }

        try {
            await shopSystem.createShopPanel(channel);
            message.reply(`✅ Shop panel has been created in ${channel}!`);
        } catch (error) {
            console.error('Error creating shop panel:', error);
            message.reply('❌ There was an error creating the shop panel.');
        }
    },

    async executeAddItem(message, itemData) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can add shop items.');
        }

        if (!itemData) {
            const embed = new EmbedBuilder()
                .setTitle('📦 Add New Shop Item')
                .setDescription('Please use the format:\n```!shop add-item <name> | <price> | <category> | <description> | <stock> | <image-url>```\n\n**Example:**\n```!shop add-item Dominus Crown | 150 | Roblox | Rare Roblox Limited item | 1 | https://example.com/image.png```\n\n**Categories:** Roblox, Fortnite, Minecraft, Steam, Accounts, Currency, Skins, Limited, Other\n**Stock:** Use -1 for unlimited stock')
                .setColor(config.colors.primary);

            return message.reply({ embeds: [embed] });
        }

        try {
            const parts = itemData.split(' | ');
            if (parts.length !== 6) {
                return message.reply('❌ Invalid format! Use: `name | price | category | description | stock | image-url`');
            }

            const [name, priceStr, category, description, stockStr, imageUrl] = parts.map(p => p.trim());
            const price = parseFloat(priceStr);
            const stock = parseInt(stockStr);

            if (isNaN(price) || price <= 0) {
                return message.reply('❌ Invalid price! Must be a positive number.');
            }

            if (isNaN(stock) || (stock < -1 || stock === 0)) {
                return message.reply('❌ Invalid stock! Use -1 for unlimited, or positive numbers for limited stock.');
            }

            const newItem = {
                name,
                description,
                price,
                category,
                stock,
                imageUrl,
                createdBy: message.author.id
            };

            const itemId = await database.createShopItem(newItem);

            if (itemId) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Item Added Successfully!')
                    .addFields([
                        { name: '📦 Name', value: name, inline: true },
                        { name: '💰 Price', value: `$${price}`, inline: true },
                        { name: '📂 Category', value: category, inline: true },
                        { name: '📊 Stock', value: stock === -1 ? 'Unlimited' : stock.toString(), inline: true },
                        { name: '🆔 Item ID', value: itemId.toString(), inline: true },
                        { name: '👤 Added By', value: message.author.displayName, inline: true },
                        { name: '📝 Description', value: description, inline: false }
                    ])
                    .setColor(config.colors.success)
                    .setTimestamp();

                if (imageUrl && imageUrl.startsWith('http')) {
                    embed.setThumbnail(imageUrl);
                }

                message.reply({ embeds: [embed] });
            } else {
                message.reply('❌ Error adding item to database.');
            }
        } catch (error) {
            console.error('Error adding shop item:', error);
            message.reply('❌ There was an error adding the item.');
        }
    },

    async listItems(message) {
        try {
            const items = await database.getShopItems();
            
            if (items.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🛒 Shop Items')
                    .setDescription('No items in the shop yet.')
                    .setColor(config.colors.warning);
                return message.reply({ embeds: [embed] });
            }

            // Group items by category
            const categories = {};
            items.forEach(item => {
                const cat = item.category || 'Other';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(item);
            });

            const embed = new EmbedBuilder()
                .setTitle('🛍️ Shop Items')
                .setDescription(`**${items.length} total items** across ${Object.keys(categories).length} categories`)
                .setColor(config.colors.primary);

            Object.keys(categories).forEach(category => {
                const categoryItems = categories[category];
                const itemList = categoryItems.slice(0, 5).map(item => {
                    const stockText = item.stock === -1 ? '∞' : item.stock;
                    return `**${item.name}** - $${item.price} (Stock: ${stockText})`;
                }).join('\n');

                const moreText = categoryItems.length > 5 ? `\n*...and ${categoryItems.length - 5} more items*` : '';

                embed.addFields([{
                    name: `${this.getCategoryEmoji(category)} ${category} (${categoryItems.length} items)`,
                    value: itemList + moreText,
                    inline: false
                }]);
            });

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error listing shop items:', error);
            message.reply('❌ Error retrieving shop items.');
        }
    },

    async removeItem(message, itemId) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can remove shop items.');
        }

        if (!itemId) {
            return message.reply('❌ Please provide an item ID! Example: `!shop remove 123`');
        }

        // Note: This would need to be implemented in the database module
        message.reply('🚧 Remove item functionality coming soon! For now, please manually remove items from the database.');
    },

    async showStats(message) {
        try {
            const items = await database.getShopItems();
            
            // Calculate statistics
            const totalItems = items.length;
            const categories = {};
            let totalValue = 0;
            let inStockItems = 0;

            items.forEach(item => {
                const cat = item.category || 'Other';
                categories[cat] = (categories[cat] || 0) + 1;
                totalValue += parseFloat(item.price);
                if (item.stock !== 0) inStockItems++;
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 Shop Statistics')
                .addFields([
                    { name: '📦 Total Items', value: totalItems.toString(), inline: true },
                    { name: '📂 Categories', value: Object.keys(categories).length.toString(), inline: true },
                    { name: '✅ In Stock', value: inStockItems.toString(), inline: true },
                    { name: '💰 Total Catalog Value', value: `$${totalValue.toFixed(2)}`, inline: true },
                    { name: '📈 Average Price', value: totalItems > 0 ? `$${(totalValue / totalItems).toFixed(2)}` : '$0.00', inline: true },
                    { name: '🔥 Most Popular Category', value: Object.keys(categories).length > 0 ? Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b) : 'None', inline: true }
                ])
                .setColor(config.colors.primary)
                .setTimestamp();

            // Add category breakdown
            if (Object.keys(categories).length > 0) {
                const categoryBreakdown = Object.keys(categories)
                    .sort((a, b) => categories[b] - categories[a])
                    .slice(0, 8)
                    .map(cat => `**${cat}:** ${categories[cat]} items`)
                    .join('\n');

                embed.addFields([{
                    name: '📂 Category Breakdown',
                    value: categoryBreakdown,
                    inline: false
                }]);
            }

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error getting shop stats:', error);
            message.reply('❌ Error retrieving shop statistics.');
        }
    },

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
};
