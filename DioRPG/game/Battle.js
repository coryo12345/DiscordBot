module.exports = class Battle {
    constructor(db) {
        this.db = db;
    }

    newBattle = (user_id, level) => {
        var th = this;
        return new Promise(function (resolve, reject) {
            var mlevel = Math.ceil(Math.random() * (1.5 * level));
            th.db.genBattle(user_id, mlevel)
                .then(() => {
                    resolve();
                })
                .catch(err => reject(err));
        });
    }

    takeTurn = () => {
        // take turn here
        _monsterTurn();
    }

    _monsterTurn = () => {

    }

    _endBattle = () => {

    }

    _win = () => {

    }

    _lose = () => {

    }
}