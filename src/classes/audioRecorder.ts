import { VoiceChannel } from "discord.js";
import { AudioRecorderInitOptions } from "../types";
import { DiscordBotClient } from "./client";
import { AudioReceiveStream, EndBehaviorType, NoSubscriberBehavior, VoiceConnectionStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import fs from "fs"
import {join} from "path"
import {opus} from "prism-media"
import {execSync} from "child_process"
import ffmpeg from "fluent-ffmpeg"

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
        Audio snippets after each other
    */

    async startSnippetRecording(voiceChannel: VoiceChannel) {
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
        connection.receiver.speaking.on("end", console.log)
    }

    async endSnippetRecording(voiceChannel: VoiceChannel) {
        const connection = getVoiceConnection(voiceChannel.guild.id);
        if(!connection) return;

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

        chunks.sort((a, b) => Number(b) - Number(a))

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
        var dir = join(__dirname, `/../../recordings`);

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        
        execSync(`ffmpeg -loglevel quiet  -f s16le -ar 48000 -ac 2 -i ${join(__dirname, `/../../temprecordings/merge.pcm`)} ${join(__dirname, `/../../recordings/${this.session_id}.mp3`)}`)

        fs.readdirSync(join(__dirname, `/../../temprecordings`)).map(f => fs.rmSync(join(__dirname, `/../../temprecordings`, f)))

        this.session_id = undefined
    }

    getLatestRecording() {
        const latest = fs.readdirSync(join(__dirname, `/../../recordings`)).map(f => f.replace(".mp3", "")).sort((a, b) => Number(b) - Number(a)).at(0)
        if(!latest) return null
        return join(__dirname, `/../../recordings`, `${latest}.mp3`)
    }
}