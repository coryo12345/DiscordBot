var auth = require('./auth.json');
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();


/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    console.log('I am ready!');
    console.log(`ID: ${client.user.username}`);
    client.user.setGame("rip DioBot");
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

        // play
        else if (message.content.trim().substr(0, 5) === '!play') {
            let msg = message.content.trim().split(" ");
            let url = "https://www.youtube.com/watch?v=2WPCLda_erI";
            let def = true;
            try {
                if (msg[1].length > 0) {
                    url = msg[1];
                    def = false;
                }
            } catch (err) { }

            if (def && queue.length > 0) {
                url = queue.shift();
            }

            if (STREAM != null) {
                STREAM.end();
            }

            if (VOICE_CONNECTION == null) {
                const channel = message.member.voiceChannel;

                channel.join()
                    .then(connection => { VOICE_CONNECTION = connection; play(VOICE_CONNECTION, url, 0.4); })
                    .catch(error => console.log("error on join"));
            } else {
                play(VOICE_CONNECTION, url, 0.4);
            }

        }

        // queue || q
        else if (message.content.trim().substr(0, 6) === '!queue' || message.content.trim().substr(0, 2) === '!q') {
            let msg = message.content.trim().split(" ");
            let url = "";
            try {
                if (msg[1].length > 0) {
                    url = msg[1];
                }
            } catch (err) { }

            if (url != "") {
                queue.push(url);
            }
        }

        // asmr
        else if (message.content === '!asmr') {
            let url = "https://www.youtube.com/watch?v=E74jO6QzlHA";
            const channel = message.member.voiceChannel;

            channel.join()
                .then(connection => { VOICE_CONNECTION = connection; play(connection, url, 2.0); })
                .catch(error => console.log("error on join"));
        }

        // pause
        else if (message.content === '!pause') {
            if (STREAM != null) {
                STREAM.pause();
            }
        }

        // resume
        else if (message.content === '!resume') {
            if (STREAM != null) {
                STREAM.resume();
            }
        }

        // leave
        else if (message.content === '!leave') {
            //const channel = message.member.voiceChannel;
            if (VOICE_CONNECTION != null) {
                STREAM.end();
                STREAM = null;
                VOICE_CONNECTION.disconnect();
                VOICE_CONNECTION = null;
            }
        }

        // help
        else if (message.content === '!help') {
            message.channel.send("```Available commands:\n!Ping - pong\n!play [youtube link] - plays the given link\n!pause - pause the song\n!resume - resume the song\n!queue [youtube link] - adds a video to the queue\n!leave - the bot will leave YOUR channel```");
        }

        // debug
        else if (message.content === '!debug!') {
            message.channel.send(queue.toString());
        }
    } catch (err) {
        console.log(err);
    }
});

client.login(auth.token);
