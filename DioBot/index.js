const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var DB_Handler = require('./DB_Handler');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));
db.initdb();

const MESSAGE_SPLIT = '-Results-----------------------------------\n';
const COLORS = ['🟥', '🟦', '🟨', '🟩'];
const BOX_PERCENTAGE = 5;

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
});

// Create an event listener for messages
client.on('message', async message => {
    try {
        // break if sent by a bot
        if (message.author.bot) return;

        // ping
        if (message.content === '/ping') {
            message.channel.send('pong');
        }
        else if (message.content.substring(0, 6) === '/poll ') {
            poll(message);
        }
        else if (message.cleanContent.indexOf('/help') >= 0) {
            message.channel.send(`To create a poll:
/poll "question" "option 1" "option 2" "option 3....."`);
        }
    } catch (err) {
        console.error(err);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot === true) return;
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    db.isPoll([reaction.message.guild.id, reaction.message.channel.id, reaction.message.id])
        .then(val => {
            if (val === true)
                updatePoll(reaction.message);
            else
                return
        })
        .catch(err => console.error(err));
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot === true) return;
    // When we receive a reaction we check if the reaction is partial or not
    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();
    db.isPoll([reaction.message.guild.id, reaction.message.channel.id, reaction.message.id])
        .then(val => {
            if (val === true)
                updatePoll(reaction.message);
            else
                return
        })
        .catch(err => console.error(err));
});

async function poll(message) {
    let g_id = message.guild.id;
    let c_id = message.channel.id;
    try {
        var obj = parsePoll(message.cleanContent);
    } catch (error) {
        console.error(error);
        message.channel.send("I couldn't parse that request. Try again.");
        return;
    }

    message.channel.send("Loading Poll...")
        .then(mes => {
            var m_id = mes.id;
            db.newPoll([g_id, c_id, m_id], obj)
                .then(choices => {
                    let js = JSON.parse(choices.json);
                    let str = obj.question + '\n';
                    for (let i = 0; i < js.length; i++) {
                        const choice = js[i];
                        str += `${choice.symbol} ${choice.text} \n`;
                    }
                    str += MESSAGE_SPLIT;
                    for (let i = 0; i < js.length; i++) {
                        const choice = js[i];
                        str += `${choice.symbol} \n`;
                    }
                    mes.edit(str);
                    for (let i = 0; i < js.length; i++) {
                        const choice = js[i];
                        mes.react(choice.symbol);
                    }
                })
        })
        .catch(console.error);
}

async function updatePoll(message) {
    let g_id = message.guild.id;
    let c_id = message.channel.id;
    let m_id = message.id;
    var reactions = message.reactions.cache;
    var total = 0;
    var counts = new Map();
    db.fetchChoices([g_id, c_id, m_id])
        .then((choices) => {
            choices.forEach(row => {
                let c = reactions.get(row.symbol).count - 1; // -1 to exclude diobot
                total += c;
                counts.set(row.symbol, c);
            });
            updateResults(message, total, counts, choices);
        });

}

async function updateResults(message, total, counts, choices) {
    var str1 = message.cleanContent.split('\n')[0] + '\n';
    for (let c = 0; c < choices.length; c++) {
        const choice = choices[c];
        let val = counts.get(choice.symbol);
        let percent = Math.round(100 * (val / total));
        str1 += `${choice.symbol} ${choice.answer} (${percent}%) \n`;
    }
    // results graph
    str1 += MESSAGE_SPLIT;
    for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        let val = counts.get(choice.symbol);
        let color = i % COLORS.length;
        let percent = Math.round(100 * (val / total));
        let boxCount = Math.round(percent / BOX_PERCENTAGE);
        colorStr = '';
        for (let j = 0; j < boxCount; j++) {
            colorStr += COLORS[color];
        }
        if (total === 0)
            str1 += `${choice.symbol} (0%) \n`
        else
            str1 += `${choice.symbol} ${colorStr} (${percent}%) \n`
    }
    message.edit(str1);
}

/**
 * parsePoll
 * @param {string} str /poll "question" "choice 1" "choice 2"
 * @returns Object { question: "question", choices: ["choice 1", "choice 2"] }
 */
function parsePoll(message_text) {
    let str = message_text.substring(message_text.indexOf(" ") + 1);
    let ar = str.split(`" "`);
    let obj = { question: "", choices: [] };
    for (let i = 0; i < ar.length; i++) {
        let ch = ar[i];
        // clean
        if (i === 0) {
            ch = ch.substring(1);
        }
        if (i === ar.length - 1) {
            ch = ch.substring(0, ch.length - 1);
        }
        // append
        if (i === 0) {
            obj.question = ch;
        }
        else {
            obj.choices.push(ch);
        }
    }
    return obj;
}

client.login(token);