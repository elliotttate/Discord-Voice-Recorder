import SuperMap from "@thunder04/supermap";
import { Client, ClientOptions } from "discord.js";
import { readFileSync } from "fs";
import { Store } from "../stores/store";
import { Config, StoreTypes } from "../types";
import { AudioRecorder } from "./audioRecorder";

export class DiscordBotClient extends Client {
	commands: Store;
    config: Config
	cache: SuperMap<string, any>
	voiceRecorder: AudioRecorder

	constructor(options: ClientOptions) {
		super(options);
		this.commands = new Store({files_folder: "/commands", load_classes_on_init: false, storetype: StoreTypes.COMMANDS});
        this.config = {}
		this.cache = new SuperMap({
			intervalTime: 1000
		})
        this.loadConfig()
		this.voiceRecorder = new AudioRecorder({client: this})
	}

    loadConfig() {
        const config = JSON.parse(readFileSync("./config.json").toString())
        this.config = config as Config
    }

	async getSlashCommandTag(name: string) {
		const commands = await this.application?.commands.fetch()
		if(!commands?.size) return `/${name}`
		else if(commands?.find(c => c.name === name)?.id) return `</${name}:${commands?.find(c => c.name === name)!.id}>`
		else return `/${name}`
	}
}
