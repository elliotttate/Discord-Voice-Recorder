import { ChannelType, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";


const command_data = new SlashCommandBuilder()
    .setName("record")
    .setDMPermission(false)
    .setDescription(`Start recording`)


export default class extends Command {
    constructor() {
        super({
            name: "record",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.interaction.inCachedGuild()) return;
        if(!ctx.interaction.member?.voice.channelId || ctx.interaction.member?.voice.channel?.type !== ChannelType.GuildVoice) return ctx.error({error: "You are currently not in a voice channel"})
        await ctx.interaction.deferReply()

        if(!ctx.client.voiceRecorder.available) return ctx.error({error: "I am currently processing audio, please try again later"})

        if(ctx.client.config.useOpenAIWhisper) {
            const recording = await ctx.client.voiceRecorder.startWhisperSnippetRecording(ctx.interaction.member.voice.channel as VoiceChannel)
            if(!recording) return ctx.error({error: "Already recording or something else went wrong"})
        } else if(ctx.client.config.useKirdockRecording) {
            const recording = await ctx.client.voiceRecorder.startKirdockRecording(ctx.interaction.member.voice.channel as VoiceChannel)
            if(!recording) return ctx.error({error: "Already recording or something else went wrong"})
        } else {
            const recording = await ctx.client.voiceRecorder.startSnippetRecording(ctx.interaction.member.voice.channel as VoiceChannel)
            if(!recording) return ctx.error({error: "Already recording or something else went wrong"})
        }

        ctx.interaction.editReply({
            content: `Started recording, use ${await ctx.client.getSlashCommandTag("stop_recording")} to stop the recording`
        })
    }
}