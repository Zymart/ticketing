// commands/ticket.js - Ticket commands (both prefix and slash)
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ticketSystem = require('../systems/ticketSystem');

// Use global config
const config = global.config;

// Helper function to check permissions
function hasPermission(userId) {
    return userId === config.ownerId || config.adminIds.includes(userId);
}

module.exports = {
    // Slash command data
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Create a ticket panel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send the ticket panel')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Force close the current ticket'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the current ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the current ticket')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true))),

    // Slash command execution
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'panel':
                await this.createPanel(interaction);
                break;
            case 'close':
                await this.forceCloseTicket(interaction);
                break;
            case 'add':
                await this.addUserToTicket(interaction);
                break;
            case 'remove':
                await this.removeUserFromTicket(interaction);
                break;
        }
    },

    // Prefix command data
    name: 'ticket',
    description: 'Ticket management commands',

    // Prefix command execution
    async executePrefix(message, args) {
        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticket Commands')
                .setDescription('Available ticket commands:')
                .addFields([
                    { name: '!ticket panel [channel]', value: 'Create ticket panel in current or specified channel', inline: false },
                    { name: '!ticket close', value: 'Force close current ticket (admins only)', inline: false },
                    { name: '!ticket add <user>', value: 'Add user to current ticket', inline: false },
                    { name: '!ticket remove <user>', value: 'Remove user from current ticket', inline: false }
                ])
                .setColor(config.colors.primary);
            
            return message.reply({ embeds: [embed] });
        }

        const subcommand = args[0].toLowerCase();

        switch (subcommand) {
            case 'panel':
                await this.createPanelPrefix(message, args[1]);
                break;
            case 'close':
                await this.forceCloseTicketPrefix(message);
                break;
            case 'add':
                await this.addUserToTicketPrefix(message, args[1]);
                break;
            case 'remove':
                await this.removeUserFromTicketPrefix(message, args[1]);
                break;
            default:
                message.reply('❌ Invalid subcommand! Use `!ticket` to see available commands.');
        }
    },

    // Panel creation (slash)
    async createPanel(interaction) {
        if (!hasPermission(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ Only the bot owner or admins can create ticket panels.',
                ephemeral: true
            });
        }

        if (!config.ticketSettings.categoryId || !config.ticketSettings.supportRoleId || !config.ticketSettings.ordersChannelId || !config.ticketSettings.receivedChannelId || !config.ticketSettings.ongoingChannelId) {
            return await interaction.reply({
                content: '❌ Bot is not fully configured yet! Please run `!setup status` to see missing channels.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            await ticketSystem.createTicketPanel(channel);
            await interaction.reply({
                content: `✅ Ticket panel has been created in ${channel}!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating ticket panel:', error);
            await interaction.reply({
                content: '❌ There was an error creating the ticket panel.',
                ephemeral: true
            });
        }
    },

    // Panel creation (prefix)
    async createPanelPrefix(message, channelArg) {
        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only the bot owner or admins can create ticket panels.');
        }

        if (!config.ticketSettings.categoryId || !config.ticketSettings.supportRoleId || !config.ticketSettings.ordersChannelId || !config.ticketSettings.receivedChannelId || !config.ticketSettings.ongoingChannelId) {
            return message.reply('❌ Bot is not fully configured yet! Please run `!setup status` to see missing channels.');
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
            await ticketSystem.createTicketPanel(channel);
            message.reply(`✅ Ticket panel has been created in ${channel}!`);
        } catch (error) {
            console.error('Error creating ticket panel:', error);
            message.reply('❌ There was an error creating the ticket panel.');
        }
    },

    // Force close (slash)
    async forceCloseTicket(interaction) {
        if (!interaction.channel.name.startsWith('order-')) {
            return await interaction.reply({
                content: '❌ This command can only be used in order channels.',
                ephemeral: true
            });
        }

        if (!hasPermission(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ Only the bot owner or admins can force close tickets.',
                ephemeral: true
            });
        }

        await ticketSystem.finalizeTicketClose(interaction);
    },

    // Force close (prefix)
    async forceCloseTicketPrefix(message) {
        if (!message.channel.name.startsWith('order-')) {
            return message.reply('❌ This command can only be used in order channels.');
        }

        if (!hasPermission(message.author.id)) {
            return message.reply('❌ Only the bot owner or admins can force close tickets.');
        }

        // Create a fake interaction object for compatibility
        const fakeInteraction = {
            user: message.author,
            channel: message.channel,
            deferUpdate: async () => {},
            editReply: async (options) => {
                if (typeof options === 'string') {
                    return message.channel.send(options);
                } else {
                    return message.channel.send(options);
                }
            }
        };

        await ticketSystem.finalizeTicketClose(fakeInteraction);
    },

    // Add user (slash)
    async addUserToTicket(interaction) {
        if (!interaction.channel.name.startsWith('order-')) {
            return await interaction.reply({
                content: '❌ This command can only be used in order channels.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');

        try {
            await interaction.channel.permissionOverwrites.edit(user, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            });

            await interaction.reply({
                content: `✅ ${user} has been added to this ticket.`,
            });
        } catch (error) {
            console.error('Error adding user to ticket:', error);
            await interaction.reply({
                content: '❌ There was an error adding the user to this ticket.',
                ephemeral: true
            });
        }
    },

    // Add user (prefix)
    async addUserToTicketPrefix(message, userArg) {
        if (!message.channel.name.startsWith('order-')) {
            return message.reply('❌ This command can only be used in order channels.');
        }

        if (!userArg) {
            return message.reply('❌ Please mention a user or provide their ID! Example: `!ticket add @user`');
        }

        const userId = userArg.replace(/[<@!>]/g, '');
        
        try {
            const user = await message.guild.members.fetch(userId);
            
            await message.channel.permissionOverwrites.edit(user, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            });

            message.reply(`✅ ${user.user.tag} has been added to this ticket.`);
        } catch (error) {
            console.error('Error adding user to ticket:', error);
            message.reply('❌ Could not find that user or add them to the ticket.');
        }
    },

    // Remove user (slash)
    async removeUserFromTicket(interaction) {
        if (!interaction.channel.name.startsWith('order-')) {
            return await interaction.reply({
                content: '❌ This command can only be used in order channels.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');

        try {
            await interaction.channel.permissionOverwrites.edit(user, {
                ViewChannel: false,
            });

            await interaction.reply({
                content: `✅ ${user} has been removed from this ticket.`,
            });
        } catch (error) {
            console.error('Error removing user from ticket:', error);
            await interaction.reply({
                content: '❌ There was an error removing the user from this ticket.',
                ephemeral: true
            });
        }
    },

    // Remove user (prefix)
    async removeUserFromTicketPrefix(message, userArg) {
        if (!message.channel.name.startsWith('order-')) {
            return message.reply('❌ This command can only be used in order channels.');
        }

        if (!userArg) {
            return message.reply('❌ Please mention a user or provide their ID! Example: `!ticket remove @user`');
        }

        const userId = userArg.replace(/[<@!>]/g, '');
        
        try {
            const user = await message.guild.members.fetch(userId);
            
            await message.channel.permissionOverwrites.edit(user, {
                ViewChannel: false,
            });

            message.reply(`✅ ${user.user.tag} has been removed from this ticket.`);
        } catch (error) {
            console.error('Error removing user from ticket:', error);
            message.reply('❌ Could not find that user or remove them from the ticket.');
        }
    }
};
