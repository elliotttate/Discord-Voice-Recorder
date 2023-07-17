import { SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import {existsSync} from "fs"
import {join} from "path"


const command_data = new SlashCommandBuilder()
    .setName("reupload")
    .setDMPermission(false)
    .setDescription(`Upload an already recorded audio to fireflies again`)
    .addStringOption(
        new SlashCommandStringOption()
        .setName("audio_link")
        .setDescription("The name, url or path of the audio")
        .setRequired(true)
    )


export default class extends Command {
    constructor() {
        super({
            name: "reupload",
            command_data: command_data.toJSON(),
            staff_only: false,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const input = ctx.interaction.options.getString("audio_link", true)
        const name = input.split("/").at(-1) ?? "merge.mp3"
        const path = join(__dirname, "/../../recordings", name)

        if(!existsSync(path)) return ctx.error({error: "Unable to find audio"})
        
        const url = process.env["DOMAIN"] + `/${name}`
        const upload = await ctx.client.voiceRecorder.uploadAudio(`Meeting ${new Date().toUTCString()}`, url)
        
        if(!upload?.data?.uploadAudio?.success) return ctx.error({error: `Uploading audio failed`})

        ctx.interaction.reply({
            content: `Uploaded audio to fireflies again: ${url}`
        })
    }
}