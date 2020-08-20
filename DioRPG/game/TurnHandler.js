module.exports = class TurnHandler {
    constructor(db) {
        this.db = db;
    }

    emojis = {
        0: '🇦',
        1: '🇧',
        2: '🇨',
        3: '🇩',
        4: '🇪',
        5: '🇫',
        6: '🇬',
        7: '🇭',
        8: '🇮',
        9: '🇯',
        10: '🇰',
        11: '🇱',
        12: '🇲',
        13: '🇳',
        14: '🇴',
        15: '🇵',
        16: '🇶',
        17: '🇷',
        18: '🇸',
        19: '🇹',
        20: '🇺',
        21: '🇻',
        22: '🇼',
        23: '🇽',
        24: '🇾',
        25: '🇿'
    };

    showTurnOptions = (message) => {
        var actions = this._getPlayerActions(message.author.user_id);
        var str = `<@${message.author.id}> You have the following options:`;
        actions.forEach((action, index) => {
            // TODO: handle error on more than 26 skills
            action.emoji = this.emojis[index];
            str += `\n${action.emoji}: **${action.action}** ${action.parameter1}`;
        });
        message.channel.send(str)
            .then(m => {
                this.db.newTurn(message.author.id, m.id, actions);
                // add reactions to message
                actions.forEach(action => {
                    m.react(action.emoji);
                });
            });

    }

    /**
     * returns array of actions a player can take
     * an action is an object
     * {
     *  action: RUN, WEAPON, SKILL, etc...
     *  parameter1: description if skill / item
     * }
     * Attack w/ weapon,
     * Run,
     * Use item,
     * use skill, etc...
     */
    _getPlayerActions = (user_id) => {
        // can always run & attack with weapon
        var list = [
            { action: 'RUN', parameter1: 'Attempt to run away.' },
            { action: 'WEAPON', parameter1: 'Attack using your weapon.' }
        ];
        // here is where we check if they have an item to use
        // would add 'ITEM'
        // here is where we check if they have skills to use
        return list;
    }
}