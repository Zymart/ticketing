// commands/shop.js - Enhanced shop management with PHP currency and file support
const { EmbedBuilder } = require('discord.js');
const database = require('../systems/database');

// Use global config
const config = global.config;

// Exchange rates (update these regularly or fetch from an API)
const EXCHANGE_RATES = {
    USD_TO_PHP: 56.50, // 1 USD = 56.50 PHP
    PHP_TO_USD: 0.0177  // 1 PHP = 0.0177 USD
};

// Helper function to check permissions
function hasPermission(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

module.exports = {
    name: 'shop',
    description: 'Complete shop management with PHP currency support',
    
    async execute(message, args, client) {
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🛍️ Real Item Marketplace & Shop System')
                .setDescription('**Professional item trading with PayPal & GCash support!**')
                .addFields([
                    { 
                        name: '🎛️ **Panel Management**', 
                        value: '`!shop panel [channel]` - Create shop panel\n`!shop preview` - Preview shop layout\n`!shop stats` - View shop statistics', 
                        inline: false 
                    },
                    { 
                        name: '📦 **Item Management** (Admins Only)', 
                        value: '`!shop add-item` - Add item with modal form\n`!shop add-item-quick Name | Price | Category | Description | Stock` - Quick add\n`!shop list` - View all items\n`!shop remove <item_id>` - Remove item', 
                        inline: false 
                    },
                    { 
                        name: '💰 **Currency Support**', 
                        value: '`USD ↔ PHP conversion (1 USD = ₱56.50)`\n`PayPal (USD/PHP) • GCash (PHP only)`\n`Automatic price conversion`', 
                        inline: false 
                    },
                    { 
                        name: '🏪 **Category Management**', 
                        value: '`!shop categories` - List all categories\n`!shop category <n>` - View category items\n`!shop restock <item_id> <amount>` - Restock item', 
                        inline: false 
                    },
                    { 
                        name: '📊 **Analytics & Reports**', 
                        value: '`!shop sales` - Sales analytics\n`!shop popular` - Most popular items\n`!shop revenue` - Revenue tracking (USD/PHP)', 
                        inline: false 
                    }
                ])
                .setColor(config.colors.primary)
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081648.png')
                .setFooter({ text: '💎 PayPal & GCash • 🇵🇭 PHP Support • 🛡️ Secure Marketplace' });
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'panel':
                await this.createPanel(message, args[1], client);
                break;
            case 'add-item':
                if (args.length > 1) {
                    await this.executeAddItemQuick(message, args.slice(1).join(' '), client);
                } else {
                    await this.triggerAddItemModal(message, client);
                }
                break;
            case 'add-item-quick':
                await this.executeAddItemQuick(message, args.slice(1).join(' '), client);
                break;
            case 'list':
                await this.listItems(message, client);
                break;
            case 'remove':
                await this.removeItem(message, args[1], client);
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
            case 'convert':
                await this.convertCurrency(message, args[1], args[2]);
                break;
            case 'preview':
                await this.previewShop(message, client);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!shop` to see available commands.');
        }
    },

    async triggerAddItemModal(message, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can add items to the shop.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📦 Add Item to Shop')
            .setDescription('**To use the interactive form with image upload support:**')
            .addFields([
                { 
                    name: '🎛️ **Method 1: Interactive Modal (Recommended)**', 
                    value: '1. Go to any shop panel in your server\n2. Click "Browse Shop" button\n3. Click "Manage Shop" button (admin only)\n4. Click "Add New Item" button\n5. Fill out the modal form with image upload support', 
                    inline: false 
                },
                { 
                    name: '⚡ **Method 2: Quick Text Command**', 
                    value: '`!shop add-item-quick Name | Price | Category | Description | Stock | ImageURL`\n\n**Example:**\n`!shop add-item-quick Dominus Crown | 250.00 | Roblox | Rare limited hat | 1 | https://example.com/image.png`', 
                    inline: false 
                },
                { 
                    name: '💰 **Currency Examples**', 
                    value: '**USD:** `25.50` (will show as ₱1437 PHP)\n**PHP:** `1400` (will show as $24.78 USD)\n**Flexible:** `$10-15` or `₱500-800`', 
                    inline: true 
                },
                { 
                    name: '🏷️ **Available Categories**', 
                    value: 'Roblox, Fortnite, Minecraft, Steam, Accounts, Currency, Skins, Limited, Other', 
                    inline: true 
                },
                { 
                    name: '📸 **Image Support**', 
                    value: 'Modal method supports:\n• Direct file upload\n• Drag & drop images\n• PNG, JPG, GIF, WebP', 
                    inline: true 
                }
            ])
            .setColor(config.colors.primary)
            .setFooter({ text: 'PayPal & GCash accepted • Auto USD/PHP conversion' });

        message.reply({ embeds: [embed] });
    },

    async executeAddItemQuick(message, itemData, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can add items to the shop.');
        }

        if (!itemData) {
            const embed = new EmbedBuilder()
                .setTitle('📦 Quick Add Item - Usage')
                .setDescription('**Format:** `!shop add-item-quick Name | Price | Category | Description | Stock | ImageURL`')
                .addFields([
                    { name: '💡 Example', value: '`!shop add-item-quick Dominus Crown | 250.00 | Roblox | Rare limited hat | 1 | https://example.com/image.png`', inline: false },
                    { name: '💰 Price Formats', value: '`25.50` (USD) or `₱1400` (PHP)', inline: true },
                    { name: '📦 Stock', value: '`1`, `5`, `-1` (unlimited)', inline: true },
                    { name: '📸 Image', value: 'Optional URL or leave blank', inline: true }
                ])
                .setColor(config.colors.warning);
            return message.reply({ embeds: [embed] });
        }

        try {
            const parts = itemData.split('|').map(part => part.trim());
            
            if (parts.length < 4) {
                return message.reply('❌ Invalid format! Use: `!shop add-item-quick Name | Price | Category | Description | Stock | Image URL`');
            }

            const [name, priceStr, category, description, stockStr = '-1', imageUrl = ''] = parts;
            
            let price;
            let currency = 'USD';
            
            if (priceStr.toLowerCase().includes('php') || priceStr.includes('₱')) {
                const phpAmount = parseFloat(priceStr.replace(/[^\d.]/g, ''));
                price = phpAmount * EXCHANGE_RATES.PHP_TO_USD;
                currency = 'PHP';
            } else {
                price = parseFloat(priceStr.replace(/[^\d.]/g, ''));
            }

            const stock = parseInt(stockStr);

            if (isNaN(price) || price < 0) {
                return message.reply('❌ Invalid price! Use format: `25.50` (USD) or `₱1400` (PHP)');
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
                        { name: '👤 Added By', value: message.author.tag, inline: true },
                        { name: '💳 Payment Methods', value: 'PayPal (USD/PHP) • GCash (PHP)', inline: true },
                        { name: '🔄 Exchange Rate', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`, inline: true },
                        { name: '📊 Original Input', value: `${currency} ${currency === 'PHP' ? '₱' + (price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0) : '$' + price.toFixed(2)}`, inline: true },
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
                .setDescription(`Professional shop panel with PayPal & GCash support created in ${channel}!`)
                .addFields([
                    { name: '🏪 Features', value: 'Real item marketplace\nPayPal & GCash payments\nUSD/PHP conversion\nCategory browsing', inline: true },
                    { name: '💎 Ready For', value: 'Roblox items\nGame accounts\nDigital goods\nCrypto trading', inline: true },
                    { name: '🚀 Next Steps', value: 'Add items with `!shop add-item`\nMonitor with `!shop stats`\nManage currencies', inline: true },
                    { name: '💰 Currency Info', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}\nAuto conversion enabled\nBoth currencies supported`, inline: false }
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
                    const pricePHP = (item.price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
                    return `**${item.name}** - $${item.price} (₱${pricePHP}) - ${stock} left`;
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

            embed.addFields([{
                name: '💰 Currency Info',
                value: `Exchange Rate: 1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}\nPayment: PayPal (USD/PHP) • GCash (PHP)`,
                inline: false
            }]);

            embed.setFooter({ text: 'Use !shop category <n> to view specific categories' });
            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error listing shop items:', error);
            message.reply('❌ Error retrieving shop items.');
        }
    },

    async showStats(message, client) {
        try {
            const items = await database.getShopItems();
            const categories = [...new Set(items.map(item => item.category))];
            const totalValueUSD = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
            const totalValuePHP = totalValueUSD * EXCHANGE_RATES.USD_TO_PHP;
            const inStock = items.filter(item => item.stock !== 0).length;
            const unlimited = items.filter(item => item.stock === -1).length;

            const embed = new EmbedBuilder()
                .setTitle('📊 Shop Statistics & Analytics')
                .setDescription('**Complete marketplace overview with PHP currency support**')
                .addFields([
                    { name: '📦 Total Items', value: items.length.toString(), inline: true },
                    { name: '📂 Categories', value: categories.length.toString(), inline: true },
                    { name: '✅ In Stock', value: inStock.toString(), inline: true },
                    { name: '💰 Total Value (USD)', value: `$${totalValueUSD.toFixed(2)}`, inline: true },
                    { name: '🇵🇭 Total Value (PHP)', value: `₱${totalValuePHP.toFixed(0)}`, inline: true },
                    { name: '♾️ Unlimited Stock', value: unlimited.toString(), inline: true },
                    { name: '📈 Avg Price (USD)', value: `$${items.length > 0 ? (totalValueUSD / items.length).toFixed(2) : '0.00'}`, inline: true },
                    { name: '📈 Avg Price (PHP)', value: `₱${items.length > 0 ? (totalValuePHP / items.length).toFixed(0) : '0'}`, inline: true },
                    { name: '🔄 Exchange Rate', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`, inline: true }
                ])
                .setColor(config.colors.primary)
                .setTimestamp();

            if (categories.length > 0) {
                const topCategories = categories.slice(0, 5).map(cat => {
                    const catItems = items.filter(item => item.category === cat);
                    const count = catItems.length;
                    const value = catItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
                    return `**${cat}:** ${count} items ($${value.toFixed(2)} / ₱${(value * EXCHANGE_RATES.USD_TO_PHP).toFixed(0)})`;
                }).join('\n');

                embed.addFields([{
                    name: '🏆 Top Categories',
                    value: topCategories,
                    inline: false
                }]);
            }

            embed.addFields([{
                name: '💳 Payment Methods Supported',
                value: 'PayPal (accepts USD & PHP) • GCash (PHP only) • Automatic conversion',
                inline: false
            }]);

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error showing shop stats:', error);
            message.reply('❌ Error retrieving shop statistics.');
        }
    },

    async convertCurrency(message, amount, fromCurrency) {
        if (!amount || !fromCurrency) {
            const embed = new EmbedBuilder()
                .setTitle('💱 Currency Converter')
                .setDescription('Convert between USD and Philippine Peso')
                .addFields([
                    { name: 'Usage', value: '`!shop convert <amount> <from>`', inline: false },
                    { name: 'Examples', value: '`!shop convert 25 USD`\n`!shop convert 1400 PHP`', inline: false },
                    { name: 'Current Rate', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`, inline: false }
                ])
                .setColor(config.colors.primary);
            return message.reply({ embeds: [embed] });
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            return message.reply('❌ Invalid amount! Please enter a number.');
        }

        const from = fromCurrency.toUpperCase();
        let result, resultCurrency;

        if (from === 'USD' || from === '$') {
            result = (numAmount * EXCHANGE_RATES.USD_TO_PHP).toFixed(2);
            resultCurrency = 'PHP';
        } else if (from === 'PHP' || from === '₱') {
            result = (numAmount * EXCHANGE_RATES.PHP_TO_USD).toFixed(2);
            resultCurrency = 'USD';
        } else {
            return message.reply('❌ Invalid currency! Use USD or PHP.');
        }

        const embed = new EmbedBuilder()
            .setTitle('💱 Currency Conversion')
            .addFields([
                { name: 'From', value: `${from === 'USD' || from === '$' ? '$' : '₱'}${numAmount}`, inline: true },
                { name: 'To', value: `${resultCurrency === 'USD' ? '$' : '₱'}${result}`, inline: true },
                { name: 'Rate', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`, inline: true }
            ])
            .setColor(config.colors.success)
            .setTimestamp();

        message.reply({ embeds: [embed] });
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
                .setDescription(`All items in the **${categoryName}** category with dual currency pricing:`)
                .setColor(config.colors.primary);

            categoryItems.slice(0, 10).forEach((item, index) => {
                const stock = item.stock === -1 ? 'Unlimited' : item.stock === 0 ? 'Out of Stock' : `${item.stock} left`;
                const stockEmoji = item.stock === 0 ? '❌' : item.stock <= 5 && item.stock !== -1 ? '⚠️' : '✅';
                const pricePHP = (item.price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
                
                embed.addFields([{
                    name: `${stockEmoji} ${item.name}`,
                    value: `**USD:** $${item.price} **PHP:** ₱${pricePHP}\n**Stock:** ${stock}\n**ID:** ${item.item_id}\n**Description:** ${item.description.slice(0, 80)}...`,
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

            embed.addFields([{
                name: '💳 Payment Info',
                value: `PayPal: USD/PHP accepted • GCash: PHP only • Rate: 1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`,
                inline: false
            }]);

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
                .setDescription('Available categories in the marketplace with dual currency values:')
                .setColor(config.colors.primary);

            Object.keys(categories).forEach(category => {
                const items = categories[category];
                const totalValueUSD = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
                const totalValuePHP = totalValueUSD * EXCHANGE_RATES.USD_TO_PHP;
                embed.addFields([{
                    name: `${this.getCategoryEmoji(category)} ${category}`,
                    value: `**Items:** ${items.length}\n**Value USD:** $${totalValueUSD.toFixed(2)}\n**Value PHP:** ₱${totalValuePHP.toFixed(0)}\n**Avg Price:** $${(totalValueUSD / items.length).toFixed(2)}`,
                    inline: true
                }]);
            });

            embed.setFooter({ text: 'Use !shop category <n> to view items • PayPal & GCash accepted' });
            message.reply({ embeds: [embed] });
        } catch (error) {
            message.reply('❌ Error retrieving categories.');
        }
    },

    async showSales(message, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can view sales analytics.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📈 Sales Analytics')
            .setDescription('Detailed sales data with PHP currency support')
            .addFields([
                { name: '💰 Today\'s Sales (USD)', value: '$0.00', inline: true },
                { name: '🇵🇭 Today\'s Sales (PHP)', value: '₱0.00', inline: true },
                { name: '📊 This Week', value: '$0.00 (₱0.00)', inline: true },
                { name: '📈 This Month', value: '$0.00 (₱0.00)', inline: true },
                { name: '🏆 Best Seller', value: 'No sales yet', inline: true },
                { name: '👥 Customers', value: '0', inline: true },
                { name: '💳 Payment Methods', value: 'PayPal: 0% • GCash: 0%', inline: true },
                { name: '🔄 Currency Split', value: 'USD: 0% • PHP: 0%', inline: true },
                { name: '📦 Orders', value: '0', inline: true },
                { name: '🚧 Status', value: 'Sales tracking will be implemented with purchase system', inline: false }
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
            .setDescription('Financial performance with dual currency support')
            .addFields([
                { name: '💵 Total Revenue (USD)', value: '$0.00', inline: true },
                { name: '🇵🇭 Total Revenue (PHP)', value: '₱0.00', inline: true },
                { name: '📈 Monthly Growth', value: '0%', inline: true },
                { name: '💎 Avg Order Value (USD)', value: '$0.00', inline: true },
                { name: '💎 Avg Order Value (PHP)', value: '₱0.00', inline: true },
                { name: '💳 PayPal Revenue', value: '$0.00', inline: true },
                { name: '🇵🇭 GCash Revenue', value: '₱0.00', inline: true },
                { name: '🔄 Exchange Rate', value: `1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`, inline: true },
                { name: '📊 Currency Preference', value: 'USD: 0% • PHP: 0%', inline: true },
                { name: '🚧 Note', value: 'Revenue tracking will be implemented with payment processing', inline: false }
            ])
            .setColor(config.colors.success);

        message.reply({ embeds: [embed] });
    },

    async removeItem(message, itemId, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only admins can remove shop items.');
        }

        if (!itemId) {
            return message.reply('❌ Please provide an item ID! Use `!shop list` to see item IDs.');
        }

        message.reply('🚧 Item removal feature coming soon! For now, manually edit the database.');
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

    async showPopular(message, client) {
        const embed = new EmbedBuilder()
            .setTitle('🔥 Popular Items')
            .setDescription('Most viewed and purchased items with currency data')
            .addFields([
                { name: '🚧 Coming Soon', value: 'Popular items tracking with PHP currency support will be available when purchase system is complete', inline: false },
                { name: '📊 Will Include', value: '• Most purchased items\n• Revenue by currency\n• PayPal vs GCash preferences\n• Category popularity', inline: false }
            ])
            .setColor(config.colors.primary);

        message.reply({ embeds: [embed] });
    },

    async previewShop(message, client) {
        try {
            const items = await database.getShopItems();
            
            const embed = new EmbedBuilder()
                .setTitle('🛍️ Shop Preview')
                .setDescription('Preview of your marketplace with PayPal & GCash support')
                .setColor(config.colors.primary);

            if (items.length === 0) {
                embed.addFields([{
                    name: '📦 Empty Shop',
                    value: 'No items added yet. Use `!shop add-item` to start adding products!',
                    inline: false
                }]);
            } else {
                const featuredItems = items.slice(0, 3);
                featuredItems.forEach(item => {
                    const pricePHP = (item.price * EXCHANGE_RATES.USD_TO_PHP).toFixed(0);
                    embed.addFields([{
                        name: `💎 ${item.name}`,
                        value: `**USD:** ${item.price} **PHP:** ₱${pricePHP}\n${item.description.slice(0, 80)}...`,
                        inline: true
                    }]);
                });

                const totalValueUSD = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
                const totalValuePHP = totalValueUSD * EXCHANGE_RATES.USD_TO_PHP;

                embed.addFields([{
                    name: '📊 Shop Stats',
                    value: `**Total Items:** ${items.length}\n**Categories:** ${[...new Set(items.map(i => i.category))].length}\n**Value USD:** ${totalValueUSD.toFixed(2)}\n**Value PHP:** ₱${totalValuePHP.toFixed(0)}\n**Exchange Rate:** 1 USD = ₱${EXCHANGE_RATES.USD_TO_PHP}`,
                    inline: false
                }]);
            }

            embed.addFields([{
                name: '💳 Payment Methods',
                value: 'PayPal (accepts USD & PHP) • GCash (PHP only) • Automatic conversion',
                inline: false
            }]);

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
