const jwt = require("jsonwebtoken");

exports.authenticateUser = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({ error: "Accès refusé. Aucun token fourni." });
    }

    try {
        // Vérifie et décode le token
        const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        req.user = decoded; // Ajouter les données utilisateur au `req`

        // Vérifie s'il reste moins de 24h avant l'expiration
        const now = Math.floor(Date.now() / 1000); // Temps actuel en secondes
        const timeToExpire = decoded.exp - now;

        if (timeToExpire < 24 * 60 * 60) { // Moins de 24h avant l'expiration
            // Génère un nouveau token valide 48h
            const newToken = jwt.sign(
                {
                    id: decoded.id,
                    email: decoded.email,
                },
                process.env.JWT_SECRET,
                { expiresIn: "48h" }
            );

            // Ajoute le nouveau token dans la réponse
            res.setHeader("Authorization", `Bearer ${newToken}`);
        }

        next(); // Continue la requête
    } catch (error) {
        return res.status(401).json({ error: "Token invalide ou expiré." });
    }
};
