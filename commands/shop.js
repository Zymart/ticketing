// commands/shop.js - Complete shop management system
const { EmbedBuilder } = require('discord.js');
const database = require('../systems/database');

// Use global config
const config = global.config;

// Helper function to check permissions
function hasPermission(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

module.exports = {
    name: 'shop',
    description: 'Complete shop management and item trading system',
    
    async execute(message, args, client) {
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🛍️ Real Item Marketplace & Shop System')
                .setDescription('**Professional item trading and shop management!**')
                .addFields([
                    { 
                        name: '🎛️ **Panel Management**', 
                        value: '`!shop panel [channel]` - Create shop panel\n`!shop preview` - Preview shop layout\n`!shop stats` - View shop statistics', 
                        inline: false 
                    },
                    { 
                        name: '📦 **Item Management** (Admins Only)', 
                        value: '`!shop add-item Name | Price | Category | Description | Stock | URL`\n`!shop list` - View all items\n`!shop remove <item_id>` - Remove item\n`!shop edit <item_id>` - Edit item details', 
                        inline: false 
                    },
                    { 
                        name: '🏪 **Category Management**', 
                        value: '`!shop categories` - List all categories\n`!shop category <n>` - View category items\n`!shop restock <item_id> <amount>` - Restock item', 
                        inline: false 
                    },
                    { 
                        name: '📊 **Analytics & Reports**', 
                        value: '`!shop sales` - Sales analytics\n`!shop popular` - Most popular items\n`!shop revenue` - Revenue tracking\n`!shop customers` - Customer insights', 
                        inline: false 
                    },
                    { 
                        name: '🔄 **Trading System**', 
                        value: '`!shop trade @user` - Start trade request\n`!shop trades` - View active trades\n`!shop middleman` - Request middleman service', 
                        inline: false 
                    }
                ])
                .setColor(config.colors.primary)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081648.png')
                .setFooter({ text: '💎 Real Item Trading • 🛡️ Secure Marketplace • 💰 Professional Commerce' });
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'panel':
                await this.createPanel(message, args[1], client);
                break;
            case 'add-item':
                // Handle from index.js for special parsing
                break;
            case 'list':
                await this.listItems(message, client);
                break;
            case 'remove':
                await this.removeItem(message, args[1], client);
                break;
            case 'edit':
                await this.editItem(message, args[1], client);
                break;
            case 'categories':
                await this.listCategories(message, client);
                break;
            case 'category':
                await this.showCategory(message, args.slice(1).join(' '), client);
                break;
            case 'restock':
                await this.restockItem(message, args[1], parseInt(args[2]), client);
                break;
            case 'stats':
                await this.showStats(message, client);
                break;
            case 'sales':
                await this.showSales(message, client);
                break;
            case 'popular':
                await this.showPopular(message, client);
                break;
            case 'revenue':
                await this.showRevenue(message, client);
                break;
            case 'customers':
                await this.showCustomers(message, client);
                break;
            case 'trade':
                await this.initiateTrade(message, args[1], client);
                break;
            case 'trades':
                await this.showTrades(message, client);
                break;
            case 'middleman':
                await this.requestMiddleman(message, client);
                break;
            case 'preview':
                await this.previewShop(message, client);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!shop` to see available commands.');
        }
    },

    async executeAddItem(message, itemData) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can add items to the shop.');
        }

        if (!itemData) {
            const embed = new EmbedBuilder()
                .setTitle('📦 Add Item to Shop')
                .setDescription('**Format:** `!shop add-item Name | Price | Category | Description | Stock | Image URL`')
                .addFields([
                    { name: '📝 **Example:**', value: '`!shop add-item Dominus Crown | 250.00 | Roblox | Rare limited Dominus hat from 2010 | 1 | https://example.com/image.png`', inline: false },
                    { name: '💡 **Field Explanations:**', value: '**Name:** Item display name\n**Price:** USD price (no $ symbol)\n**Category:** Roblox, Fortnite, Steam, etc.\n**Description:** Detailed item description\n**Stock:** Number available (-1 for unlimited)\n**Image URL:** Direct image link (optional)', inline: false },
                    { name: '🏷️ **Categories:**', value: 'Roblox, Fortnite, Minecraft, Steam, Accounts, Currency, Skins, Limited, Other', inline: false }
                ])
                .setColor(config.colors.primary);
            
            return message.reply({ embeds: [embed] });
        }

        try {
            const parts = itemData.split('|').map(part => part.trim());
            
            if (parts.length < 4) {
                return message.reply('❌ Invalid format! Use: `!shop add-item Name | Price | Category | Description | Stock | Image URL`');
            }

            const [name, priceStr, category, description, stockStr = '-1', imageUrl = ''] = parts;
            const price = parseFloat(priceStr);
            const stock = parseInt(stockStr);

            if (isNaN(price) || price < 0) {
                return message.reply('❌ Invalid price! Please enter a valid number.');
            }

            if (isNaN(stock)) {
                return message.reply('❌ Invalid stock amount! Use a number or -1 for unlimited.');
            }

            const itemDataObj = {
                name,
                price,
                category: category || 'Other',
                description,
                stock,
                imageUrl,
                createdBy: message.author.id
            };

            const itemId = await database.createShopItem(itemDataObj);
            
            if (itemId) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Item Added Successfully!')
                    .setDescription(`**${name}** has been added to the marketplace!`)
                    .addFields([
                        { name: '🆔 Item ID', value: itemId.toString(), inline: true },
                        { name: '💰 Price', value: `$${price.toFixed(2)}`, inline: true },
                        { name: '📂 Category', value: category, inline: true },
                        { name: '📦 Stock', value: stock === -1 ? 'Unlimited' : stock.toString(), inline: true },
                        { name: '👤 Added By', value: message.author.tag, inline: true },
                        { name: '📝 Description', value: description.slice(0, 200), inline: false }
                    ])
                    .setColor(config.colors.success)
                    .setThumbnail(imageUrl || 'https://cdn-icons-png.flaticon.com/512/891/891462.png')
                    .setTimestamp();

                message.reply({ embeds: [embed] });
            } else {
                message.reply('❌ Error adding item to shop. Please try again.');
            }
        } catch (error) {
            console.error('Error adding shop item:', error);
            message.reply('❌ Error processing item data. Please check the format and try again.');
        }
    },

    async createPanel(message, channelArg, client) {
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
            const shopSystem = require('../systems/shopSystem');
            await shopSystem.createShopPanel(channel);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Shop Panel Created!')
                .setDescription(`Professional shop panel created in ${channel}!`)
                .addFields([
                    { name: '🏪 Features', value: 'Real item marketplace\nSecure trading system\nCategory browsing\nPurchase channels', inline: true },
                    { name: '💎 Ready For', value: 'Roblox items\nGame accounts\nDigital goods\nCrypto trading', inline: true },
                    { name: '🚀 Next Steps', value: 'Add items with `!shop add-item`\nMonitor with `!shop stats`\nManage with admin commands', inline: true }
                ])
                .setColor(config.colors.success);

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating shop panel:', error);
            message.reply('❌ Error creating shop panel.');
        }
    },

    async listItems(message, client) {
        try {
            const items = await database.getShopItems();
            
            if (items.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('🛒 Shop Inventory')
                    .setDescription('No items in the shop yet. Use `!shop add-item` to add some!')
                    .setColor(config.colors.warning);
                return message.reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🛍️ Shop Inventory (${items.length} items)`)
                .setDescription('All items currently in the marketplace:')
                .setColor(config.colors.primary);

            // Group items by category
            const categories = {};
            items.forEach(item => {
                const cat = item.category || 'Other';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(item);
            });

            Object.keys(categories).slice(0, 6).forEach(category => {
                const categoryItems = categories[category];
                const itemsList = categoryItems.slice(0, 5).map(item => {
                    const stock = item.stock === -1 ? '∞' : item.stock;
                    return `**${item.name}** - $${item.price} (${stock} left)`;
                }).join('\n');

                embed.addFields([{
                    name: `📂 ${category} (${categoryItems.length} items)`,
                    value: itemsList + (categoryItems.length > 5 ? `\n... and ${categoryItems.length - 5} more` : ''),
                    inline: true
                }]);
            });

            if (Object.keys(categories).length > 6) {
                embed.addFields([{
                    name: '📊 More Categories',
                    value: `... and ${Object.keys(categories).length - 6} more categories`,
                    inline: false
                }]);
            }

            embed.setFooter({ text: 'Use !shop category <name> to view specific categories' });
            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error listing shop items:', error);
            message.reply('❌ Error retrieving shop items.');
        }
    },

    async removeItem(message, itemId, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can remove shop items.');
        }

        if (!itemId) {
            return message.reply('❌ Please provide an item ID! Use `!shop list` to see item IDs.');
        }

        // Placeholder for now
        message.reply('🚧 Item removal feature coming soon! For now, manually edit the database.');
    },

    async editItem(message, itemId, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can edit shop items.');
        }

        if (!itemId) {
            return message.reply('❌ Please provide an item ID! Use `!shop list` to see item IDs.');
        }

        message.reply('🚧 Item editing feature coming soon!');
    },

    async showStats(message, client) {
        try {
            const items = await database.getShopItems();
            const categories = [...new Set(items.map(item => item.category))];
            const totalValue = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
            const inStock = items.filter(item => item.stock !== 0).length;
            const unlimited = items.filter(item => item.stock === -1).length;

            const embed = new EmbedBuilder()
                .setTitle('📊 Shop Statistics & Analytics')
                .addFields([
                    { name: '📦 Total Items', value: items.length.toString(), inline: true },
                    { name: '📂 Categories', value: categories.length.toString(), inline: true },
                    { name: '💰 Total Value', value: `$${totalValue.toFixed(2)}`, inline: true },
                    { name: '✅ In Stock', value: inStock.toString(), inline: true },
                    { name: '♾️ Unlimited Stock', value: unlimited.toString(), inline: true },
                    { name: '📈 Avg Price', value: `$${items.length > 0 ? (totalValue / items.length).toFixed(2) : '0.00'}`, inline: true }
                ])
                .setColor(config.colors.primary)
                .setTimestamp();

            if (categories.length > 0) {
                const topCategories = categories.slice(0, 5).map(cat => {
                    const count = items.filter(item => item.category === cat).length;
                    return `**${cat}:** ${count} items`;
                }).join('\n');

                embed.addFields([{
                    name: '🏆 Top Categories',
                    value: topCategories,
                    inline: false
                }]);
            }

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error showing shop stats:', error);
            message.reply('❌ Error retrieving shop statistics.');
        }
    },

    async showCategory(message, categoryName, client) {
        if (!categoryName) {
            return message.reply('❌ Please specify a category name! Use `!shop categories` to see all categories.');
        }

        try {
            const items = await database.getShopItems();
            const categoryItems = items.filter(item => 
                (item.category || 'Other').toLowerCase().includes(categoryName.toLowerCase())
            );

            if (categoryItems.length === 0) {
                return message.reply(`❌ No items found in category "${categoryName}". Use \`!shop categories\` to see available categories.`);
            }

            const embed = new EmbedBuilder()
                .setTitle(`📂 ${categoryName} Items (${categoryItems.length})`)
                .setDescription(`All items in the **${categoryName}** category:`)
                .setColor(config.colors.primary);

            categoryItems.slice(0, 10).forEach((item, index) => {
                const stock = item.stock === -1 ? 'Unlimited' : item.stock === 0 ? 'Out of Stock' : `${item.stock} left`;
                const stockEmoji = item.stock === 0 ? '❌' : item.stock <= 5 && item.stock !== -1 ? '⚠️' : '✅';
                
                embed.addFields([{
                    name: `${stockEmoji} ${item.name} - $${item.price}`,
                    value: `**Stock:** ${stock}\n**ID:** ${item.item_id}\n**Description:** ${item.description.slice(0, 100)}${item.description.length > 100 ? '...' : ''}`,
                    inline: true
                }]);
            });

            if (categoryItems.length > 10) {
                embed.addFields([{
                    name: '📊 More Items',
                    value: `... and ${categoryItems.length - 10} more items in this category`,
                    inline: false
                }]);
            }

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error showing category:', error);
            message.reply('❌ Error retrieving category items.');
        }
    },

    async listCategories(message, client) {
        try {
            const items = await database.getShopItems();
            const categories = {};
            
            items.forEach(item => {
                const cat = item.category || 'Other';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(item);
            });

            if (Object.keys(categories).length === 0) {
                return message.reply('📂 No categories found. Add some items to create categories!');
            }

            const embed = new EmbedBuilder()
                .setTitle('📂 Shop Categories')
                .setDescription('Available categories in the marketplace:')
                .setColor(config.colors.primary);

            Object.keys(categories).forEach(category => {
                const items = categories[category];
                const totalValue = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
                embed.addFields([{
                    name: `${this.getCategoryEmoji(category)} ${category}`,
                    value: `**Items:** ${items.length}\n**Total Value:** $${totalValue.toFixed(2)}\n**Avg Price:** $${(totalValue / items.length).toFixed(2)}`,
                    inline: true
                }]);
            });

            embed.setFooter({ text: 'Use !shop category <name> to view items in a category' });
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Error retrieving categories.');
        }
    },

    async restockItem(message, itemId, amount, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can restock items.');
        }

        if (!itemId || !amount) {
            return message.reply('❌ Usage: `!shop restock <item_id> <amount>`');
        }

        message.reply('🚧 Restock feature coming soon! Manual database editing required for now.');
    },

    async showSales(message, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can view sales analytics.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📈 Sales Analytics')
            .setDescription('Detailed sales data and performance metrics')
            .addFields([
                { name: '💰 Today\'s Sales', value: '$0.00', inline: true },
                { name: '📊 This Week', value: '$0.00', inline: true },
                { name: '📈 This Month', value: '$0.00', inline: true },
                { name: '🏆 Best Seller', value: 'No sales yet', inline: true },
                { name: '👥 Customers', value: '0', inline: true },
                { name: '📦 Orders', value: '0', inline: true },
                { name: '🚧 Status', value: 'Sales tracking will be implemented with purchase system', inline: false }
            ])
            .setColor(config.colors.primary);

        message.reply({ embeds: [embed] });
    },

    async showPopular(message, client) {
        const embed = new EmbedBuilder()
            .setTitle('🔥 Popular Items')
            .setDescription('Most viewed and purchased items')
            .addFields([
                { name: '🚧 Coming Soon', value: 'Popular items tracking will be available when purchase system is complete', inline: false }
            ])
            .setColor(config.colors.primary);

        message.reply({ embeds: [embed] });
    },

    async showRevenue(message, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can view revenue data.');
        }

        const embed = new EmbedBuilder()
            .setTitle('💰 Revenue Tracking')
            .setDescription('Financial performance and revenue analytics')
            .addFields([
                { name: '💵 Total Revenue', value: '$0.00', inline: true },
                { name: '📈 Monthly Growth', value: '0%', inline: true },
                { name: '💎 Avg Order Value', value: '$0.00', inline: true },
                { name: '🚧 Note', value: 'Revenue tracking will be implemented with payment processing', inline: false }
            ])
            .setColor(config.colors.success);

        message.reply({ embeds: [embed] });
    },

    async showCustomers(message, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can view customer data.');
        }

        const embed = new EmbedBuilder()
            .setTitle('👥 Customer Insights')
            .setDescription('Customer analytics and behavior data')
            .addFields([
                { name: '👤 Total Customers', value: '0', inline: true },
                { name: '🆕 New This Month', value: '0', inline: true },
                { name: '🔄 Returning Customers', value: '0', inline: true },
                { name: '🚧 Status', value: 'Customer analytics will be available with full purchase system', inline: false }
            ])
            .setColor(config.colors.primary);

        message.reply({ embeds: [embed] });
    },

    async initiateTrade(message, userArg, client) {
        if (!userArg) {
            return message.reply('❌ Please mention a user to trade with! Usage: `!shop trade @user`');
        }

        const embed = new EmbedBuilder()
            .setTitle('🔄 Trading System')
            .setDescription('Direct player-to-player trading with middleman protection')
            .addFields([
                { name: '🚧 Coming Soon', value: 'Advanced trading system is in development!', inline: false },
                { name: '🔮 Planned Features', value: '• Trade requests & negotiations\n• Middleman escrow service\n• Trade history & reputation\n• Multi-item trade support\n• Automated trade completion', inline: false }
            ])
            .setColor(config.colors.warning);

        message.reply({ embeds: [embed] });
    },

    async showTrades(message, client) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Active Trades')
            .setDescription('Your current trading activity')
            .addFields([
                { name: '📋 No Active Trades', value: 'You don\'t have any active trades right now.', inline: false },
                { name: '💡 Start Trading', value: 'Use `!shop trade @user` to initiate a trade', inline: false }
            ])
            .setColor(config.colors.primary);

        message.reply({ embeds: [embed] });
    },

    async requestMiddleman(message, client) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Middleman Service')
            .setDescription('Professional trade protection and escrow service')
            .addFields([
                { name: '🔒 Secure Trading', value: 'Our middleman service provides secure trading for high-value items', inline: false },
                { name: '💼 How It Works', value: '1. Request middleman service\n2. Both parties agree to terms\n3. Items/money held in escrow\n4. Safe exchange completion\n5. Items released to parties', inline: false },
                { name: '🚧 Status', value: 'Middleman service will be available with full trading system', inline: false }
            ])
            .setColor(config.colors.success);

        message.reply({ embeds: [embed] });
    },

    async previewShop(message, client) {
        try {
            const items = await database.getShopItems();
            
            const embed = new EmbedBuilder()
                .setTitle('🛍️ Shop Preview')
                .setDescription('Preview of your marketplace layout and featured items')
                .setColor(config.colors.primary);

            if (items.length === 0) {
                embed.addFields([{
                    name: '📦 Empty Shop',
                    value: 'No items added yet. Use `!shop add-item` to start adding products!',
                    inline: false
                }]);
            } else {
                // Show featured items
                const featuredItems = items.slice(0, 3);
                featuredItems.forEach(item => {
                    embed.addFields([{
                        name: `💎 ${item.name} - $${item.price}`,
                        value: item.description.slice(0, 100),
                        inline: true
                    }]);
                });

                embed.addFields([{
                    name: '📊 Shop Stats',
                    value: `**Total Items:** ${items.length}\n**Categories:** ${[...new Set(items.map(i => i.category))].length}\n**Value:** $${items.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2)}`,
                    inline: false
                }]);
            }

            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Error loading shop preview.');
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
