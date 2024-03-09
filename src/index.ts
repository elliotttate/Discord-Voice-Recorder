import {readFileSync} from "fs"
import {ActivityType, ApplicationCommandType, AttachmentBuilder, InteractionType, PresenceUpdateStatus, VoiceChannel} from "discord.js";
import { DiscordBotClient } from "./classes/client";
import { handleCommands } from "./handlers/commandHandler";
import { handleAutocomplete } from "./handlers/autocompleteHandler";
import fastify from "fastify";
import fastify_cors from "@fastify/cors"
import fastify_static from "@fastify/static"
import {join} from "path"

const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/
for (const line of readFileSync(`${process.cwd()}/.env`, 'utf8').split(/[\r\n]/)) {
    const [, key, value] = line.match(RE_INI_KEY_VAL) || []
    if (!key) continue

    process.env[key] = value?.trim()
}

const client = new DiscordBotClient({
    intents: ["Guilds", "GuildMembers", "GuildVoiceStates"]
})


client.login(process.env["DISCORD_TOKEN"])

const app = fastify({
    ignoreTrailingSlash: false,
    bodyLimit: 4096,
    trustProxy: true
});

app.register(fastify_cors, {
    origin: '*',
});

app.register(fastify_static, {
    root: join(__dirname, '../public')
});

app.listen({port: Number(process.env["API_PORT"]), host: "localhost"}, (err, address) => {
    if (err) console.log(err)
    else console.log(`${app.printRoutes()}\n\nOnline at ${address}`)
});

client.on("ready", async () => {
    client.commands.loadClasses().catch(console.error)
    client.user?.setPresence({activities: [{type: ActivityType.Listening, name: "your meetings"}], status: PresenceUpdateStatus.DoNotDisturb, })
    console.log(`Ready`)
    await client.application?.commands.set([...client.commands.createPostBody()]).catch(console.error)
})

client.on("interactionCreate", async (interaction) => {
    switch(interaction.type) {
        case InteractionType.ApplicationCommand: {
            switch(interaction.commandType) {
                case ApplicationCommandType.ChatInput: {
                    return await handleCommands(interaction, client);
                }
                default: return;
            }
        };
        case InteractionType.ApplicationCommandAutocomplete: {
			return await handleAutocomplete(interaction, client);
        };
    }
})

