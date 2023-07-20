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
        if(ctx.client.config.useOpenAIWhisper) return ctx.error({error: "Transcripts are generated using whisper and not uploaded to fireflies"})
        const input = ctx.interaction.options.getString("audio_link", true)
        const name = input.split("/").at(-1) ?? "merge.mp3"
        const path = join(__dirname, "/../../public/recordings", name)

        if(!existsSync(path)) return ctx.error({error: "Unable to find audio"})
        
        const url = process.env["DOMAIN"] + `/recordings/${name}`
        const meetingname = `Meeting ${new Date().toUTCString()}`
        const upload = await ctx.client.voiceRecorder.uploadAudio(meetingname, url)
        
        if(!upload?.data?.uploadAudio?.success) return ctx.error({error: `Uploading audio failed`})

        const meeting = await ctx.client.voiceRecorder.findTranscript(meetingname)
        console.log(meeting.data.transcripts)

        const msg = await ctx.interaction.reply({
            content: `Uploaded audio to fireflies again: ${url}`,
            fetchReply: true
        })

        let max = 0

        function sendTranscriptURL() {
            setTimeout(async () => {
                if(max >= 5) return msg.reply({content: "Transcript can be viewed on fireflies after the transcription is done"})
                const transcript = await ctx.client.voiceRecorder.findTranscript(meetingname).then(res => res?.data?.transcripts?.at(0))
                ++max
                if(!transcript) return sendTranscriptURL()
                else msg.reply({content: `Fireflies Transcript available at ${transcript.transcript_url}`})
            }, 1000 * 30)
        }

        sendTranscriptURL()
    }
}