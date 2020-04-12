const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;

// Create an instance of a Discord client
const client = new Discord.Client();

class Proof {
    constructor(server, channel, key) {
        this.server = server;
        this.channel = channel;
        this.key = key;
        this.answered = false;
    }

    prove(num) {
        if (num.toString() === this.key.toString() && this.answered === false) {
            this.answered = true;
            return true;
        }
        return false;
    }

}
var proofs = []

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    console.log('I am ready!');
    console.log(`ID: ${client.user.username}`);
    client.user.setActivity("rip DioBot");
});

// Create an event listener for messages
client.on('message', async message => {
    try {
        // break if sent by a bot
        if (message.author.bot) return;

        // archive
        if (message.content === '!archive') {
            try {
                var server = message.channel.guild.name;
            } catch (err) {
                var server = message.author.username; 
            }
            let channel = message.channel.name;
            let user = message.author.username;
            let key = Math.round(Math.random() * (999999));
            var p = new Proof(server, channel, key);
            proofs.push(p);
            console.log(`${new Date()}: Archive attempt:\n${server}\n${channel}\n${user}\nkey:${key}`);
            message.channel.send('To confirm, type !authenticate and the key provided in the console.');
        }
        else if (message.content.length > 14 && message.content.substr(0, 14) === '!authenticate ') {
            try {
                var server = message.channel.guild.name;
            } catch (err) {
                var server = message.author.username; 
            }
            let channel = message.channel.name;
            let user = message.author.username;
            let key = message.content.substr(14);
            console.log(`${new Date()}: Prove attempt:\n${server}\n${channel}\n${user}\nkey:${key}`);
            let pro = null;
            proofs.forEach(p => {
                if (p.server == server && p.channel == channel) {
                    pro = p;
                    return;
                }
            });

            if (pro === null) {
                return;
            }

            if (pro.prove(key)) {
                archive(pro, message.channel);
            }
            else {
                message.channel.send('Sorry - Incorrect.');
                return;
            }
        }
    } catch (err) {
        console.log(err);
    }
});

function archive(pro, channel) {
    console.log('archive channel');
    // remove proof
    let index = proofs.indexOf(pro);
    if (index !== -1) proofs.splice(index, 1);
    const filter = m => m.content.length > 0;
    const collector = channel.createMessageCollector(filter, { max: 10, time: 15000 });
    collector.on('collect', m => {console.log(m.content)});
    collector.on('end', collected => {console.log('write out to file here.....')});
}

client.login(token);
