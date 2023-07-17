import { ChannelType, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";


const command_data = new SlashCommandBuilder()
    .setName("stop_recording")
    .setDMPermission(false)
    .setDescription(`Stop recording`)


export default class extends Command {
    constructor() {
        super({
            name: "stop_recording",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.interaction.inCachedGuild()) return;
        if(!ctx.interaction.member?.voice.channelId || ctx.interaction.member?.voice.channel?.type !== ChannelType.GuildVoice) return ctx.error({error: "You are currently not in a voice channel"})

        await ctx.interaction.reply({content: "Cleaning up..."})

        const recording = await ctx.client.voiceRecorder.endSnippetRecording(ctx.interaction.member.voice.channel as VoiceChannel)
        if(!recording) return ctx.error({error: "Not recording or something else went wrong"})

        const path = ctx.client.voiceRecorder.getLatestRecording()
        if(!path) return ctx.error({error: "Unable to process audio"})

        await new Promise((resolve) => setTimeout(() => resolve(true), 1000 * 5))

        const name = path.split("/").at(-1)
        const url = process.env["DOMAIN"] + `/${name}`
        const upload = await ctx.client.voiceRecorder.uploadAudio(`Meeting ${new Date().toUTCString()}`, url)

        if(!upload?.data?.uploadAudio?.success) return ctx.error({error: `Uploading audio failed, audio available at ${url}`, codeblock: false})

        ctx.interaction.editReply({
            content: `Stopped recording, audio uploaded (available at: ${url})`
        })
    }
}