const {Client, RichEmbed, Attachment} = require("discord.js");
let settings = require("./settings.json")
const Bot = new Client();
Bot.servers = new Map();
Bot.on("ready", () => {
    console.log(settings)
    Bot.guilds.forEach(g => {
        let o = {};
        o.prefix = settings.prefix;
        o.channels = new Map();
        o.inHouse = false;
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
                s.channels.forEach((c, id) => {
                    if(id != Msg.channel.id && c.send){
                        Bot.guilds.get(sid).channels.get(id).send(new Attachment(Msg.attachments.first().url))
                    }
                })
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
                        }else if (args[0] == "send"){
                            ServerSettings.channels.set(Msg.channel.id, {send: true, read: false})
                        }else{
                            Msg.reply("Not a valid option. Supported are **read** and **send**")
                        }
                    }else{
                        ServerSettings.channels.set(Msg.channel.id, {send: true, read: true})
                    }
                break;
            }
        break;
    }
}
Bot.login(settings.token);