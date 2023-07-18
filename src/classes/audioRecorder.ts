import { VoiceChannel, } from "discord.js";
import { AudioRecorderInitOptions } from "../types";
import { DiscordBotClient } from "./client";
import { AudioReceiveStream, EndBehaviorType, NoSubscriberBehavior, VoiceConnectionStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import fs from "fs"
import {join} from "path"
import {opus} from "prism-media"
import {execSync} from "child_process"

export class AudioRecorder {
    client: DiscordBotClient
    session_id?: string
    streams: AudioReceiveStream[]
    constructor(options: AudioRecorderInitOptions) {
        this.client = options.client
        this.session_id
        this.streams = []
    }


    /*async startWholeRecording(voiceChannel: VoiceChannel) {
        const test = getVoiceConnection(voiceChannel.guild.id);
        if(test) return;

        var dir = join(__dirname, `/../../temprecordings`);

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        this.session_id = `${Date.now()}`
        
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false
        })

        if(this.client.config.playIntroMessage) {
            const player = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})
            const resource = createAudioResource(join(__dirname, "/../../intro.mp3"))
            player.play(resource)
            connection.subscribe(player)
            await new Promise((resolve) => setTimeout(() => resolve(player.stop()), 4200))
        }

        const receiver = connection.receiver

        this.streams = voiceChannel.members.filter(m => m.user.id !== this.client.user!.id).map(member => {
            const stream = receiver.subscribe(member.user.id, {
                end: {
                    behavior: EndBehaviorType.Manual
                }
            })
    
            stream
            .pipe(new opus.Decoder({frameSize: 960, channels: 2, rate: 48000}))
            .pipe(fs.createWriteStream(join(__dirname, `/../../temprecordings/${member.user.id}.pcm`)))

            return stream

            // continuous audio, sounds like trash
            /**
             * 
             *             const stream = receiver.subscribe(member.user.id, {
                end: {
                    behavior: EndBehaviorType.Manual
                }
            })

            let buffer: any[] = []

            let userStream = new Readable({
                read() {
                    setTimeout(() => {
                        console.log("pushing")
                        if (buffer.length > 0) {
                            this.push(buffer.shift());
                        }
                        else {
                            this.push(SILENCE);
                        }
                    }, 0.020833);
                }
            })

            stream
            .pipe(new opus.Decoder({frameSize: 960, channels: 2, rate: 48000}))
            .on("data", chunk => buffer.push(chunk))
            .on("close", () => userStream.push(null))
    
            userStream.pipe(fs.createWriteStream(join(__dirname, `/../../temprecordings/${member.user.id}.pcm`)))

            return stream
             * /
        })
    }

    async endWholeRecording(voiceChannel: VoiceChannel) {
        const connection = getVoiceConnection(voiceChannel.guild.id);
        if(!connection) return;

        return await new Promise((resolve) => {
            connection.once("stateChange", async (_, n) => {
                if(n.status === VoiceConnectionStatus.Destroyed) {
                    console.log("recording ended")
                    await this.mergeAudios()
                    resolve(true)
                }
            })

            this.streams.map(s => s.destroy())

            connection.destroy()
        })
    }

    private async mergeAudios() {
        let audios = fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => f.replace(".pcm", "")),
            outputStream = fs.createWriteStream(join(__dirname, `/../../temprecordings/merge.pcm`))

        const done = await new Promise((resolve) => {
            const ffm = ffmpeg()
            audios.forEach(a => ffm.addInput(join(__dirname, `/../../temprecordings`, `${a}.pcm`)))
            ffm.complexFilter([
                {
                    filter: "amix",
                    options: {
                        inputs: audios.length
                    }
                }
            ])
            .inputFormat("s16le")
            .outputFormat("s16le")
            .output(outputStream)
            .on("end", () => {
                console.log("done merging")
                resolve(true)
            })
            .run()
        })
        console.log("done", done)
        if(done) this.convertToMP3()
    }*/

    /*
        Whisper transcript
    */


    async startWhisperSnippetRecording(voiceChannel: VoiceChannel) {
        const test = getVoiceConnection(voiceChannel.guild.id);
        if(test) return false;
        
        fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => fs.rmSync(join(__dirname, `/../../temprecordings`, f)))

        var dir = join(__dirname, `/../../temprecordings`);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        
        var dir = join(__dirname, `/../../public/transcripts`);
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        this.session_id = `${Date.now()}`
        
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false
        })

        if(this.client.config.playIntroMessage) {
            const player = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})
            const resource = createAudioResource(join(__dirname, "/../../intro.mp3"))
            player.play(resource)
            connection.subscribe(player)
            await new Promise((resolve) => setTimeout(() => resolve(player.stop()), 4200))
        }

        const receiver = connection.receiver

        //https://github.com/discordjs/voice/issues/209
        connection.receiver.speaking.on("start", userId => {
            const stream = receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterSilence,
                    duration: 100
                }
            })

            let audio_id = `${Date.now()}-${userId}`

            stream
            .pipe(new opus.Decoder({frameSize: 960, channels: 2, rate: 48000}))
            .pipe(fs.createWriteStream(join(__dirname, `/../../temprecordings/${audio_id}.pcm`)))
            .on("finish", () => {
                execSync(`ffmpeg -loglevel quiet  -f s16le -ar 48000 -ac 2 -i ${join(__dirname, `/../../temprecordings/${audio_id}.pcm`)} ${join(__dirname, `/../../temprecordings/${audio_id}.mp3`)}`)
                fs.rmSync(join(__dirname, `/../../temprecordings`, `${audio_id}.pcm`))
            })
        })

        return true
    }

    async endWhisperSnippetRecording(voiceChannel: VoiceChannel, transcript_name: string) {
        const connection = getVoiceConnection(voiceChannel.guild.id);
        if(!connection) return false;

        return await new Promise((resolve) => {
            connection.once("stateChange", async (_, n) => {
                if(n.status === VoiceConnectionStatus.Destroyed) {
                    console.log("recording ended")
                    await this.processWhisperSnippets(transcript_name)
                    resolve(true)
                }
            })

            connection.destroy()
        })
    }

    async processWhisperSnippets(transcript_name: string) {
        await this.mergeWhisperMP3s()
        const snippets = fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => {
            const [timestamp, userid] = f.replace(".mp3", "").split("-")
            return {timestamp: Number(timestamp ?? "0"), userid: userid!}
        })

        const cut_together: {userid: string, snippets: number[]}[] = []
        snippets.sort((a, b) => a.timestamp - b.timestamp).forEach((snippet) => {
            if(cut_together.at(-1)?.userid === snippet.userid) cut_together.at(-1)?.snippets.push(snippet.timestamp)
            else cut_together.push({userid: snippet.userid, snippets: [snippet.timestamp]})
        })
        

        for(let snippets of cut_together) {
            if(snippets.snippets.length <= 1) continue;
            await this.concatWhisperAudios(snippets.snippets.map(s => `${s}-${snippets.userid}.mp3`), `${snippets.snippets[0]}-${snippets.userid}-concat.mp3`)
        }

        const transcribe_files = fs.readdirSync(join(__dirname, `/../../temprecordings`)).sort((a, b) => Number(a.split("-")[0] ?? "0") - Number(b.split("-")[0] ?? "0"))

        const transcript: string[] = []

        async function transcribe(client: DiscordBotClient) {
            if(!transcribe_files.length) return;

            const audio = transcribe_files.shift()

            //@ts-ignore
            const transcription = await client.openai.createTranscription(fs.createReadStream(join(__dirname, `/../../temprecordings`, audio)), "whisper-1").catch(console.error)
            const userid = audio?.replace(".mp3", "").split("-")[1]!
            const user = await client.users.fetch(userid).catch(console.error)

            transcript.push(`${user?.username ?? "Unknown User"} said\n------------------------------\n${transcription?.data.text}`)
            
            await new Promise((resolve) => setTimeout(() => resolve(true), 1000 * 2))

            await transcribe(client)
        }

        await transcribe(this.client)

        const final_transcript = transcript.join("\n\n")

        fs.writeFileSync(join(__dirname, `/../../public/transcripts/${transcript_name}.txt`), final_transcript)
        
        fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => fs.rmSync(join(__dirname, `/../../temprecordings`, f)))

        return final_transcript
    }

    async concatWhisperAudios(fileNames: string[], out_name: string) {
        let inputStream,
            currentfile: any,
            outputStream = fs.createWriteStream(join(__dirname, `/../../temprecordings/${out_name}`)),
            audionames = fileNames.slice()

        await new Promise((resolve) => {
            const appendFiles = () => {
                if (!fileNames.length) {
                    outputStream.end();
                    resolve(true)
                    return;
                }
            
                currentfile = join(__dirname, `/../../temprecordings`, `${fileNames.shift()!}`)
    
                inputStream = fs.createReadStream(currentfile);
            
                inputStream.pipe(outputStream, { end: false });
            
                inputStream.on('end', function() {
                    appendFiles();
                });
            }
            
            appendFiles()
        })

        audionames.forEach(a => fs.rmSync(join(__dirname, `/../../temprecordings`, a)))
    }


    async mergeWhisperMP3s() {
        let inputStream,
            currentfile: any,
            outputStream = fs.createWriteStream(join(__dirname, `/../../public/recordings/${Date.now()}.mp3`)),
            audionames = fs.readdirSync(join(__dirname, `/../../temprecordings`)).sort((a, b) => Number(a.split("-")[0] ?? "0") - Number(b.split("-")[0] ?? "0")),
            fileNames = audionames.slice()

        await new Promise((resolve) => {
            const appendFiles = () => {
                if (!fileNames.length) {
                    outputStream.end();
                    resolve(true)
                    return;
                }
            
                currentfile = join(__dirname, `/../../temprecordings`, `${fileNames.shift()!}`)
    
                inputStream = fs.createReadStream(currentfile);
            
                inputStream.pipe(outputStream, { end: false });
            
                inputStream.on('end', function() {
                    appendFiles();
                });
            }
            
            appendFiles()
        })
    }


    getLatestTranscript() {
        const latest = fs.readdirSync(join(__dirname, `/../../public/transcripts`)).map(f => f.replace(".txt", "")).sort((a, b) => Number(b) - Number(a)).at(0)
        if(!latest) return null
        return join(__dirname, `/../../public/transcripts`, `${latest}.txt`)
    }


    /*
        Audio snippets after each other
    */

    async startSnippetRecording(voiceChannel: VoiceChannel) {
        const test = getVoiceConnection(voiceChannel.guild.id);
        if(test) return false;
        
        fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => fs.rmSync(join(__dirname, `/../../temprecordings`, f)))

        var dir = join(__dirname, `/../../temprecordings`);

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        this.session_id = `${Date.now()}`
        
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false
        })

        if(this.client.config.playIntroMessage) {
            const player = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}})
            const resource = createAudioResource(join(__dirname, "/../../intro.mp3"))
            player.play(resource)
            connection.subscribe(player)
            await new Promise((resolve) => setTimeout(() => resolve(player.stop()), 4200))
        }

        const receiver = connection.receiver

        //https://github.com/discordjs/voice/issues/209
        connection.receiver.speaking.on("start", userId => {
            const stream = receiver.subscribe(userId, {
                end: {
                    behavior: EndBehaviorType.AfterSilence,
                    duration: 100
                }
            })

            stream
            .pipe(new opus.Decoder({frameSize: 960, channels: 2, rate: 48000}))
            .pipe(fs.createWriteStream(join(__dirname, `/../../temprecordings/${Date.now()}.pcm`)))
        })

        return true
    }

    async endSnippetRecording(voiceChannel: VoiceChannel) {
        const connection = getVoiceConnection(voiceChannel.guild.id);
        if(!connection) return false;

        return await new Promise((resolve) => {
            connection.once("stateChange", async (_, n) => {
                if(n.status === VoiceConnectionStatus.Destroyed) {
                    console.log("recording ended")
                    await this.mergeSnippets()
                    resolve(true)
                }
            })

            connection.destroy()
        })
    }

    private async mergeSnippets() {
        let chunks = fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => f.replace(".pcm", "")),
            inputStream,
            currentfile: any,
            outputStream = fs.createWriteStream(join(__dirname, `/../../temprecordings/merge.pcm`))

        chunks.sort((a, b) => Number(a) - Number(b))

        const done = await new Promise((resolve) => {
            const appendFiles = () => {
                if (!chunks.length) {
                    outputStream.end();
                    resolve(true)
                    return;
                }
            
                currentfile = join(__dirname, `/../../temprecordings`, `${chunks.shift()!}.pcm`)
    
                inputStream = fs.createReadStream(currentfile);
            
                inputStream.pipe(outputStream, { end: false });
            
                inputStream.on('end', function() {
                    appendFiles();
                });
            }
            
            appendFiles()
        })
        
        if(done) this.convertToMP3()
    }

    private convertToMP3() {
        var dir = join(__dirname, `/../../public/recordings`);

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        
        execSync(`ffmpeg -loglevel quiet  -f s16le -ar 48000 -ac 2 -i ${join(__dirname, `/../../temprecordings/merge.pcm`)} ${join(__dirname, `/../../recordings/${this.session_id}.mp3`)}`)

        fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => fs.rmSync(join(__dirname, `/../../temprecordings`, f)))

        this.session_id = undefined
    }

    getLatestRecording() {
        const latest = fs.readdirSync(join(__dirname, `/../../public/recordings`)).map(f => f.replace(".mp3", "")).sort((a, b) => Number(b) - Number(a)).at(0)
        if(!latest) return null
        return join(__dirname, `/../../public/recordings`, `${latest}.mp3`)
    }

    async uploadAudio(title: string, url: string) {
        return await fetch(`https://api.fireflies.ai/graphql`,{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env["FIREFLIES_TOKEN"]}`
            },
            body: JSON.stringify({
                query: `mutation($input: AudioUploadInput) {
    uploadAudio(input: $input) {
        success
        title
        message
    }
}`,
                variables: {
                    input: {
                        url,
                        title
                    }
                }
            })
        }).then(res => res.json())
    }
}