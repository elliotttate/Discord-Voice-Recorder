import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import {readFileSync} from "fs"


const command_data = new SlashCommandBuilder()
    .setName("get_latest_recording")
    .setDMPermission(false)
    .setDescription(`Get the latest recording`)


export default class extends Command {
    constructor() {
        super({
            name: "get_latest_recording",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.interaction.inCachedGuild()) return;
        await ctx.interaction.reply({content: "Please wait...", ephemeral: true})

        const path = ctx.client.voiceRecorder.getLatestRecording()
        if(!path) return ctx.error({error: "Unable to find latest recording"})

        const file = new AttachmentBuilder(readFileSync(path), {name: `Recording-${ctx.interaction.user.id}-${new Date().toISOString()}.mp3`})

        await ctx.interaction.editReply({
            content: "The latest recording is attached below",
            files: [file]
        })
    }
}