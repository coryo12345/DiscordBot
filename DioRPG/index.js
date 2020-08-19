const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var DB_Handler = require('./db/DB_Handler');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));
db.initdb();
var RPG = require('./game/RPG');

// Create an instance of a Discord client
const client = new Discord.Client();

// Game logic handler 
var rpg = new RPG(client, db);

client.on('ready', () => {
    console.log('I am ready!');
    console.log(`ID: ${client.user.username}`);
});

client.on('message', async message => {
    try {
        // quit if bot
        if (message.author.bot)
            return;
        // a DM message
        else if (message.channel.type === 'dm') {
            if (message.cleanContent.toLowerCase().indexOf('new game') >= 0 || message.cleanContent.toLowerCase().indexOf('start over') >= 0) {
                rpg.new(message);
            }
            else if (message.cleanContent.toLowerCase().indexOf('classes') >= 0) {
                rpg.listClasses(message);
            }
            else if (message.cleanContent.toLowerCase().indexOf('status') >= 0 || message.cleanContent.toLowerCase().indexOf('character') >= 0) {
                rpg.status(message);
            }
            else if (message.cleanContent.toLowerCase().indexOf('battle') >= 0 || message.cleanContent.toLowerCase().indexOf('fight') >= 0) {
                rpg.battleStatus(message, true);
            }
        }
        // in a Guild channel
        else if (message.mentions.users.has(client.user.id) && message.channel.type === 'text') {
            if (message.cleanContent.toLowerCase().indexOf('classes') >= 0) {
                rpg.listClasses(message);
            }
            else if (message.cleanContent.toLowerCase().indexOf('battle') >= 0 || message.cleanContent.toLowerCase().indexOf('fight') >= 0) {
                rpg.battleStatus(message, false);
            }
            else {
                rpg.status(message);
            }
        }
    } catch (err) {
        console.error(err);
    }
});

client.login(token);