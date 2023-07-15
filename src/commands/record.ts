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

        ctx.client.voiceRecorder.startWholeRecording(ctx.interaction.member.voice.channel as VoiceChannel)

        ctx.interaction.reply({
            content: "Done",
            ephemeral: true
        })
    }
}