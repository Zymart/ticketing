// commands/panel.js - Admin panel customization commands
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Use global config
const config = global.config;

// Helper function to check permissions
function hasPermission(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

module.exports = {
    name: 'panel',
    description: 'Customize and manage order panels',
    
    async execute(message, args, client) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only the bot owner or admins can use panel commands.');
        }

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🎛️ Panel Management Commands')
                .setDescription('Customize your order panel:')
                .addFields([
                    { name: '!panel create [channel]', value: 'Create order panel in current or specified channel', inline: false },
                    { name: '!panel preview', value: 'Preview current panel settings', inline: false },
                    { name: '!panel reset', value: 'Reset to default panel design', inline: false },
                    { name: '!panel template <type>', value: 'Use preset templates (gaming, digital, services)', inline: false }
                ])
                .setColor(config.colors.primary);
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'create':
                await this.createPanel(message, args[1], client);
                break;
            case 'preview':
                await this.previewPanel(message);
                break;
            case 'reset':
                await this.resetPanel(message);
                break;
            case 'template':
                await this.useTemplate(message, args[1]);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!panel` to see available commands.');
        }
    },

    async createPanel(message, channelArg, client) {
        if (!config.ticketSettings.categoryId || !config.ticketSettings.supportRoleId) {
            return message.reply('❌ Bot is not configured yet! Please run setup commands first.');
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
            const ticketSystem = require('../systems/ticketSystem');
            await ticketSystem.createTicketPanel(channel);
            message.reply(`✅ Order panel has been created in ${channel}!`);
        } catch (error) {
            console.error('Error creating order panel:', error);
            message.reply('❌ There was an error creating the order panel.');
        }
    },

    async previewPanel(message) {
        const panelSettings = config.panelSettings || {};

        const embed = new EmbedBuilder()
            .setTitle(panelSettings.title || '🛒 Professional Order System')
            .setDescription(panelSettings.description || '**Ready to place your order?** Click the button below to get started!\n\n*Fill out our quick order form and get instant pricing!*')
            .addFields([
                {
                    name: '💎 **What We Offer:**',
                    value: `\`\`\`${panelSettings.services || '• Game Currency & Rare Items\n• Account Services & Boosts\n• Power-leveling & Achievements\n• Custom Gaming Services\n• VIP Packages & Bundles\n• Exclusive Limited Items'}\`\`\``,
                    inline: false
                },
                {
                    name: '⚡ **Why Choose Us:**',
                    value: `\`\`\`${panelSettings.features || '✓ Instant Pricing\n✓ 24/7 Support\n✓ Secure Transactions\n✓ Fast Delivery\n✓ Money Back Guarantee\n✓ Trusted by 1000+ Customers'}\`\`\``,
                    inline: true
                },
                {
                    name: '💳 **Payment Methods:**',
                    value: `\`\`\`${panelSettings.payments || '• PayPal • Crypto\n• Gift Cards • Bank Transfer\n• Cashapp • Venmo'}\`\`\``,
                    inline: true
                }
            ])
            .setColor(config.colors.primary)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/891/891462.png')
            .setFooter({ text: panelSettings.footer || '🛡️ Secure Orders • 💯 Satisfaction Guaranteed • ⭐ Premium Service' });

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('preview_button')
                    .setLabel(panelSettings.buttonText || 'Place Your Order')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒')
                    .setDisabled(true)
            );

        await message.reply({ 
            content: '👀 **Panel Preview:**',
            embeds: [embed], 
            components: [button] 
        });
    },

    async resetPanel(message) {
        // Reset to default settings
        config.panelSettings = {
            title: '🛒 Professional Order System',
            description: '**Ready to place your order?** Click the button below to get started!\n\n*Fill out our quick order form and get instant pricing!*',
            buttonText: 'Place Your Order',
            services: '• Game Currency & Rare Items\n• Account Services & Boosts\n• Power-leveling & Achievements\n• Custom Gaming Services\n• VIP Packages & Bundles\n• Exclusive Limited Items',
            features: '✓ Instant Pricing\n✓ 24/7 Support\n✓ Secure Transactions\n✓ Fast Delivery\n✓ Money Back Guarantee\n✓ Trusted by 1000+ Customers',
            payments: '• PayPal • Crypto\n• Gift Cards • Bank Transfer\n• Cashapp • Venmo',
            footer: '🛡️ Secure Orders • 💯 Satisfaction Guaranteed • ⭐ Premium Service'
        };

        // Save config
        const fs = require('fs');
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('✅ Panel Reset Complete!')
            .setDescription('Panel settings have been reset to default values.')
            .setColor(config.colors.success);

        message.reply({ embeds: [embed] });
    },

    async useTemplate(message, templateType) {
        if (!templateType) {
            const embed = new EmbedBuilder()
                .setTitle('🎨 Available Templates')
                .setDescription('Choose a template for your order panel:')
                .addFields([
                    { name: '🎮 Gaming', value: '`!panel template gaming`\nPerfect for game services, currency, boosting', inline: true },
                    { name: '💻 Digital', value: '`!panel template digital`\nGreat for software, accounts, subscriptions', inline: true },
                    { name: '🎨 Services', value: '`!panel template services`\nIdeal for custom work, commissions, freelancing', inline: true }
                ])
                .setColor(config.colors.primary);
            
            return message.reply({ embeds: [embed] });
        }

        let template;
        switch (templateType.toLowerCase()) {
            case 'gaming':
                template = {
                    title: '🎮 Premium Gaming Services',
                    description: '**Level up your gaming experience!** Get the items, ranks, and achievements you want.\n\n*Professional gaming services with guaranteed results!*',
                    buttonText: '🚀 Order Gaming Service',
                    services: '• Game Currency & Gold\n• Rank Boosting & Leveling\n• Rare Items & Skins\n• Achievement Unlocking\n• Account Recovery\n• Tournament Coaching',
                    features: '✓ Professional Gamers\n✓ Safe & Secure Methods\n✓ Fast Completion Times\n✓ 24/7 Live Support\n✓ Money Back Guarantee\n✓ 5000+ Happy Customers',
                    payments: '• PayPal • Crypto • Gift Cards\n• Cashapp • Venmo • Zelle',
                    footer: '🛡️ Safe Gaming Services • 🏆 Pro Players Only • ⚡ Fast Delivery'
                };
                break;
            case 'digital':
                template = {
                    title: '💻 Digital Products & Services',
                    description: '**Everything digital, delivered instantly!** Software, accounts, and premium services.\n\n*Professional digital solutions for all your needs!*',
                    buttonText: '📱 Order Digital Product',
                    services: '• Premium Software Licenses\n• Social Media Accounts\n• Streaming Subscriptions\n• Website & App Development\n• Digital Marketing Services\n• Cloud Storage & Tools',
                    features: '✓ Instant Digital Delivery\n✓ Lifetime Support Included\n✓ Premium Quality Products\n✓ Secure Transactions Only\n✓ 30-Day Money Back\n✓ Trusted Since 2020',
                    payments: '• PayPal • Crypto • Credit Card\n• Apple Pay • Google Pay',
                    footer: '🔒 Secure Digital Store • ⚡ Instant Delivery • 🌟 Premium Quality'
                };
                break;
            case 'services':
                template = {
                    title: '🎨 Professional Services Hub',
                    description: '**Custom work by skilled professionals!** Get exactly what you need, made just for you.\n\n*Quality craftsmanship with personalized attention!*',
                    buttonText: '✨ Request Custom Service',
                    services: '• Graphic Design & Logos\n• Website Development\n• Content Writing & Copywriting\n• Video Editing & Production\n• Social Media Management\n• Custom Programming',
                    features: '✓ Experienced Professionals\n✓ Custom Made For You\n✓ Unlimited Revisions\n✓ Fast Turnaround Times\n✓ 100% Satisfaction Guarantee\n✓ Portfolio Available',
                    payments: '• PayPal • Bank Transfer\n• Crypto • Wise • Payoneer',
                    footer: '🎯 Custom Solutions • 👨‍💼 Professional Team • 🏆 Quality Guaranteed'
                };
                break;
            default:
                return message.reply('❌ Invalid template! Use: `gaming`, `digital`, or `services`');
        }

        // Apply template
        config.panelSettings = template;

        // Save config
        const fs = require('fs');
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('✅ Template Applied!')
            .setDescription(`**${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template** has been applied to your order panel.\n\nUse \`!panel preview\` to see how it looks!`)
            .setColor(config.colors.success);

        message.reply({ embeds: [embed] });
    }
};
