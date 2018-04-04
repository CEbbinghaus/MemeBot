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
Bot.servers = new Map();
Bot.on("ready", async () => {
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
        let k = new Map();
        if(ServerSettings.channels.has(Msg.channel.id) && ServerSettings.channels.get(Msg.channel.id).read == true && Msg.attachments.first().height > 0){
            Bot.servers.forEach((s, sid) => {
                if(sid != Msg.guild.id || ServerSettings.inHouse){
                    s.channels.forEach((c, id) => {
                        if(id != Msg.channel.id && c.send){
                            Bot.guilds.get(sid).channels.get(id).send(new Attachment(Msg.attachments.first().url))
                        }
                    })
                }
            })
            console.log("Image sent")
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
        case "test":
            Msg.reply("yus worked")
        break;
        case "memes":
            switch(args.shift().toLowerCase()){
                case "add":
                    if(ServerSettings.channels.has(Msg.channel.id))return Msg.reply("this channel was already added. use **Memes change** to edit it");
                    if(args.length){
                        if(args[0] == "read"){
                            ServerSettings.channels.set(Msg.channel.id, {send: false, read: true})
                            saveSettings(ServerSettings, Msg.guild.id)
                        }else if (args[0] == "send"){
                            ServerSettings.channels.set(Msg.channel.id, {send: true, read: false})
                            saveSettings(ServerSettings, Msg.guild.id)
                        }else{
                            Msg.reply("Not a valid option. Supported are **read** and **send**")
                        }
                    }else{
                        ServerSettings.channels.set(Msg.channel.id, {send: true, read: true})
                        saveSettings(ServerSettings, Msg.guild.id)
                    }
                break;
            }
        break;
    }
}
const saveSettings = (o, id) => {
    DB.update({prefix: o.prefix, inH: o.inHouse, channels: JSON.stringify(Array.from(o.channels))}, { where: { server: id } });
}
Bot.login(settings.token);