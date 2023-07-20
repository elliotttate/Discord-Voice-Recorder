import { AttachmentBuilder, Colors, EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";


const command_data = new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("dev")
    .setDescription(`Developer only commands`)
    .addSubcommand(
        new SlashCommandSubcommandBuilder()
        .setName("eval")
        .setDescription("Evaluates JS-Code")
        .addStringOption(
            new SlashCommandStringOption()
            .setName("code")
            .setDescription("Code to eval")
            .setRequired(true)
        )
        .addIntegerOption(
            new SlashCommandIntegerOption()
            .setName("depth")
            .setDescription("The depth of inspection")
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("ephemeral")
            .setDescription("Whether to show the reply to others")
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("broadcast")
            .setDescription("Whether to eval on all clusters")
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("file")
            .setDescription("Send a file")
        )
    )
    .addSubcommand(
        new SlashCommandSubcommandBuilder()
        .setName("exec")
        .setDescription("Runs command in terminal")
        .addStringOption(
            new SlashCommandStringOption()
            .setName("command")
            .setDescription("Code to eval")
            .setRequired(true)
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
            .setName("ephemeral")
            .setDescription("Whether to show the reply to others")
        )
    )


function clean(text: string): string {
    if (typeof text === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
    else return text;
}


export default class extends Command {
    constructor() {
        super({
            name: "dev_eval",
            command_data: command_data.toJSON(),
            staff_only: true,
        })
    }

    override async run(ctx: CommandContext): Promise<any> {
        const ephemeral = !!ctx.interaction.options.getBoolean("ephemeral")
        await ctx.interaction.deferReply({ephemeral})
        const broadcast = !!ctx.interaction.options.getBoolean("broadcast")
        const file = !!ctx.interaction.options.getBoolean("file")
        const depth = Number(ctx.interaction.options.getInteger("depth") ?? 0)
        const code_raw = ctx.interaction.options.getString("code", true)

        const code = code_raw.includes("await") ? `(async () => {${code_raw}})(ctx)` : code_raw

        let eval_result;
        let eval_output;


        try {
            if(broadcast) {
                eval_result = await ctx.client.shard?.broadcastEval(
                    async (_c: any, context: {jscode: string}) => {
                        return await eval(context.jscode);
                    }, {context: {jscode: code}}
                )
            } else eval_result = await eval(code);
        } catch(error: any) {
            console.error(error)
            const embed = new EmbedBuilder()
            .addFields({name: ":x: Error:", value: "```js\n" + clean(error) + "```"})
            .setColor(Colors.Red)
            .setTimestamp(Date.now());

            ctx.interaction.editReply({embeds: [embed]})
            return;
        }



        if (typeof eval_result !== "string") eval_output = clean(require("util").inspect(eval_result, {
                depth: depth,
            })).replace(ctx.client.token!, "BOT_TOKEN");
        else eval_output = eval_result.replace(ctx.client.token!, "BOT_TOKEN")
        let dataType = Array.isArray(eval_result) ? "Array<" : typeof eval_result,
              dataTypes: string[] = [];

        if(~dataType.indexOf("<")) {
            eval_result.forEach((d: any) => {
                if (~dataTypes.indexOf(Array.isArray(d) ? "Array" : typeof d)) return;
                dataTypes.push(Array.isArray(d) ? "Array" : typeof d);
            })
            dataType += dataTypes.map((s) => s[0]?.toUpperCase() + s.slice(1)).join(", ") + ">";
        }
        dataType = dataType.substring(0, 1).toUpperCase() + dataType.substring(1);

        let files = []
        if(eval_output.length > 1980 || file) {
            const file = new AttachmentBuilder(Buffer.from(eval_output), {name: `eval-${Date.now()}-${ctx.interaction.user.tag}.js`})
            files.push(file)
            eval_output = "Attached below"
        }
        
        let content = "```js\n" + eval_output + "```\nType `" + dataType + "`";
        await ctx.interaction.editReply({
            content,
            files
        })
    }
}