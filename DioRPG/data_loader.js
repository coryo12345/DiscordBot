var path = require('path');
var fs = require('fs');
const data_path = path.resolve(__dirname, './data/');
const EXTENSION = '.json'

module.exports = class DB_Handler {
    constructor(dba) {
        this.db = dba;
    }

    load = () => {
        // weapons & weapon modifiers
        this._weapons(path.resolve(data_path, 'weapons/'));
        // classes & default weapons
        this._classes(path.resolve(data_path, 'classes/'));
    }

    _weapons = (folder) => {
        // check weapon variants first
        this._variants(path.resolve(folder, 'variants/'));

        this.db.serialize(() => {
            this._truncate('weapons');
            this._truncate('weapon_variants');
            let files = _listFiles(folder, EXTENSION)
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let weapon = require(file);
                this.db.run(`
                    INSERT INTO weapons (id, base_health, base_defense, base_attack) VALUES
                    (?, ?, ?, ?);
                `,
                    [
                        weapon.id,
                        weapon.base_health,
                        weapon.base_defense,
                        weapon.base_attack
                    ]
                );
                weapon.variants.forEach(v => {
                    this.db.run(`
                        INSERT INTO weapon_variants (weapon_id, variant_id) VALUES
                        (?, ?);
                    `,
                        [
                            weapon.id,
                            v
                        ]
                    );
                });
            }
        });
    }

    _variants = (folder) => {
        this.db.serialize(() => {
            this._truncate('variants');
            let files = _listFiles(folder, EXTENSION)
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let variant = require(file);
                this.db.run(`
                INSERT INTO variants (id, health, defense, attack) VALUES
                (?, ?, ?, ?);
            `,
                    [
                        variant.id,
                        variant.health,
                        variant.defense,
                        variant.attack
                    ]
                );
            }
        });
    }

    _classes = (folder) => {
        this.db.serialize(() => {
            this._truncate('classes');
            this._truncate('class_weapons')
            let files = _listFiles(folder, EXTENSION)
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let cl = require(file);
                this.db.run(`
                    INSERT INTO classes (id, default_level, base_health, base_defense, base_attack) VALUES
                    (?, ?, ?, ?, ?)
                `,
                    [
                        cl.id,
                        cl.default_level,
                        cl.base_health,
                        cl.base_defense,
                        cl.base_attack
                    ]);
                this.db.run(`
                    INSERT INTO class_weapons (class_id, weapon_id, variant) VALUES
                    (?, ?, ?)
                `,
                [
                    cl.id,
                    cl.default_weapon.id,
                    cl.default_weapon.variant,
                ]);
            }
        });
    }

    _truncate = (table) => {
        this.db.run(`DELETE FROM ${table}`);
    }
}

function _listFiles(startPath, filter) {
    var files = fs.readdirSync(startPath);
    var goodfiles = [];
    for (var i = 0; i < files.length; i++) {
        if (files[i].indexOf(filter) >= 0) {
            goodfiles.push(path.resolve(startPath, files[i]));
        };
    };
    return goodfiles;
};
