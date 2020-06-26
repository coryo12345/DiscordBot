const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var Poll = require('./Poll');
var DB_Handler = require('./DB_Handler');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));
db.initdb();

// jail constants
const JAILED_ROLE_NAME = 'Jailed by DioBot';
const CHECK_FOR_UNJAIL_TIME = 1000 * 10;
// TODO increase POLL_TIME
const POLL_TIME = 1000 * 6;
const JAIL_CHOICES = ['Yes', 'No'];
// TODO set min_votes = 4
const MIN_VOTES = 1;
// TODO increase TIME_PER_VOTE
const TIME_PER_VOTE = 20;

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

client.on('message', async message => {
    try {
        if (message.author.bot) return;

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

client.on('channelCreate', async chan => {
    applyJailRoleToChannel(chan);
});

function initJail() {
    client.guilds.cache.each(s => {
        console.log(`In server:: id: ${s.id} \tname: ${s.name}`);
        s.channels.cache.each((chan) => {
            applyJailRoleToChannel(chan);
        });
    });
    setInterval(checkForUnjail, CHECK_FOR_UNJAIL_TIME);
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
        console.log(`creating role on guild ${guild.name}`);
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

async function applyJailRoleToChannel(channel) {
    if (channel.type !== 'text') return;
    checkRole(channel.guild)
        .then(role => {
            channel.updateOverwrite(role, { SEND_MESSAGES: false });
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
        .then((mes) => {
            setTimeout(function () { checkJailPoll(mes, params) }, POLL_TIME);
        });
}

function checkJailPoll(message, params) {
    var yes = message.reactions.cache.get(DB_Handler.alphabet[0]).count - 1;
    var no = message.reactions.cache.get(DB_Handler.alphabet[1]).count - 1;
    var diff = yes - no;
    var requester_yes = message.reactions.cache.get(DB_Handler.alphabet[0]).users.cache.find(user => user.id === params.requester.id);
    var vote_flip_override = false;
    var member = message.guild.members.cache.find(member => member.id === params.user.id);
    if((requester_yes !== undefined && yes === 1) || yes === 0) {
        member = message.guild.members.cache.find(member => member.id === params.requester.id);
        vote_flip_override = true;
    }
    if (yes + no >= MIN_VOTES && (diff > 0 || vote_flip_override === true)) {
        var seconds = diff * TIME_PER_VOTE;
        db.updateJail([message.guild.id, message.channel.id, message.id], seconds, member.id)
            .catch(err => {
                console.error(err);
                message.channel.send("Something went wrong with the poll. Try again later.");
                return;
            });
        checkRole(message.guild)
            .then(role => {
                member.roles.add(role, "jailed");
            })
            .catch(console.error);
        if (vote_flip_override === false) {
            message.channel.send(`<@${params.user.id}> HAS BEEN JAILED! DEMOCRACY HAS SPOKEN!`);
        }
        else {
            message.channel.send(`THE TABLES HAVE TURNED ON <@${member.id}>! THEY HAVE BEEN JAILED FOR THEIR PITIFUL ATTEMPT AT TYRANNY!`);
        }
    }
    else {
        message.channel.send(`<@${params.user.id}> HAS BEEN SPARED! DEMOCRACY HAS SPOKEN!`);
    }
    message.edit("\n**Voting Concluded**\n" + message.content);
}

function checkForUnjail() {
    db.checkUnjail()
        .then(rows => {
            rows.forEach(val => {
                clearJail(val.server_id, val.user_id)
                    .then(member => {
                        db.clearJail([val.server_id, val.channel_id, val.message_id])
                            .catch(console.err)
                    })
            });
        })
        .catch(console.error);
}

function clearJail(g_id, u_id) {
    return new Promise(function (resolve, reject) {
        var guild = client.guilds.cache.find(guild => guild.id == g_id);
        if (guild === undefined) reject("can't find guild");
        var member = guild.members.cache.find(member => member.id == u_id);
        if (member === undefined) reject("can't find member in guild");
        checkRole(guild)
            .then(role => {
                member.roles.remove(role, "jail ended")
                    .then(resolve)
                    .catch(console.error);
            })
            .catch(reject);
    })
}

function parseJail(message) {
    let obj = { question: "", choices: JAIL_CHOICES, requester: message.author, user: "" };
    obj.user = message.mentions.users.values().next().value;
    let str = message.cleanContent.trim().substring(6);
    let spc = str.indexOf(" ");
    if (spc === -1) {
        obj.question = `Jail <@${obj.user.id}> ?`;
    }
    else {
        obj.question = `Jail <@${obj.user.id}> for "${str.substring(str.indexOf(" "))}"`;
    }
    return obj;
}

client.login(token);