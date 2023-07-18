import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import {readFileSync} from "fs"


const command_data = new SlashCommandBuilder()
    .setName("get_latest_transcript")
    .setDMPermission(false)
    .setDescription(`Get the latest transcript`)


export default class extends Command {
    constructor() {
        super({
            name: "get_latest_transcript",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.interaction.inCachedGuild()) return;
        if(!ctx.client.config.useOpenAIWhisper) return ctx.error({error: "Audios are uploaded to fireflies and not generated using whisper"})
        await ctx.interaction.reply({content: "Please wait...", ephemeral: true})

        const path = ctx.client.voiceRecorder.getLatestTranscript()
        if(!path) return ctx.error({error: "Unable to find latest recording"})
        const name = path.split(/(\/|\\)/).at(-1)

        const file = new AttachmentBuilder(readFileSync(path), {name: `Trancscript-${name}`})

        await ctx.interaction.editReply({
            content: "The latest transcript is attached below",
            files: [file]
        })
    }
}