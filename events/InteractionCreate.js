// events/interactionCreate.js - Handle slash command interactions
module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Error executing command:', error);
                
                const errorMessage = {
                    content: '❌ There was an error while executing this command!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Handle button interactions (handled by systems)
        if (interaction.isButton()) {
            // Button interactions are handled by the respective systems
            // (ticketSystem.js and shopSystem.js handle their buttons)
            return;
        }

        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            // Select menu interactions are handled by systems
            return;
        }

        // Handle modal submissions
        if (interaction.isModalSubmit()) {
            // Modal submissions are handled by systems
            return;
        }
    },
};
