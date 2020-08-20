var dataloader = require('./data_loader');
const queries = require('./queries');

module.exports = class DB_Handler {
    constructor(dba) {
        this.db = dba;
        this.dl = new dataloader(this.db);
    }

    initdb = () => {
        this.db.serialize(() => {
            // ddl
            this.db.exec(queries.ddl);

            // after last query, use callback to run dataloader
            this.db.run(`
                SELECT 1;
            `,
                [],
                () => {
                    this.dl.load();
                });
        });
    }

    getCharacter = (user_id) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            th.db.get(`
                SELECT *
                FROM character_v
                WHERE user_id = ?
            `,
                [user_id],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
        });
    }

    getClasses = () => {
        var th = this;
        return new Promise(function (resolve, reject) {
            th.db.all(`SELECT * FROM classes`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                })
        })
    }

    new = (user_id, class_id) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            th.db.serialize(() => {
                th.db.run(`DELETE FROM character WHERE user_id = ${user_id};`);
                th.db.run(`
                    INSERT INTO "character" (user_id, class, level, health, weapon_id, variant_id) VALUES
                    (
                        $user_id,
                        $class_id,
                        (select default_level from classes where id = $class_id),
                        (select base_health from classes where id = $class_id),
                        (select weapon_id from class_weapons where class_id = $class_id),
                        (select variant from class_weapons where class_id = $class_id)
                    );
                `,
                    {
                        $user_id: user_id,
                        $class_id: class_id
                    },
                    (err) => {
                        if (err) reject(err);
                        resolve(true);
                    });
            });
        });
    }

    getBattle = (user_id) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            th.db.get(`SELECT * FROM battle WHERE user_id = ?`,
                [user_id],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            )
        });
    }

    genBattle = (user_id, monster_level) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            th.db.serialize(function () {
                th.db.run(`
                    DELETE FROM battle WHERE user_id = ?
                `,
                    [user_id]
                );

                th.db.run(queries.genBattle,
                    [user_id, monster_level, monster_level, monster_level],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    });
            });
        });
    }

    newTurn = (user_id, message_id, actions) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            th.db.serialize(function () {
                th.db.run(
                    'DELETE FROM input_messages WHERE user_id = ?;',
                    [user_id],
                    (err) => {
                        if (err) reject(err);
                    }
                );
                
                actions.forEach(action => {
                    th.db.run(`
                        INSERT INTO input_messages (user_id, message_id, reaction, action, parameter1) VALUES
                        ($user_id, $message_id, $reaction, $action, $param1);
                    `,
                    {
                        $user_id: user_id,
                        $message_id: message_id,
                        $reaction: action.emoji,
                        $action: action.action,
                        $param1: action.parameter1
                    });
                });
            });
        });

    }

}