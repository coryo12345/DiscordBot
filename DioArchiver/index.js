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
const template_date_tag = '<span class="date">';

const me = "698278298735870044";

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

        message.mentions.users.each(user => {
            if (user.id.toString() === me){
                archive(message);
            }
        });

    } catch (err) {
        console.log(err);
    }
});

client.login(token);

async function archive(message) {
    const msg_parts = message.content.split(' ');
    if (msg_parts[1] !== 'archive') return;
    const count = parseInt(msg_parts[2], 10);
    if (isNaN(count)) return;

    const author_id = message.author.id.toString();
    var channel = message.channel;

    // get approved users
    var users = require('./users.json');

    // validate a good user
    let good = false;
    users.approved.forEach(u => {
        if (author_id === u.id) {
            good = true;
        }
    });
    if (!good && false) {
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
    stream.write(`<h1>${channel.name}</h1><h2>${new Date()}</h2><h3>Messages are in descending order.</h3>`);

    // for each message -> format and write to copy
    const messages = await messages_getter(channel, Math.min(count, 10000));
    messages.forEach(message => {
        message.author.fetch()
            .then(user => {
                stream.write(toDisplay(message, user));
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

    return sum_messages;
}

function toDisplay(message, user) {
    let dt = message.createdAt;
    let msg_dt = `${dt.getMonth()}/${dt.getDay()}/${dt.getFullYear()} at ${dt.getHours()}:${addZero(dt.getMinutes())}`;
    var text = `${template_open_tag}${template_date_tag}${msg_dt}${template_name_close_tag}${template_name_open_tag}${user.username}${template_name_close_tag}${message.cleanContent}`;
    message.attachments.each(attachment => {
        text += `\n${attachment.url}`;
        let pattern = new RegExp("(.png|.jpg|.jpeg)$");
        if(pattern.test(attachment.url)) {
            text += `<br><img src="${attachment.url}" /><br>`
        }
    });
    text += `${template_close_tag}\n`;

    return text;
}

function addZero(i) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
  }