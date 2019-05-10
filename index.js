var auth = require('./auth.json');
const Discord = require('discord.js');
const ytdl = require('ytdl-core-discord');

// Create an instance of a Discord client
const client = new Discord.Client();

var VOICE_CONNECTION = null;

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    console.log('I am ready!');
    console.log(`ID: ${client.user.username}`);
});

// Create an event listener for messages
client.on('message', async message => {
    // break if sent by a bot
    if (message.author.bot) return;
    if (message.content === '!ping') {
        message.channel.send('pong');
    }
    else if (message.content.trim().substr(0, 5) === '!play') {
        let msg = message.content.trim().split(" ");
        let url = "https://www.youtube.com/watch?v=2WPCLda_erI";
        try {
            if (msg[1].length > 0) {
                url = msg[1];
            }
        } catch (err) {

        }


        const channel = message.member.voiceChannel;

        channel.join()
            .then(connection => { VOICE_CONNECTION = connection; play(connection, url, 0.4) })
            .catch(error => console.log("error on join"));
    }

    else if (message.content === '!asmr') {
        let url = "https://www.youtube.com/watch?v=E74jO6QzlHA";
        const channel = message.member.voiceChannel;

        channel.join()
            .then(connection => { VOICE_CONNECTION = connection; play(connection, url); })
            .catch(error => console.log("error on join"));
    }

    else if (message.content === '!leave') {
        //const channel = message.member.voiceChannel;
        if (VOICE_CONNECTION != null) {
            VOICE_CONNECTION.disconnect();
            VOICE_CONNECTION = null;
        }
        // channel.leave()
        //     .then(connection => console.log(`Disconnected from ${channel.name}`))
        //     .catch(error => console.log("error on leave"));
    }


    else if (message.content === '!help') {
        message.channel.send("```Available commands:\n!Ping - pong\n!play [youtube link] - plays the given link\n!leave - the bot will leave YOUR channel```");
    }
});

// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login(auth.token);

async function play(connection, url) {
    connection.playOpusStream(await ytdl(url), { volume: 2.0, bitrate: 'auto' });
}

async function play(connection, url, vol) {
    connection.playOpusStream(await ytdl(url), { volume: vol, bitrate: 'auto' });
}
