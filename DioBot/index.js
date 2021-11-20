// configure env variables
require('dotenv').config();

const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var Poll = require('./Poll');
// var Jail = require('./Jail');
var RPS = require('./RPS');
var DB_Handler = require('./DB_Handler');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));
db.initdb();

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
    // Jail.initJail(client);
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
        // else if (message.cleanContent.substring(0, 6) === '/jail ') {
        //     Jail.jail(message);
        // }
        else if (message.mentions.users.find(user => user.id === client.user.id) !== undefined) {
            RPS.rps(message);
        }
        else if (message.cleanContent.indexOf('/help') >= 0) {
            message.channel.send(`To create a poll:\n/poll "question" "option 1" "option 2" "option 3....."`);
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

// client.on('channelCreate', async chan => {
//     Jail.checkRole(chan.guild)
//         .then(role => {
//             Jail.applyJailRoleToChannel(chan, role);
//         })
// });

client.login(token);