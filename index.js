const {Client, RichEmbed, Attachment} = require("discord.js");
const sql = require("sequelize");
let settings = require("./settings.json")
const Bot = new Client();
const sequelize = new sql('database', 'user', 'password', {
    operatorsAliases: false,
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'storage.sqlite',
});
const DB = sequelize.define("data", {
    server: sql.TEXT,
    prefix: sql.STRING,
    inH: sql.BOOLEAN,
    channels: sql.TEXT
});
const MMS = sequelize.define("memes", {
    meme: sql.STRING,
    server: sql.STRING
});
Bot.servers = new Map();
Bot.on("ready", async () => {
    Bot.app = await Bot.fetchApplication();
    await MMS.sync();
    await DB.sync();
    Bot.guilds.forEach(async g => {
        let o = {};
        let dg = await DB.findOne({ where: { server: g.id } });
        if(dg){
            o.prefix = dg.prefix;
            o.channels = new Map(JSON.parse(dg.channels))
            o.inHouse = dg.inH;
        }else{
            o.prefix = settings.prefix;
            o.channels = new Map();
            o.inHouse = false;
            await DB.create({
                server: g.id,
                prefix: o.prefix,
                inH: false,
                channels: JSON.stringify(Array.from(o.channels)),
            });
        }
        o.guild = g;
        Bot.servers.set(g.id, o);
    })
    console.log(`Ready on ${Bot.guilds.size} Servers for a total of ${Bot.users.size} Users`);
})
Bot.on("message", Msg => {
    if(Msg.author.bot)return;
    if(Msg.channel.type == "dm")return;
    let ServerSettings = Bot.servers.get(Msg.guild.id);
    if(Msg.content.startsWith(ServerSettings.prefix)){
        handleCommand(Msg, ServerSettings);
    }else{
        if(ServerSettings.channels.has(Msg.channel.id) && ServerSettings.channels.get(Msg.channel.id).read == true && Msg.attachments.first().height > 0){
            MMS.create({meme: Msg.attachments.first().url, server: Msg.guild.id});
            Bot.servers.forEach((s, sid) => {
                if(sid != Msg.guild.id || ServerSettings.inHouse){
                    s.channels.forEach((c, id) => {
                        if(id != Msg.channel.id && c.send){
                            Bot.guilds.get(sid).channels.get(id).send(new Attachment(Msg.attachments.first().url))
                        }
                    })
                }
            })
        }
    }
    
})
Bot.on("messageUpdate", (m, Msg) => {
    if(Msg.author.bot)return;
    if(Msg.channel.type == "dm")return;
    let ServerSettings = Bot.servers.get(Msg.guild.id);
    if(Msg.content.startsWith(ServerSettings.prefix)){
        handleCommand(Msg, ServerSettings);
    }
})
Bot.on("guildCreate", g => {
    g.owner.send(`
    Heya there i am MemeBot. i share memes between servers.
    My commands are: 
    **>Prefix [prefix]** to change the prefix\n
    **>Memes add [options]** This will add a channel to the channel list. you can either set it to only read or only send memes. by leaving this blank it will both read and send memes\n
    **>Reset** which will reset all the settings for the current server`)
    let o = {};
    o.prefix = settings.prefix;
    o.channels = new Map();
    o.guild = g;
    o.inHouse = false;
    Bot.servers.set(g.id, o);
})
const handleCommand = (Msg, ServerSettings) => {
    let args = Msg.content.slice(ServerSettings.prefix.length).split(" ");
    switch(args.shift().toLowerCase()){
        case "memes":
            if(Msg.author.id != Bot.app.owner.id && !Msg.member.hasPermission("ADMINISTRATOR"))return Msg.reply("You need the Admin Permission to use this command");
            switch(args.shift().toLowerCase()){
                case "add":
                    if(ServerSettings.channels.has(Msg.channel.id))return Msg.reply("this channel was already added. use **Memes change** to edit it");
                    if(args.length){
                        if(args[0] == "read"){
                            ServerSettings.channels.set(Msg.channel.id, {send: false, read: true})
                            Msg.react("✅")
                            saveSettings(ServerSettings, Msg.guild.id)
                        }else if (args[0] == "send"){
                            ServerSettings.channels.set(Msg.channel.id, {send: true, read: false})
                            Msg.react("✅")
                            saveSettings(ServerSettings, Msg.guild.id)
                        }else{
                            Msg.reply("Not a valid option. Supported are **read** and **send**")
                        }
                    }else{
                        ServerSettings.channels.set(Msg.channel.id, {send: true, read: true})
                        Msg.react("✅")
                        saveSettings(ServerSettings, Msg.guild.id)
                    }
                break;
                case "remove":
                    if(!ServerSettings.channels.has(Msg.channel.id))return Msg.reply("The Channel has to be added First. use **Memes add** to add the channel");
                    ServerSettings.channels.delete(Msg.channel.id)
                    Msg.react("✅")
                    saveSettings(ServerSettings, Msg.guild.id)
                break;
                case "edit":
                    if(!ServerSettings.channels.has(Msg.channel.id))return Msg.reply("The Channel has to be added First. use **Memes add** to add the channel");
                    if(args.length){
                        let o = ServerSettings.channels.get(Msg.channel.id);
                        if(args[0] == "read"){
                            ServerSettings.channels.set(Msg.channel.id, {send:  o.send, read: !o.read})
                            Msg.reply("Set Read to " + ServerSettings.channels.get(Msg.channel.id).read)
                            saveSettings(ServerSettings, Msg.guild.id)
                        }else if (args[0] == "send"){
                            ServerSettings.channels.set(Msg.channel.id, {send:  !o.send, read: o.read})
                            Msg.reply("Set send to " + ServerSettings.channels.get(Msg.channel.id).send)
                            saveSettings(ServerSettings, Msg.guild.id)
                        }else{
                            Msg.reply("Not a valid option. Supported are **read** and **send**")
                        }
                    }else{
                        Msg.reply("You must Provide a option. either **read** or **send**")
                    }
                break;
            }
        break;
        case "prefix":
            if(Msg.author.id != Bot.app.owner.id && !Msg.member.hasPermission("ADMINISTRATOR"))return Msg.reply("You need the Admin Permission to use this command");
            ServerSettings.prefix = args[0];
            saveSettings(ServerSettings, Msg.guild.id)
            Msg.reply("Prefix was set to: **" + ServerSettings.prefix + "**")
        break;
        case"inv" || "invite":
            Msg.author.send("https://discordapp.com/oauth2/authorize?client_id=430696555251499028&scope=bot&permissions=67423296");
            Msg.react("✅")
        break;
        default:
            Msg.reply("Unrecognized command");
    }
}
process.on("unhandledRejection", console.error)
const saveSettings = (o, id) => {
    DB.update({prefix: o.prefix, inH: o.inHouse, channels: JSON.stringify(Array.from(o.channels))}, { where: { server: id } });
}
Bot.login(settings.token);