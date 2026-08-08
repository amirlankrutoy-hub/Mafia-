const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode() {
    let code = "";

    for (let i = 0; i < 6; i++) {
        code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    }

    return code;
}

module.exports = generateRoomCode;