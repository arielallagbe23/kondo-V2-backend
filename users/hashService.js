const argon2 = require("argon2");

async function hashPassword(password) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        saltLength: 16, // Ajout d'un salt de 16 bytes
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
    });
}

async function verifyPassword(hashedPassword, plainPassword) {
    return await argon2.verify(hashedPassword, plainPassword);
}

module.exports = { hashPassword, verifyPassword };
