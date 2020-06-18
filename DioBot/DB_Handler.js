module.exports = class DB_Handler {
    static alphabet = {
        0: '🇦',
        1: '🇧',
        2: '🇨',
        3: '🇩',
        4: '🇪',
        5: '🇫',
        6: '🇬',
        7: 'h',
        8: 'i',
        9: 'j',
        10: 'k',
        11: 'l',
        12: 'm',
        13: 'n',
        14: 'o',
        15: 'p',
        16: 'q',
        17: 'r',
        18: 's',
        19: 't',
        20: 'u',
        21: 'v',
        22: 'w',
        23: 'x',
        24: 'y',
        25: 'z'
    };

    constructor(dba) {
        this.db = dba;
    }

    initdb = () => {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS poll (
                    server_id INTEGER,
                    channel_id INTEGER,
                    message_id INTEGER,
                    question TEXT,
                    PRIMARY KEY (server_id, channel_id, message_id)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS choice (
                    poll_id INTEGER,
                    answer TEXT,
                    symbol VARCHAR(255),
                    FOREIGN KEY (poll_id) REFERENCES poll(id)
                );
            `);
        });
    }

    newPoll = (ids, params) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            // insert into db here 
            try {
                th.db.serialize(() => {
                    th.db.run(`
                    INSERT INTO poll (server_id, channel_id, message_id, question) VALUES
                    (
                        cast(? AS INTEGER), 
                        cast(? AS INTEGER), 
                        cast(? AS INTEGER),
                        cast(? AS TEXT)
                    );`,
                        [ids[0], ids[1], ids[2], params.question]
                    );
                    for (let i = 0; i < params.choices.length; i++) {
                        th.db.run(`
                        INSERT INTO choice VALUES 
                        (
                            (
                                select 
                                        rowid 
                                from 
                                        poll 
                                where 
                                        server_id = ?
                                        and channel_id = ?
                                        and message_id = ?
                            ),
                            cast(? AS TEXT),
                            cast(? AS VARCHAR)
                        )
                    `,
                            [
                                ids[0],
                                ids[1],
                                ids[2],
                                params.choices[i],
                                DB_Handler.alphabet[i]
                            ]
                        );
                    }

                    th.db.get(`
                    SELECT 
                            '[' ||
                            group_concat(
                                '{"text":"' ||
                                answer ||
                                '","symbol":"' ||
                                symbol ||
                                '"}',
                                ','
                            ) ||
                            ']' as json
                    FROM
                            choice
                    WHERE
                            poll_id = 
                            (
                                select
                                        rowid
                                from
                                        poll
                                where
                                        server_id = ?
                                        and channel_id = ?
                                        and message_id = ?
                            )
                    ;`,
                    [
                        ids[0],
                        ids[1],
                        ids[2]
                    ],
                    (err, row) => {
                        resolve(row);
                    })
                });
            }
            catch(err) {
                reject(err);
            }
        });
    }
}