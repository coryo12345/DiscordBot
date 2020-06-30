var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var Poll = require('./Poll');
var DB_Handler = require('./DB_Handler');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));

// jail constants
const JAILED_ROLE_NAME = 'Jailed by DioBot';
const CHECK_FOR_UNJAIL_TIME = 1000 * 10;
const POLL_TIME = 1000 * 60 * 2; // 2 minutes
const JAIL_CHOICES = ['Yes', 'No'];
const MIN_VOTES = 4;
const TIME_PER_VOTE = 60 * 5; // 5 minutes

module.exports = class Jail {
    static initJail(client) {
        client.guilds.cache.each(s => {
            console.log(`In server:: id: ${s.id} \tname: ${s.name}`);
            s.channels.cache.each((chan) => {
                Jail.applyJailRoleToChannel(chan);
            });
        });
        setInterval(function(){Jail.checkForUnjail(client)}, CHECK_FOR_UNJAIL_TIME);
    }

    static checkRole(guild) {
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
                        Jail.createRole(guild)
                            .then(resolve)
                            .catch(reject);
                    }
                })
                .catch(reject);
        });
    }

    static createRole(guild) {
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

    static async applyJailRoleToChannel(channel) {
        if (channel.type !== 'text') return;
        Jail.checkRole(channel.guild)
            .then(role => {
                channel.updateOverwrite(role, { SEND_MESSAGES: false });
            })
            .catch(console.error);
    }

    static jail(message) {
        try {
            var params = Jail.parseJail(message);
        }
        catch (err) {
            console.error(err);
            message.channel.send("I couldn't parse that message.");
        }
        Poll.jail(message, params)
            .then((mes) => {
                setTimeout(function () { Jail.checkJailPoll(mes, params) }, POLL_TIME);
            });
    }

    static checkJailPoll(message, params) {
        var yes = message.reactions.cache.get(DB_Handler.alphabet[0]).count - 1;
        var no = message.reactions.cache.get(DB_Handler.alphabet[1]).count - 1;
        var diff = yes - no;
        var requester_yes = message.reactions.cache.get(DB_Handler.alphabet[0]).users.cache.find(user => user.id === params.requester.id);
        var vote_flip_override = false;
        var member = message.guild.members.cache.find(member => member.id === params.user.id);
        if ((requester_yes !== undefined && yes === 1) || yes === 0) {
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
            Jail.checkRole(message.guild)
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

    static checkForUnjail(client) {
        db.checkUnjail()
            .then(rows => {
                rows.forEach(val => {
                    Jail.clearJail(val.server_id, val.user_id, client)
                        .then(member => {
                            db.clearJail([val.server_id, val.channel_id, val.message_id])
                                .catch(console.err)
                        })
                });
            })
            .catch(console.error);
    }

    static clearJail(g_id, u_id, client) {
        return new Promise(function (resolve, reject) {
            var guild = client.guilds.cache.find(guild => guild.id == g_id);
            if (guild === undefined) reject("can't find guild");
            var member = guild.members.cache.find(member => member.id == u_id);
            if (member === undefined) reject("can't find member in guild");
            Jail.checkRole(guild)
                .then(role => {
                    member.roles.remove(role, "jail ended")
                        .then(resolve)
                        .catch(console.error);
                })
                .catch(reject);
        })
    }

    static parseJail(message) {
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
}