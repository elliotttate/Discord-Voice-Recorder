import {readFileSync} from "fs"
import {ActivityType, ApplicationCommandType, InteractionType, PresenceUpdateStatus} from "discord.js";
import { DiscordBotClient } from "./classes/client";
import { handleCommands } from "./handlers/commandHandler";
import { handleAutocomplete } from "./handlers/autocompleteHandler";
import fastify from "fastify";
import fastify_cors from "@fastify/cors"
import fastify_static from "@fastify/static"
import {join} from "path"

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

const app = fastify({
    ignoreTrailingSlash: false,
    bodyLimit: 4096,
    trustProxy: true
});

app.register(fastify_cors, {
    origin: '*',
});

app.register(fastify_static, {
    root: join(__dirname, '../recordings')
});

app.listen({port: Number(process.env["API_PORT"]), host: "localhost"}, (err, address) => {
    if (err) console.log(err)
    else console.log(`${app.printRoutes()}\n\nOnline at ${address}`)
});

client.on("ready", async () => {
    client.commands.loadClasses().catch(console.error)
    client.user?.setPresence({activities: [{type: ActivityType.Listening, name: "your meetings"}], status: PresenceUpdateStatus.DoNotDisturb, })
    console.log(`Ready`)
    await client.application?.commands.set([...client.commands.createPostBody()]).catch(console.error)
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