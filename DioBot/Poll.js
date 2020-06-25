var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var DB_Handler = require('./DB_Handler');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));

const MESSAGE_SPLIT = '-Results-----------------------------------\n';
const COLORS = ['🟥', '🟦', '🟨', '🟩'];
const BOX_PERCENTAGE = 10;

module.exports = class Poll {
    static async poll(message) {
        let g_id = message.guild.id;
        let c_id = message.channel.id;
        try {
            var obj = Poll.parsePoll(message.cleanContent);
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
                        message.delete()
                    })
            })
            .catch(console.error);
    }

    static async jail(message, params) {
        return new Promise(function (resolve, reject) {
            var obj = { question: params.question, choices: params.choices };
            var g_id = message.guild.id;
            var c_id = message.channel.id;
            // create poll -> "jail user for reason" "yes" "no"
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
                            db.newJail([g_id, c_id, mes.id], params.user, params.requester)
                                .catch(err => {
                                    console.error(err);
                                    message.channel.send('Something went wrong. Try again later.');
                                });
                            message.delete();
                            resolve(mes);
                        })
                })
                .catch(console.error);
        })
    }

    static async updatePoll(message) {
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
                Poll.updateResults(message, total, counts, choices);
            });

    }

    static async updateResults(message, total, counts, choices) {
        var str1 = message.cleanContent.split('\n')[0] + '\n';
        for (let c = 0; c < choices.length; c++) {
            const choice = choices[c];
            let val = counts.get(choice.symbol);
            let percent = Math.round(100 * (val / total));
            if (total === 0) {
                str1 += `${choice.symbol} ${choice.answer} \n`;
            }
            else {
                str1 += `${choice.symbol} ${choice.answer} (${percent}%) \n`;
            }
        }
        // results graph
        str1 += MESSAGE_SPLIT;
        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];
            let val = counts.get(choice.symbol);
            let color = i % COLORS.length;
            let percent = Math.round(100 * (val / total));
            let boxCount = Math.round(percent / BOX_PERCENTAGE);
            let colorStr = '';
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
    static parsePoll(message_text) {
        let str = message_text.substring(message_text.indexOf(" ") + 1);
        let ar = str.split(`" "`).splice(0, 19);
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

}