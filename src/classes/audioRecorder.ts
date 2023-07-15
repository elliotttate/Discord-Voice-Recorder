import { VoiceChannel } from "discord.js";
import { AudioRecorderInitOptions } from "../types";
import { DiscordBotClient } from "./client";
import { EndBehaviorType, VoiceConnectionStatus, getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import fs from "fs"
import {join} from "path"
import {opus} from "prism-media"
import {execSync} from "child_process"

export class AudioRecorder {
    client: DiscordBotClient
    session_id?: string
    constructor(options: AudioRecorderInitOptions) {
        this.client = options.client
        this.session_id
    }

    async startRecording(voiceChannel: VoiceChannel) {
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

        console.log(this.session_id)

        this.session_id = voiceChannel.members.get(this.client.user!.id)?.voice.id

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
        
        connection.on("stateChange", (_, n) => {
            if(n.status === VoiceConnectionStatus.Destroyed) {
                console.log("recording ended")
                this.mergeRecordings()
            }
        })
    }

    async endRecording(voiceChannel: VoiceChannel) {
        const connection = getVoiceConnection(voiceChannel.guild.id);
        if(!connection) return;

        connection.destroy()
    }

    private mergeRecordings() {
        let chunks = fs.readdirSync(join(__dirname, `/../../temprecordings`)),
            inputStream,
            currentfile: any,
            outputStream = fs.createWriteStream(join(__dirname, `/../../temprecordings/merge.pcm`))

        chunks.sort((a, b) => Number(b) - Number(a))
        
        const appendFiles = () => {
            if (!chunks.length) {
                outputStream.end();
                this.convertToMP3()
                return;
            }
        
            currentfile = join(__dirname, `/../../temprecordings`, chunks.shift()!)
            inputStream = fs.createReadStream(currentfile);
        
            inputStream.pipe(outputStream, { end: false });
        
            inputStream.on('end', function() {
                appendFiles();
            });
        }
        
        appendFiles()
    }

    private convertToMP3() {
        var dir = join(__dirname, `/../../recordings`);

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        execSync(`ffmpeg -loglevel quiet -f s16le -ar 48000 -ac 2 -i ${join(__dirname, `/../../temprecordings/merge.pcm`)} ${join(__dirname, `/../../recordings/${this.session_id}.mp3`)}`)

        console.log(join(__dirname, `/../../temprecordings`))

        //fs.rmSync(join(__dirname, `/../../temprecordings`), {recursive: true})

        this.session_id = undefined
    }
}