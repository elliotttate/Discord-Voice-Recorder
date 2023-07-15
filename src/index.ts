import {readFileSync} from "fs"
import {ActivityType, ApplicationCommandType, InteractionType, PresenceUpdateStatus} from "discord.js";
import { DiscordBotClient } from "./classes/client";
import { handleCommands } from "./handlers/commandHandler";
import { handleAutocomplete } from "./handlers/autocompleteHandler";

const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/
for (const line of readFileSync(`${process.cwd()}/.env`, 'utf8').split(/[\r\n]/)) {
    const [, key, value] = line.match(RE_INI_KEY_VAL) || []
    if (!key) continue

    process.env[key] = value?.trim()
}

const client = new DiscordBotClient({
    intents: ["Guilds", "GuildMembers", "GuildVoiceStates"]
})


client.login(process.env["DISCORD_TOKEN"])


client.on("ready", async () => {
    client.commands.loadClasses().catch(console.error)
    client.components.loadClasses().catch(console.error)
    client.contexts.loadClasses().catch(console.error)
    client.modals.loadClasses().catch(console.error)
    client.user?.setPresence({activities: [{type: ActivityType.Listening, name: "to Webhead singing in the shower"}], status: PresenceUpdateStatus.DoNotDisturb, })
    console.log(`Ready`)
    await client.application?.commands.set([...client.commands.createPostBody(), ...client.contexts.createPostBody()]).catch(console.error)
})

client.on("interactionCreate", async (interaction) => {
    switch(interaction.type) {
        case InteractionType.ApplicationCommand: {
            switch(interaction.commandType) {
                case ApplicationCommandType.ChatInput: {
                    return await handleCommands(interaction, client);
                }
                default: return;
            }
        };
        case InteractionType.ApplicationCommandAutocomplete: {
			return await handleAutocomplete(interaction, client);
        };
    }
})