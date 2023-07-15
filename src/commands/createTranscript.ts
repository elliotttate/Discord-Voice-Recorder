import { AttachmentBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import {readFileSync} from "fs"


const command_data = new SlashCommandBuilder()
    .setName("createtranscript")
    .setDMPermission(false)
    .setDescription(`End recording`)
    .addStringOption(
        new SlashCommandStringOption()
        .setName("meeting_name")
        .setDescription("The name for the meeting")
        .setRequired(true)
    )


export default class extends Command {
    constructor() {
        super({
            name: "createtranscript",
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

        const res = await ctx.interaction.editReply({
            content: "Creating transcription for file below...",
            files: [file]
        })

        const audio_url = res.attachments.first()!.url

        console.log(audio_url)

        const upload = await fetch(`https://api.fireflies.ai/graphql`,{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env["FIREFLIES_TOKEN"]}`
            },
            body: JSON.stringify({
                query: `
                    mutation($input: AudioUploadInput) {
                        uploadAudio(input: $input) {
                            success
                            title
                            message
                        }
                    }
                `,
                input: {
                    url: audio_url,
                    title: ctx.interaction.options.getString("meeting_name", true),
                    attendees: []
                }
            })
        }).then(res => res)

        console.log(upload)
        console.log((await upload.json()).errors[0])

        ctx.interaction.editReply({
            content: "Audio uploaded",
            files: []
        })
    }
}