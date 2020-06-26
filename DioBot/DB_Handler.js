module.exports = class DB_Handler {
    static alphabet = {
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

    constructor(dba) {
        this.db = dba;
    }

    initdb = () => {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS poll (
                    server_id VARCHAR,
                    channel_id VARCHAR,
                    message_id VARCHAR,
                    question TEXT,
                    PRIMARY KEY (server_id, channel_id, message_id)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS choice (
                    poll_id INTEGER,
                    answer TEXT,
                    symbol VARCHAR(255),
                    FOREIGN KEY (poll_id) REFERENCES poll(rowid)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS jailed (
                    poll_id INTEGER,
                    user_id VARCHAR,
                    requester_id VARCHAR,
                    start_time DATETIME,
                    end_time DATETIME,
                    cleared BOOLEAN,
                    FOREIGN KEY (poll_id) REFERENCES poll(rowid)
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
                        cast(? AS VARCHAR), 
                        cast(? AS VARCHAR), 
                        cast(? AS VARCHAR),
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
            catch (err) {
                reject(err);
            }
        });
    }

    fetchChoices = (ids) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.all(`
                select
                        answer,
                        symbol
                from 
                        choice 
                where 
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
                    [ids[0], ids[1], ids[2]],
                    (err, rows) => {
                        resolve(rows);
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }

    isPoll = (ids) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.get(`
                    select
                            rowid
                    from
                            poll
                    where 
                            server_id = ? 
                            and channel_id = ? 
                            and message_id = ?
                `,
                    [ids[0], ids[1], ids[2]],
                    (err, row) => {
                        if (err)
                            reject(err);
                        if (row !== undefined)
                            resolve(true);
                        else
                            resolve(false);
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        })
    }

    newJail = (ids, user, requester) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.run(`
                INSERT INTO jailed VALUES
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
                    cast(? as VARCHAR), 
                    cast(? as VARCHAR), 
                    null, 
                    null,
                    false
                );
                `,
                    [ids[0], ids[1], ids[2], user.id, requester.id]
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }

    getJail = (ids) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.get(`
                    select
                            poll_id,
                            user_id
                    from
                            jailed
                    where 
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
                `,
                    [ids[0], ids[1], ids[2]],
                    (err, row) => {
                        if (err)
                            reject(err);
                        if (row !== undefined)
                            resolve(row);
                        else
                            resolve(false);
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }

    updateJail = (ids, seconds) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.run(`
                    update
                            jailed
                    set
                            start_time = datetime('now'),
                            end_time = datetime('now', '+${seconds} seconds')
                    where
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
                `,
                    [ids[0], ids[1], ids[2]],
                    (err) => {
                        if (err) reject(err);
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }

    checkUnjail = () => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.all(`
                    select
                            p.server_id,
                            p.channel_id,
                            p.message_id,
                            j.user_id
                    from
                            jailed j,
                            poll p
                    where
                            j.poll_id = p.rowid
                            and j.end_time < datetime('now')
                            and j.cleared = false
                    ;
                `,
                    [],
                    (err, rows) => {
                        if (err)
                            reject(err);
                        else
                            resolve(rows);
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }

    clearJail = (ids) => {
        console.log(ids);
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.run(`
                update 
                        jailed
                set 
                        cleared = true 
                where 
                        jailed.poll_id = 
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
                    [ids[0], ids[1], ids[2]],
                    (err) => {
                        if (err)
                            reject(err);
                        resolve();
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }
}