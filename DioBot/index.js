const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var Poll = require('./Poll');
var DB_Handler = require('./DB_Handler');
const { jailPoll } = require('./Poll');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));
db.initdb();

// jail constants
const JAILED_ROLE_NAME = 'Jailed by DioBot';
// TODO increase POLL_TIME
const POLL_TIME = 1000 * 5;
const JAIL_CHOICES = ['Yes', 'No'];
const MIN_VOTES = 4;

// Create an instance of a Discord client
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'] });

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    console.log('I am ready!');
    console.log(`ID: ${client.user.username}`);
    client.user.setActivity("rip feegbot");
    initJail();
});

// Create an event listener for messages
client.on('message', async message => {
    // console.log(message.mentions.users);
    try {
        // break if sent by a bot
        if (message.author.bot) return;

        // ping
        if (message.content === '/ping') {
            message.channel.send('pong');
        }
        else if (message.cleanContent.substring(0, 6) === '/poll ') {
            Poll.poll(message);
        }
        else if (message.cleanContent.substring(0, 6) === '/jail ') {
            jail(message);
        }
        else if (message.cleanContent.indexOf('/help') >= 0) {
            message.channel.send(`To create a poll:
/poll "question" "option 1" "option 2" "option 3....."`);
        }
        else if (message.cleanContent === '/restart') {
            process.exit(0);
        }
    } catch (err) {
        console.error(err);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot === true) return;
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    db.isPoll([reaction.message.guild.id, reaction.message.channel.id, reaction.message.id])
        .then(val => {
            if (val === true)
                Poll.updatePoll(reaction.message);
            else
                return;
        })
        .catch(err => console.error(err));
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot === true) return;
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    db.isPoll([reaction.message.guild.id, reaction.message.channel.id, reaction.message.id])
        .then(val => {
            if (val === true)
                Poll.updatePoll(reaction.message);
            else
                return;
        })
        .catch(err => console.error(err));
});

// TODO on channel add set diobot_jail permissions

function initJail() {
    client.guilds.cache.each(s => {
        console.log(`In server:: id: ${s.id} \tname: ${s.name}`);
        checkRole(s)
            .then(role => {
                s.channels.cache.each(chan => {
                    applyJailRoleToChannel(chan, role);
                });
            })
            .catch(console.error);
    });
    // TODO check for users that need to be unjailed
    // TODO setTimeout for users that aren't ready yet
}

function checkRole(guild) {
    return new Promise(function (resolve, reject) {
        guild.roles.fetch()
            .then(roles => {
                let exists = false;
                roles.cache.forEach((role, id) => {
                    if (role.name === JAILED_ROLE_NAME) {
                        resolve(role);
                        exists = true;
                    }
                });
                if (!exists) {
                    createRole(guild)
                        .then(resolve)
                        .catch(reject);
                }
            })
            .catch(reject);
    });
}

function createRole(guild) {
    return new Promise(function (resolve, reject) {
        console.log('creating role')
        guild.roles.create({
            data: {
                name: JAILED_ROLE_NAME
            },
            reason: 'Jail role does not exist'
        })
            .then(resolve)
            .catch(reject)
    });
}

function applyJailRoleToChannel(channel, role) {
    if (channel.type === 'text') {
        channel.updateOverwrite(role, { SEND_MESSAGES: false });
    }
}

function applyJailRoleToChannel(channel) {
    if (channel.type !== 'text') return;
    checkRole(channel.guild)
        .then(role => {
            applyJailRoleToChannel(channel, role);
        })
        .catch(console.error);
}

function jail(message) {
    try {
        var params = parseJail(message);
    }
    catch (err) {
        console.error(err);
        message.channel.send("I couldn't parse that message.");
    }
    Poll.jail(message, params)
        .then(mes => {
            setTimeout(function () { checkJailPoll(mes) }, POLL_TIME);
        });
}

function checkJailPoll(message) {
    var yes = message.reactions.cache.get(DB_Handler.alphabet[0]).count;
    var no = message.reactions.cache.get(DB_Handler.alphabet[1]).count;
    console.log(yes, no);
    // TODO check reactions on message
    // TODO update jail table starttime and end time
    // if (true) {
    //     var member = message.guild.members.cache.find(member => member.id === params.user.id);
    //     checkRole(message.guild)
    //         .then(role => {
    //             member.roles.add(role, "jailed");
    //         })
    //         .catch(console.error);
    // }
    // TODO settimeout for clearJail
}

function clearJail(g_id, c_id, m_id, u_id) {

}

function parseJail(message) {
    let obj = { question: "", choices: JAIL_CHOICES, requester: message.author, user: "" };
    obj.user = message.mentions.users.values().next().value;
    let str = message.cleanContent.trim().substring(6);
    let spc = str.indexOf(" ");
    if (spc === -1) {
        obj.question = `Jail ${obj.user.username}?`;
    }
    else {
        obj.question = `Jail ${obj.user.username} for "${str.substring(str.indexOf(" "))}"`;
    }
    return obj;
}

client.login(token);