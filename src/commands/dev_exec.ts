import { AttachmentBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import {exec} from "child_process"


export default class extends Command {
    constructor() {
        super({
            name: "dev_exec",
            staff_only: true,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const ephemeral = !!ctx.interaction.options.getBoolean("ephemeral")
        await ctx.interaction.deferReply({ephemeral})
        const command = ctx.interaction.options.getString("command", true)

        exec(command, {encoding: "utf-8"}, async (error, stdout: string, stderr: string) => {
            let res = error ? stderr : stdout
            let out = `**Output**\n\`\`\`js\n${res}\`\`\`\n**Input**\n\`\`\`${command}\`\`\``
            const files = []

            if(out.length > 2000) {
                const file = new AttachmentBuilder(Buffer.from(res), {name: `exec-${Date.now()}-${ctx.interaction.user.tag}.txt`})
                files.push(file)
                out = "Attached below"
            }

            await ctx.interaction.editReply({
                content: out,
                files
            })
        })
    }
}