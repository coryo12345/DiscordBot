require('dotenv').config()
const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;

// Create an instance of a Discord client
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'] });

const channel_id = '698637760583434250';
const server_id = '207914291909623808';
const bot_id = '576156171715477561';
var server = null;
var channel = null;
var everyone = null;

var channel_manager = new Map();

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    console.log('I am ready!');
    console.log(`ID: ${client.user.username}`);
    client.user.setActivity("rip feegbot");

    // get channel
    client.guilds.cache.each(s => {
        console.log(`In server:: id: ${s.id} \tname: ${s.name}`);
        if (s.id.toString() == server_id.toString()) {
            server = s;
            server.channels.cache.each(c => {
                if (c.id.toString() === channel_id.toString()) {
                    channel = c;
                    init();
                }
            });
        }
    });
});

// Create an event listener for messages
client.on('message', async message => {
    try {
        // break if sent by a bot
        if (message.author.bot) return;

        // ping
        if (message.content === '!ping') {
            message.channel.send('pong');
        }
    } catch (err) {
        console.error(err);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
	// When we receive a reaction we check if the reaction is partial or not
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    let channel_name = reaction.message.content;
    let channel = channel_manager.get(channel_name);
    channel.addUser(user);
});

client.on('messageReactionRemove', async (reaction, user) => {
	// When we receive a reaction we check if the reaction is partial or not
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    let channel_name = reaction.message.content;
    let channel = channel_manager.get(channel_name);
    channel.removeUser(user);
});

client.on('channelCreate', async (chan) => {
    let name = chane.name;
    // create message
    chan.send(name);
    console.log(`plan to send message ${name}`);

    // create record of channel
    channel_manager.set(name, new mychannel(chan.id, name, chan));
    channel_manager.get(name).updateLive();
});

client.on('channelDelete', async (chan) => {
    let name = chan.name
    // delete message 
    channel.messages.fetch()
        .then((messages) => {
            messages.forEach(message => {
                if(message.content.toString() === name.toString()) {
                    // message.delete();
                    console.log(`plan to delete message ${message.content}`);
                } 
            })
        });

    // delete record of channel
    channel_manager.delete(name);
});

async function init() {
    var tmp_channels = new Map();

    // store the @everyone role for later
    server.roles.fetch()
        .then(roles => {
            roles.forEach(role => {
                console.log(role);
            })
        }).t

    process.exit(0)

    // get list of channels
    server.channels.cache.each(c => {
        if (c.type === 'text' && c.id.toString() !== channel_id.toString()) {
            if (c.name !== 'test') return;
            mv = new mychannel(c.id, c.name, c);
            channel_manager.set(c.name, mv);
        }
    });

    // map messages to real channels
    await channel.messages.fetch()
        .then((messages) => {
            messages.forEach(message => {
                // messages only from diobot
                if (message.author.id.toString() === bot_id.toString()) {
                    let name = message.content;
                    // this channel doesn't exist, remove the message
                    if (!channel_manager.has(name)) {
                        console.log(`deleting message "${message.content}" by ${message.author.username}`);
                        message.delete();
                    }

                    // remember that we have a message for this channel
                    tmp_channels.set(name, true);
                }
            })
        })
        .then(() => init_2(tmp_channels));

}

async function init_2(tmp_channels) {
    // add messages for channels that do not exist
    channel_manager.forEach((val, key) => {
        if (!tmp_channels.has(val.name)) {
            // send message
            console.log(`create message for channel ${val.name}`);
            channel.send(val.name);
        }
    })

    setTimeout(init_3, 1000);
}

async function init_3() {
    // collect user permissions
    await channel.messages.fetch()
        .then((messages) => {
            messages.forEach(message => {
                let ch = channel_manager.get(message.content);
                if (ch !== undefined) {
                    message.reactions.cache.each(reaction => {
                        reaction.users.fetch().then(users => {
                            users.forEach((val, key) => {
                                // console.log(`user ${val.username} reacted with ${reaction.emoji} on message ${message.content}  .`)
                                ch.addUser(val);
                            })
                        })
                    })
                }
            })
        })

    setTimeout(init_4, 1000);
}

async function init_4() {
    // update user permissions
    channel_manager.forEach((val, key) => {
        val.updateLive()
    })
}

class mychannel {
    constructor(id, name, channel) {
        this.id = id;
        this.name = name;
        this.channel = channel;
        this.users = new Map();
    }

    addUser(user) {
        this.users.set(user.id, user);
        // could add here as well
        this.channel.createOverwrite(user, { 'VIEW_CHANNEL': true });
        console.log(`${new Date()}: Adding user ${user.username} from channel ${this.name}`)
    }

    removeUser(user) {
        this.users.delete(user.id);
        // could remove here as well
        this.channel.permissionOverwrites.get(user.id).delete();
        console.log(`${new Date()}: Removing user ${user.username} from channel ${this.name}`)
    }

    updateLive() {
        // set this to be hidden for @everyone
        this.channel.updateOverwrite('@everyone', { 'VIEW_CHANNEL': true });

        // remove those who shouldn't be
        this.channel.permissionOverwrites.forEach((val, key) => {
            if (val.type === 'member' && this.users[key] === undefined) {
                this.channel.permissionOverwrites.get(key).delete();
            }
        })

        // add those who should be
        this.users.forEach((val, index) => {
            this.channel.createOverwrite(val, { 'VIEW_CHANNEL': true });
        })
    }

}

client.login(token);