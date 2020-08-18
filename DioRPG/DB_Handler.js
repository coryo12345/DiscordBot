var dataloader = require('./data_loader');

module.exports = class DB_Handler {
    constructor(dba) {
        this.db = dba;
        this.dl = new dataloader(this.db);
    }

    initdb = () => {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS classes (
                    id VARCHAR,
                    default_level INT DEFAULT 1,
                    base_health INT NOT NULL,
                    base_defense INT NOT NULL,
                    base_attack INT NOT NULL,
                    PRIMARY KEY (id)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS weapons (
                    id VARCHAR,
                    base_health INT NOT NULL,
                    base_defense INT NOT NULL,
                    base_attack INT NOT NULL,
                    PRIMARY KEY (id)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS class_weapons (
                    class_id VARCHAR,
                    weapon_id VARCHAR,
                    variant VARCHAR,
                    PRIMARY KEY (class_id, weapon_id, variant)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS variants (
                    id VARCHAR,
                    health INT NOT NULL,
                    defense INT NOT NULL,
                    attack INT NOT NULL,
                    PRIMARY KEY (id)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS weapon_variants (
                    weapon_id VARCHAR,
                    variant_id VARCHAR,
                    PRIMARY KEY (weapon_id, variant_id)
                );
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS character (
                    user_id VARCHAR,
                    class VARCHAR,
                    level INT,
                    health INT,
                    weapon_id VARCHAR,
                    variant_id VARCHAR,
                    PRIMARY KEY (user_id)
                );
            `);

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
                SELECT
                        c."level",
                        c."class",
                        c.health "health",
                        c2.base_health "class_health",
                        c2.base_defense "class_defense",
                        c2.base_attack "class_attack",
                        c2.base_health + w.base_health + v.health "total_health",
                        c2.base_defense + w.base_defense + v.defense "total_defense",
                        c2.base_attack + w.base_attack + v.attack "total_attack",
                        w.base_health + v.health weapon_health,
                        w.base_defense + v.defense weapon_defense,
                        w.base_attack + v.attack weapon_attack,
                        c.weapon_id,
                        c.variant_id
                FROM
                        "character" c
                LEFT JOIN
                        classes c2
                        ON c.class = c2.id 
                LEFT JOIN
                        weapons w
                        ON c.weapon_id = w.id
                LEFT JOIN
                        variants v
                        ON c.variant_id = v.id 
                WHERE
                        user_id = ?
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
            th.db.all(`
                SELECT
                        *
                FROM
                        classes
            `,
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

}