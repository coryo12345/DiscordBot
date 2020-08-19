module.exports = {
    ddl: `
        CREATE TABLE IF NOT EXISTS classes (
            id VARCHAR,
            default_level INT DEFAULT 1,
            base_health INT NOT NULL,
            base_defense INT NOT NULL,
            base_attack INT NOT NULL,
            PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS weapons (
            id VARCHAR,
            base_health INT NOT NULL,
            base_defense INT NOT NULL,
            base_attack INT NOT NULL,
            PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS class_weapons (
            class_id VARCHAR,
            weapon_id VARCHAR,
            variant VARCHAR,
            PRIMARY KEY (class_id, weapon_id, variant)
        );

        CREATE TABLE IF NOT EXISTS variants (
            id VARCHAR,
            health INT NOT NULL,
            defense INT NOT NULL,
            attack INT NOT NULL,
            PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS weapon_variants (
            weapon_id VARCHAR,
            variant_id VARCHAR,
            PRIMARY KEY (weapon_id, variant_id)
        );

        CREATE TABLE IF NOT EXISTS monsters (
            id VARCHAR,
            health_constant NUMERIC NOT NULL,
            attack INT NOT NULL,
            defense INT NOT NULL,
            PRIMARY KEY (id)
        );

        CREATE TABLE IF NOT EXISTS battle (
            user_id VARCHAR,
            monster_id VARCHAR NOT NULL,
            monster_level INT NOT NULL,
            health INT NOT NULL,
            max_health INT NOT NULL,
            status_effect_id VARCHAR,
            weapon_id VARCHAR,
            variant_id VARCHAR,
            weapon_health INT,
            weapon_attack INT,
            weapon_defense INT,
            battle_status INT NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id)
        );

        CREATE TABLE IF NOT EXISTS character (
            user_id VARCHAR,
            class VARCHAR NOT NULL,
            level INT NOT NULL DEFAULT 1,
            health INT NOT NULL,
            weapon_id VARCHAR,
            variant_id VARCHAR,
            PRIMARY KEY (user_id)
        );

        DROP VIEW IF EXISTS character_v;
        CREATE VIEW character_v AS 
        SELECT
                c.user_id,
                c."level",
                c."class",
                c.health "health",
                c2.base_health "class_health",
                c2.base_defense "class_defense",
                c2.base_attack "class_attack",
                c2.base_health + w.base_health + v.health "total_health",
                c2.base_defense + w.base_defense + v.defense "total_defense",
                c2.base_attack + w.base_attack + v.attack "total_attack",
                w.base_health + v.health "weapon_health",
                w.base_defense + v.defense "weapon_defense",
                w.base_attack + v.attack "weapon_attack",
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
        ;`,

    genBattle: `
        INSERT INTO battle
        WITH mons AS (
            select 
                    m.id, 
                    m.health_constant,
                    wv.weapon_id,
                    wv.variant_id,
                    w.base_attack + v.attack "weapon_attack",
                    w.base_defense + v.defense "weapon_defense",
                    w.base_health + v.health "weapon_health"
            from 
                    monsters m,
                    weapons w,
                    weapon_variants wv,
                    variants v
            where
                    w.id = wv.weapon_id 
                    and wv.variant_id = v.id 
            order by 
                    random() 
            limit 1 
        )
        SELECT
                ? "user_id", -- user_id
                mons.id,
                ? "monster_level", -- monster_level
                round(? * mons.health_constant) + mons.weapon_health "health", 	-- monster_level
                round(? * mons.health_constant) + mons.weapon_health "max_health", -- monster_level
                NULL "status_effect",
                mons.weapon_id,
                mons.variant_id,
                mons.weapon_health,
                mons.weapon_attack,
                mons.weapon_defense,
                1 "battle_status"
        FROM
                mons
        ;`
}