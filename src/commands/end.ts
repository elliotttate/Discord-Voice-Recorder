import { ChannelType, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { AutocompleteContext } from "../classes/autocompleteContext";


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

        ctx.client.voiceRecorder.endRecording(ctx.interaction.member.voice.channel as VoiceChannel)

        ctx.interaction.reply({
            content: "Done",
            ephemeral: true
        })
    }

    override async autocomplete(context: AutocompleteContext): Promise<any> {
        return context.error()
    }
}