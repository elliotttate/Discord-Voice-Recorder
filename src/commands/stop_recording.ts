import { AttachmentBuilder, ChannelType, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import {readFileSync} from "fs"
import {join} from "path"


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
        
        if(ctx.client.config.useOpenAIWhisper) {
            const name = Date.now().toString()

            const msg = await ctx.interaction.editReply({content: `Processing transcript...\nLive version can be fount at ${process.env["DOMAIN"] + `/transcripts/${name}.txt`}`})
            await ctx.client.voiceRecorder.endWhisperSnippetRecording(ctx.interaction.member.voice.channel as VoiceChannel, name)

            const file = new AttachmentBuilder(readFileSync(join(__dirname, `/../../public/transcripts/${name}.txt`)), {name: `Transcript-${name}.txt`})

            const chatgpt = await ctx.client.openai.createChatCompletion({
                model: "gpt-3.5-turbo-16k",
                messages: [
                    {
                        role: "system",
                        content: "You are a AI conversation tool, you summarize the given conversation and provide the most important bullet points."
                    },
                    {
                        role: "user",
                        content: `Summarize the following conversation and provide bullet points:\n\n${readFileSync(join(__dirname, `/../../public/transcripts/${name}.txt`)).toString("utf-8")}`
                    }
                ]
            })

            const summary = chatgpt.data.choices[0]!.message?.content ?? "No summary"
            
            const path = ctx.client.voiceRecorder.getLatestRecording()
            if(!path) return ctx.error({error: "Unable to process audio"})

            const audioname = path.split(/(\/|\\)/).at(-1)
            const url = process.env["DOMAIN"] + `/recordings/${audioname}`

            const summary_file = new AttachmentBuilder(Buffer.from(summary), {name: `summary-${name}.txt`})
            await msg.reply({content: `This is the transcript, it is also available at ${process.env["DOMAIN"] + `/transcripts/${name}.txt`}\nThe audio is available at ${url}`, files: [file, summary_file]})
        } else if (ctx.client.config.useKirdockRecording) {
            const recording = await ctx.client.voiceRecorder.endKirdockRecording(ctx.interaction.member.voice.channel as VoiceChannel)
            if(!recording) return ctx.error({error: "Not recording or something else went wrong"})
            
            const path = ctx.client.voiceRecorder.getLatestRecording()
            if(!path) return ctx.error({error: "Unable to process audio"})

            const name = path.split(/(\/|\\)/).at(-1)
            const url = process.env["DOMAIN"] + `/recordings/${name}`
            const meetingname = `Meeting ${new Date().toUTCString()}`
            const upload = await ctx.client.voiceRecorder.uploadAudio(meetingname, url)

            if(!upload?.data?.uploadAudio?.success) return ctx.error({error: `Uploading audio failed, audio available at ${url}`, codeblock: false})

            const msg = await ctx.interaction.editReply({
                content: `Stopped recording, available at ${url}`
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
        } else {
            const recording = await ctx.client.voiceRecorder.endSnippetRecording(ctx.interaction.member.voice.channel as VoiceChannel)
            if(!recording) return ctx.error({error: "Not recording or something else went wrong"})
            
            const path = ctx.client.voiceRecorder.getLatestRecording()
            if(!path) return ctx.error({error: "Unable to process audio"})

            const name = path.split(/(\/|\\)/).at(-1)
            const url = process.env["DOMAIN"] + `/recordings/${name}`
            const meetingname = `Meeting ${new Date().toUTCString()}`
            const upload = await ctx.client.voiceRecorder.uploadAudio(meetingname, url)

            if(!upload?.data?.uploadAudio?.success) return ctx.error({error: `Uploading audio failed, audio available at ${url}`, codeblock: false})

            const msg = await ctx.interaction.editReply({
                content: `Stopped recording, available at ${url}`
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
}