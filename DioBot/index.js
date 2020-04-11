const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;

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
        // help
        else if (message.content === '!help') {
            message.channel.send("```Available commands:\n!Ping - pong\n!play [youtube link] - plays the given link\n!pause - pause the song\n!resume - resume the song\n!queue [youtube link] - adds a video to the queue\n!leave - the bot will leave YOUR channel```");
        }
    } catch (err) {
        console.log(err);
    }
});

client.login(token);
