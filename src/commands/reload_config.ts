import { SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";


const command_data = new SlashCommandBuilder()
    .setName("reload_config")
    .setDMPermission(false)
    .setDescription(`Reload the configuration file`)


export default class extends Command {
    constructor() {
        super({
            name: "reload_config",
            command_data: command_data.toJSON(),
            staff_only: true,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        ctx.client.loadConfig()
        return ctx.interaction.reply({content: "Reloaded!", ephemeral: true})
    }
}