const Discord = require('discord.js');
const token = process.env.DISCORD_BOT_SECRET;
const path = require('path');
const os = require('os');
const fs = require('fs');
var archiver = require('archiver');
const client = new Discord.Client();

const template_end = "</body></html>";
const template_open_tag = "<p>";
const template_close_tag = "</p>";
const template_name_open_tag = "<span>";
const template_name_close_tag = "</span>";

client.on('ready', () => {
    console.log('I am ready!');
    console.log(`ID: ${client.user.username}`);
    client.user.setActivity("are you there diobot?");
});

// Create an event listener for messages
client.on('message', async message => {
    try {
        // break if sent by a bot
        if (message.author.bot) return;

        // archive
        if (message.content.substring(0, 8) === '!archive') {
            archive(message);
        }

    } catch (err) {
        console.log(err);
    }
});

client.login(token);

async function archive(message) {
    const author_id = message.author.id.toString();
    var channel = message.channel;
    const count = parseInt(message.content.split(' ')[1], 10);
    if (isNaN(count)) {
        message.channel.send("Can't parse that message.");
        return;
    }
    // get approved users
    var users = require('./users.json');

    // validate a good user
    let good = false;
    users.approved.forEach(u => {
        if (author_id === u.id) {
            good = true;
        }
    });
    if (!good) {
        channel.send("Sorry. You're not an approved user.");
        return;
    }

    // filename
    const filename = `${channel.name}_${channel.id}.html`;

    // tempdir
    var dir_path = os.tmpdir();
    var tmp_file_path = path.resolve(dir_path, filename);
    console.log(tmp_file_path)

    // copy meesages.html
    fs.copyFile(path.resolve('./template.html'), tmp_file_path, err => {
        if (err) console.error(err);
        readMessages(channel, tmp_file_path, filename, count);
    });
}

async function readMessages(channel, tmp_file_path, filename, count) {
    var stream = fs.createWriteStream(tmp_file_path, { flags: 'a' });
    // write channel name and date
    stream.write(`<h1>${channel.name}</h1><h2>${new Date()}</h2>`);

    console.log(Math.min(count, 10000));
    // for each message -> format and write to copy
    const messages = await messages_getter(channel, Math.min(count, 10000));
    messages.forEach(message => {
        message.author.fetch()
            .then(user => {
                const text = `${template_open_tag}${template_name_open_tag}${user.username}${template_name_close_tag}${message.cleanContent}${template_close_tag}\n`;
                stream.write(text);
            })
    });

    // zip up
    zip_path = tmp_file_path.replace('.html', '.zip');
    var output = fs.createWriteStream(zip_path);
    var archive = archiver('zip', {
        // gzip: true,
        zlib: { level: 9 }
    });
    archive.on('error', function (err) {
        throw err;
    });
    archive.pipe(output);
    archive.file(tmp_file_path, { name: 'messages.html' });
    await archive.finalize();

    // send to channel
    channel.send({
        files: [{
            attachment: zip_path,
            name: 'messages.zip'
        }]
    })
        .then(() => {
            // clean up
            fs.unlink(tmp_file_path, (err) => {
                if (err) console.error(err);
            });
            fs.unlink(zip_path, (err) => {
                if (err) console.error(err);
            })
        })
}

async function messages_getter(channel, limit) {
    const sum_messages = [];
    let last_id;

    while (true) {
        const options = { limit: 100 };
        if (last_id) {
            options.before = last_id;
        }

        const messages = await channel.messages.fetch(options);
        sum_messages.push(...messages.array());
        last_id = messages.last().id;

        if (messages.size != 100 || sum_messages.length >= limit) {
            break;
        }
    }

    // if (sum_messages.length >= limit) {
    //     sum_messages = sum_messages.slice(0, limit-1);
    // }
    return sum_messages;
}
