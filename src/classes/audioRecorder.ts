import { VoiceChannel, } from "discord.js";
import { AudioRecorderInitOptions } from "../types";
import { DiscordBotClient } from "./client";
import { AudioReceiveStream, EndBehaviorType, NoSubscriberBehavior, VoiceConnectionStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import fs from "fs"
import {join} from "path"
import {opus} from "prism-media"
import {execSync} from "child_process"
import Ffmpeg from "fluent-ffmpeg";
//import { Transform } from 'stream';
import { VoiceRecorder } from "@kirdock/discordjs-voice-recorder";

/*class FillSilenceStream extends Transform {
    private frameSize: number;
    private silenceBuffer: Buffer;
    private isSilence: boolean;

    constructor(frameSize: number) {
        super();
        this.frameSize = frameSize;
        this.silenceBuffer = Buffer.alloc(frameSize);
        this.isSilence = true;
    }

    override _transform(chunk: Buffer, encoding: string, callback: Function) {
        if (chunk.length === 0) {
            if (!this.isSilence) {
                this.isSilence = true;
                this.push(this.silenceBuffer);
            }
        } else {
            if (this.isSilence) {
                this.isSilence = false;
            }
            this.push(chunk);
        }
        callback();
    }
}*/

export class AudioRecorder {
    client: DiscordBotClient
    session_id?: string
    streams: AudioReceiveStream[]
    available: boolean
    voicerecorder: VoiceRecorder | null
    init_id: string | null
    voice_id: string | null
    constructor(options: AudioRecorderInitOptions) {
        this.client = options.client
        this.session_id
        this.streams = []
        this.available = true
        this.voicerecorder = null
        this.init_id = null
        this.voice_id = null
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
            const frameSize = 960; // Adjust frame size as needed
            const outputStream = fs.createWriteStream(join(__dirname, `/../../temprecordings/${member.user.id}.pcm`));

            const stream = receiver.subscribe(member.user.id, {
                end: {
                    behavior: EndBehaviorType.Manual
                }
            })
    
            const fillSilenceStream = new FillSilenceStream(frameSize);

            stream
                .pipe(new opus.Decoder({ frameSize: frameSize, channels: 2, rate: 48000 }))
                .pipe(fillSilenceStream)
                .pipe(outputStream);

            return stream;
        })

        return true;
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
            const ffm = Ffmpeg()
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

    async startKirdockRecording(voiceChannel: VoiceChannel, user_id: string) {
        const test = getVoiceConnection(voiceChannel.guild.id);
        if(test) return false;
        this.available = false;
        this.init_id = user_id
        this.voice_id = voiceChannel.id

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

        this.voicerecorder = new VoiceRecorder({maxUserRecordingLength: 10000000, maxRecordTimeMs: 10000}, this.client);

        this.voicerecorder.startRecording(connection);

        return true;
    }

    async endKirdockRecording(voiceChannel: VoiceChannel) {
        if(!this.voicerecorder) return false;
        
        const test = getVoiceConnection(voiceChannel.guild.id);
        if(!test) return false;

        await this.voicerecorder.getRecordedVoice(fs.createWriteStream(join(__dirname, `/../../public/recordings`, `${Date.now()}.mp3`)), voiceChannel.guildId, "single", 10000000).catch(console.error)

        this.voicerecorder?.stopRecording(test)

        return await new Promise((resolve) => {
            test.once("stateChange", async (_, n) => {
                if(n.status === VoiceConnectionStatus.Destroyed) {
                    console.log("recording ended")
                    this.voicerecorder = null
                    this.available = true
                    this.init_id = null
                    this.voice_id = null
                    resolve(true)
                } resolve(false)
            })

            test.destroy()
        })
    }

    /*
        Whisper transcript
    */


    async startWhisperSnippetRecording(voiceChannel: VoiceChannel) {
        const test = getVoiceConnection(voiceChannel.guild.id);
        if(test) return false;
        this.available = false
        
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
        
        fs.writeFileSync(join(__dirname, `/../../public/transcripts/${transcript_name}.txt`), `Transcript ${new Date().toUTCString()}`)

        async function transcribe(client: DiscordBotClient) {
            if(!transcribe_files.length) return;

            const audio = transcribe_files.shift()

            //@ts-ignore
            const transcription = await client.openai.createTranscription(fs.createReadStream(join(__dirname, `/../../temprecordings`, audio)), "whisper-1").catch(console.error)
            const userid = audio?.replace(".mp3", "").split("-")[1]!
            const user = await client.users.fetch(userid).catch(console.error)
            fs.appendFileSync(join(__dirname, `/../../public/transcripts/${transcript_name}.txt`), `\n\n${user?.username ?? "Unknown User"} said\n------------------------------\n${transcription?.data.text}`)
            await new Promise((resolve) => setTimeout(() => resolve(true), 1000 * 2))

            await transcribe(client)
        }

        await transcribe(this.client)
        
        fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => fs.rmSync(join(__dirname, `/../../temprecordings`, f)))

        this.available = true
        return fs.readFileSync(join(__dirname, `/../../public/transcripts/${transcript_name}.txt`), "utf-8")
    }

    async concatWhisperAudios(fileNames: string[], out_name: string) {
        let //inputStream,
            //currentfile: any,
            //outputStream = fs.createWriteStream(join(__dirname, `/../../temprecordings/${out_name}`)),
            audionames = fileNames.slice()

        if(!audionames.length) return;

        await new Promise((resolve) => {
            const ffm = Ffmpeg(join(__dirname, `/../../temprecordings`, `${fileNames.shift()!}`))
            fileNames.forEach(f => ffm.input(join(__dirname, `/../../temprecordings`, `${f}`)))
            ffm.mergeToFile(join(__dirname, `/../../temprecordings/${out_name}`), join(__dirname, `/../../temp`))
            ffm.on("end", () => resolve(true))
        })


        /*await new Promise((resolve) => {
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
        })*/

        audionames.forEach(a => fs.rmSync(join(__dirname, `/../../temprecordings`, a)))
    }


    async mergeWhisperMP3s() {
        let //inputStream,
            //currentfile: any,
            //outputStream = fs.createWriteStream(join(__dirname, `/../../public/recordings/${Date.now()}.mp3`)),
            audionames = fs.readdirSync(join(__dirname, `/../../temprecordings`)).sort((a, b) => Number(a.split("-")[0] ?? "0") - Number(b.split("-")[0] ?? "0")),
            fileNames = audionames.slice()

        if(!fileNames.length) return;
        
        await new Promise((resolve) => {
            const ffm = Ffmpeg(join(__dirname, `/../../temprecordings`, `${fileNames.shift()!}`))
            fileNames.forEach(f => ffm.input(join(__dirname, `/../../temprecordings`, `${f}`)))
            ffm.mergeToFile(join(__dirname, `/../../public/recordings/${Date.now()}.mp3`), join(__dirname, `/../../temp`))
            ffm.on("end", () => resolve(true))
        })

        /*await new Promise((resolve) => {
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
        })*/
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
        this.available = false
        
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

        if(!chunks?.length) return;

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
        
        execSync(`ffmpeg -loglevel quiet  -f s16le -ar 48000 -ac 2 -i ${join(__dirname, `/../../temprecordings/merge.pcm`)} ${join(__dirname, `/../../public/recordings/${this.session_id}.mp3`)}`)

        const tempdir = join(__dirname, "/../../logs/", Date.now().toString())
        if (!fs.existsSync(tempdir)){
            fs.mkdirSync(tempdir, { recursive: true });
        }

        fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => {
            execSync(`ffmpeg -loglevel quiet  -f s16le -ar 48000 -ac 2 -i ${join(__dirname, `/../../temprecordings/${f}`)} ${join(tempdir, `${f.replace(".pcm", "")}.mp3`)}`)
            fs.rmSync(join(__dirname, `/../../temprecordings`, f))
        })

        this.available = true
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
                query:
`mutation uploadAudio($input: AudioUploadInput) {
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

    async findTranscript(title: string) {
        return await fetch(`https://api.fireflies.ai/graphql`,{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env["FIREFLIES_TOKEN"]}`
            },
            body: JSON.stringify({
                query: `query ($title: String) {
    transcripts (title: $title) {
        title
        transcript_url
    }
}`,
                variables: {
                    title
                }
            })
        }).then(res => res.json())
    }
}