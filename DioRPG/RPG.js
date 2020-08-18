module.exports = class RPG {
    constructor(client, db) {
        this.client = client;
        this.db = db;
    }

    status = (message) => {
        this.db.getCharacter(message.author.id)
            .then((row) => {
                message.channel.send(
`${message.author.username}'s Character:
Level ${row.level} ${row.class}
Health: ${row.health} / ${row.total_health}
Defense: ${row.total_defense}
Attack: ${row.total_attack}
\`\`\`
WEAPON
${('' + row.variant_id + row.weapon_id).trim()}
Health: ${row.weapon_health}
Defense: ${row.weapon_defense}
Attack: ${row.weapon_attack}
\`\`\`\`\`\`
CLASS
${row.class}
Health: ${row.class_health}
Defense: ${row.class_defense}
Attack: ${row.class_attack}
\`\`\`
`               );
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
}