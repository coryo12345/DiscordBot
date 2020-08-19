var Battle = require('./Battle');

module.exports = class RPG {
    constructor(client, db) {
        this.client = client;
        this.db = db;
        this.battle = new Battle(this.db);
    }

    status = (message) => {
        this.db.getCharacter(message.author.id)
            .then((row) => {
                if (row === undefined) {
                    message.channel.send(`<@${message.author.id}> you do not have a character. DM me and ask to start a new game.`);
                }
                else {
                    message.channel.send(
                        `<@${message.author.id}>'s Character:
Level ${row.level} ${row.class}
Health: ${row.health} / ${row.total_health}
Defense: ${row.total_defense}
Attack: ${row.total_attack}
\`\`\`
WEAPON: ${('' + row.variant_id + ' ' + row.weapon_id).trim()}
Health bonus: ${row.weapon_health}
Defense bonus: ${row.weapon_defense}
Attack bonus: ${row.weapon_attack}
\`\`\`\`\`\`
CLASS: ${row.class}
Health: ${row.class_health}
Defense: ${row.class_defense}
Attack: ${row.class_attack}
\`\`\`
`               );
                }
            });

    }

    new = (message) => {
        var words = message.cleanContent.split(' ');
        this.db.getClasses().then((classes) => {
            var CLS = 0;
            for (let w = 0; w < words.length; w++) {
                for (let c = 0; c < classes.length; c++) {
                    if (words[w].toLowerCase() === classes[c].id.toLowerCase())
                        CLS = classes[c].id
                }
            }
            if (CLS === 0) {
                message.channel.send("Please give me your desired class if you wish to start a new game.")
                return;
            }
            // we have user_id and class. make a new character.
            this.db.new(message.author.id, CLS).then(() => {
                this.status(message);
            });
        });
    }

    listClasses = (message) => {
        this.db.getClasses().then((classes) => {
            var str = 'Available classes are:';
            classes.forEach(cl => {
                str +=
                    `\`\`\`
${cl.id}
Health: ${cl.base_health}
Defense: ${cl.base_defense}
Attack: ${cl.base_attack}\`\`\``;
            });
            message.channel.send(str);
        });
    }

    battleStatus = (message, startIfEnded) => {
        this.db.getCharacter(message.author.id)
            .then(char => {
                if (char === undefined) {
                    message.channel.send("You have no character. Let me know if you want to start a new game.");
                    return;
                }
                this.db.getBattle(message.author.id)
                    .then(row => {
                        // if no battle start a new battle
                        if (row === undefined || row.battle_status === 0) {
                            if (!startIfEnded) {
                                message.channel.send(`<@${message.author.id}> you are not in a battle. DM me to fight.`)
                            }
                            else {
                                this.battle.newBattle(message.author.id, char.level)
                                    .then(() => {
                                        this.battleStatus(message, startIfEnded);
                                    })
                            }
                        }
                        // show details of current battle
                        else {
                            message.channel.send(
                                `<@${message.author.id}> you are currently fighting:
\`\`\`
Level ${row.monster_level} ${row.monster_id}
Health: ${row.health} / ${row.max_health}
Effects: ${row.status_effect_id || 'none'}
\`\`\``                     )
                        }
                    });
            });
    }
}