client.on("voiceStateUpdate", async (o, n) => {
    /*if(!client.voiceRecorder.available && client.voiceRecorder.init_id) {
        if(o.channelId !== n.channelId && o.channelId === client.voiceRecorder.voice_id && o.member?.id === client.voiceRecorder.init_id) {
            o.channel?.send(`<@${client.voiceRecorder.init_id}> don't forget to use ${await client.getSlashCommandTag("stop_recording")} when you are done`)
        }
    }*/

    if(!o.channel && client.config.autoStartRecording && n.channel?.members.size === 1) {
        console.log("recording started")
        if(!client.voiceRecorder.available) {
            n.channel.send({
                content: `<@${n.member?.id}>, I tried to start the recording but I am already recording in <#${client.voiceRecorder.voice_id}>.`
            })
        }

        // start recording in this channel
        if(client.config.useOpenAIWhisper) {
            const recording = await client.voiceRecorder.startWhisperSnippetRecording(n.channel as VoiceChannel)
            if(!recording) {
                n.channel.send({
                    content: `<@${n.member?.id}>, I tried to start the recording but I am already recording or something else went wrong.`
                })
                return;
            }
        } else if(client.config.useKirdockRecording) {
            const recording = await client.voiceRecorder.startKirdockRecording(n.channel as VoiceChannel, n.member?.id!)
            if(!recording) {
                n.channel.send({
                    content: `<@${n.member?.id}>, I tried to start the recording but I am already recording or something else went wrong.`
                })
                return;
            }
        } else {
            const recording = await client.voiceRecorder.startSnippetRecording(n.channel as VoiceChannel)
            if(!recording) {
                n.channel.send({
                    content: `<@${n.member?.id}>, I tried to start the recording but I am already recording or something else went wrong.`
                })
                return;
            }
        }

        n.channel.send({
            content: `<@${n.member?.id}>, I started the recording.\nWhen everybody left I will end the recording.\nYou can also end the recording using  ${await client.getSlashCommandTag("stop_recording")}`
        })
    }

    if(o.channel && !n.channel && client.config.autoStartRecording && o.channel?.members.size === 1 && o.channel.members.first()?.id === client.user?.id && !client.voiceRecorder.available && client.voiceRecorder.voice_id === o.channelId) {
        if(client.config.useOpenAIWhisper) {
            const name = Date.now().toString()

            
            const msg = await o.channel.send({
                content: `Processing transcript...\nLive version can be fount at ${process.env["DOMAIN"] + `/transcripts/${name}.txt`}`
            })
            await client.voiceRecorder.endWhisperSnippetRecording(o.channel as VoiceChannel, name)

            const file = new AttachmentBuilder(readFileSync(join(__dirname, `/../../public/transcripts/${name}.txt`)), {name: `Transcript-${name}.txt`})

            const chatgpt = await client.openai.createChatCompletion({
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
            
            const path = client.voiceRecorder.getLatestRecording()
            if(!path) {
                await msg.edit({
                    content: `Unable to process audio`
                })
                return
            }

            const audioname = path.split(/(\/|\\)/).at(-1)
            const url = process.env["DOMAIN"] + `/recordings/${audioname}`

            const summary_file = new AttachmentBuilder(Buffer.from(summary), {name: `summary-${name}.txt`})
            await msg.reply({content: `This is the transcript, it is also available at ${process.env["DOMAIN"] + `/transcripts/${name}.txt`}\nThe audio is available at ${url}`, files: [file, summary_file]})
        } else if (client.config.useKirdockRecording) {
            const recording = await client.voiceRecorder.endKirdockRecording(o.channel as VoiceChannel)
            if(!recording) {
                await o.channel.send({
                    content: "Not recording or something else went wrong"
                })
                return
            }
            
            const path = client.voiceRecorder.getLatestRecording()
            if(!path) {
                await o.channel.send({
                    content: `Unable to process audio`
                })
                return
            }

            const name = path.split(/(\/|\\)/).at(-1)
            const url = process.env["DOMAIN"] + `/recordings/${name}`
            const meetingname = `Meeting ${new Date().toUTCString()}`
            const upload = await client.voiceRecorder.uploadAudio(meetingname, url)

            if(upload.errors) console.log(upload.errors[0].extensions.metadata, upload.errors[0])
            if(!upload?.data?.uploadAudio?.success) {
                await o.channel.send({
                    content: `Uploading audio failed, audio available at ${url}`
                })
                return
            }

            const msg = await o.channel.send({
                content: `Stopped recording, available at ${url}`
            })
            
            let max = 0

            function sendTranscriptURL() {
                setTimeout(async () => {
                    if(max >= 5) return msg.reply({content: "Transcript can be viewed on fireflies after the transcription is done"})
                    const transcript = await client.voiceRecorder.findTranscript(meetingname).then(res => res?.data?.transcripts?.at(0))
                    ++max
                    if(!transcript) return sendTranscriptURL()
                    else msg.reply({content: `Fireflies Transcript available at ${transcript.transcript_url}`})
                }, 1000 * 30)
            }

            sendTranscriptURL()
        } else {
            const recording = await client.voiceRecorder.endSnippetRecording(o.channel as VoiceChannel)
            if(!recording) {
                await o.channel.send({
                    content: "Not recording or something else went wrong"
                })
                return
            }
            
            const path = client.voiceRecorder.getLatestRecording()
            if(!path) {
                await o.channel.send({
                    content: `Unable to process audio`
                })
                return
            }

            const name = path.split(/(\/|\\)/).at(-1)
            const url = process.env["DOMAIN"] + `/recordings/${name}`
            const meetingname = `Meeting ${new Date().toUTCString()}`
            const upload = await client.voiceRecorder.uploadAudio(meetingname, url)

            if(upload.errors) console.log(upload.errors[0].extensions.metadata, upload.errors[0])
            if(!upload?.data?.uploadAudio?.success) {
                await o.channel.send({
                    content: `Uploading audio failed, audio available at ${url}`
                })
                return
            }

            const msg = await o.channel.send({
                content: `Stopped recording, available at ${url}`
            })
            
            let max = 0

            function sendTranscriptURL() {
                setTimeout(async () => {
                    if(max >= 5) return msg.reply({content: "Transcript can be viewed on fireflies after the transcription is done"})
                    const transcript = await client.voiceRecorder.findTranscript(meetingname).then(res => res?.data?.transcripts?.at(0))
                    ++max
                    if(!transcript) return sendTranscriptURL()
                    else msg.reply({content: `Fireflies Transcript available at ${transcript.transcript_url}`})
                }, 1000 * 30)
            }

            sendTranscriptURL()
        }
    }
})