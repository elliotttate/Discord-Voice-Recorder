import { SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { AutocompleteContext } from "../classes/autocompleteContext";


const command_data = new SlashCommandBuilder()
    .setName("test")
    .setDMPermission(false)
    .setDescription(`test`)


export default class extends Command {
    constructor() {
        super({
            name: "test",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        await ctx.interaction.reply({content: "Hey There", ephemeral: true})
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        return context.error()
    }
}