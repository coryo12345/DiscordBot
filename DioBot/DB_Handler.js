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

            this.db.run(`
                CREATE TABLE IF NOT EXISTS rps_type (
                    id INT,
                    name TEXT,
                    use INT
                );
            `);

            this.db.run(`DELETE FROM rps_type;`);
            this.db.run(`
                INSERT INTO rps_type VALUES 
                    (0, '✊', 1),
                    (0, '🤛', 0),
                    (0, '🤜', 0),
                    (1, '✌️', 1),
                    (1, '✂️', 0),
                    (2, '✋', 1),
                    (2, '🤚', 0),
                    (2, '🖐️', 0)
                ;
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS rps (
                    server_id VARCHAR,
                    channel_id VARCHAR,
                    message_id VARCHAR,
                    rps_type_id INT
                );
            `);
        });
    }

    newPoll = (ids, params) => {
        var th = this;
        return new Promise(function (resolve, reject) {
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

    updateJail = (ids, seconds, user_id) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.run(`
                    update
                            jailed
                    set
                            start_time = datetime('now'),
                            end_time = datetime('now', '+${seconds} seconds'),
                            user_id = ?
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
                    [user_id, ids[0], ids[1], ids[2]],
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

    newRPS = (ids, guess) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.run(
                    `INSERT INTO rps VALUES (?, ?, ?, ?);`,
                    [ids[0], ids[1], ids[2], guess],
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

    isRPS = (symbol) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            try {
                th.db.get(`
                        SELECT 
                                id
                        FROM
                                rps_type
                        WHERE
                                name = cast(? as VARCHAR)
                    `,
                    [symbol],
                    (err, row) => {
                        if(err)
                            reject(err);
                        resolve(row);
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }

    getRPSResponse = (guess) => {
        var th = this;
        return new Promise(function(resolve, reject) {
            try {
                th.db.get(
                    `
                        select 
                                id,
                                name as emoji,
                                case
                                    when 
                                        (
                                            id = (select min(id) from rps_type) 
                                            AND ? = (select max(id) from rps_type)
                                        )
                                        OR
                                        (
                                            id - 1 = ?
                                        ) 
                                        then 'You Won!'
                                    when id = ?
                                        then 'It''s a Tie.'
                                    else
                                        'Sorry, You Lost.'
                                end as result
                        from 
                                rps_type 
                        where
                                use = 1
                        order by 
                                random() 
                        limit 1
                        ;
                    `,
                    // "select 'x'",
                    [guess, guess, guess],
                    (err, row) => {
                        if(err)
                            reject(err);
                        resolve(row);
                    }
                );
            }
            catch (err) {
                reject(err);
            }
        });
    }
}