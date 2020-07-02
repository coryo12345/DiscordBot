var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var DB_Handler = require('./DB_Handler');
var db = new DB_Handler(new sqlite3.Database(path.resolve('./data.db')));

module.exports = class RPS {
    static async rps(message) {
        try {
            let emoji = message.content.split(" ")[1];
            db.isRPS(emoji)
                .then(row => {
                    if(row !== undefined)
                        respondRPS(message, row.id);
                })
                .catch(console.error);
        }
        catch(err) {
            return;
        }
    }

}

// private function
function respondRPS(message, id) {
    // not using this for anything but...
    db.newRPS([message.guild.id, message.channel.id, message.id], id)
        .catch(console.err);
    db.getRPSResponse(id)
        .then(row => {
            if (row === undefined) return;
            message.channel.send(`<@${message.author.id}> ${row.emoji}\n${row.result}`);
        })
        .catch(console.error);
}