import { AttachmentBuilder, ChannelType, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import {readFileSync} from "fs"


const command_data = new SlashCommandBuilder()
    .setName("end")
    .setDMPermission(false)
    .setDescription(`End recording`)


export default class extends Command {
    constructor() {
        super({
            name: "end",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        if(!ctx.interaction.inCachedGuild()) return;
        if(!ctx.interaction.member?.voice.channelId || ctx.interaction.member?.voice.channel?.type !== ChannelType.GuildVoice) return ctx.error({error: "You are currently not in a voice channel"})

        await ctx.interaction.reply({content: "Cleaning up...", ephemeral: true})

        await ctx.client.voiceRecorder.endWholeRecording(ctx.interaction.member.voice.channel as VoiceChannel)

        const path = ctx.client.voiceRecorder.getLatestRecording()
        if(!path) return ctx.error({error: "Unable to process audio"})

        const file = new AttachmentBuilder(readFileSync(path), {name: `Recording-${ctx.interaction.user.id}-${new Date().toISOString()}.mp3`})

        ctx.interaction.editReply({
            content: "Done",
            files: [file]
        })
    }
}