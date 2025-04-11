const db = require("../database");
const { hashPassword, verifyPassword } = require("../users/hashService");
const { encryptData, decryptData } = require("../users/encryptionService");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.registerUser = async (req, res) => {
    try {
        const { nickname, email, password, password_verif, type_abonnement_id, type_user_id } = req.body;
        console.log("📩 Valeurs reçues :", req.body);

        // 🔴 Vérifier si les mots de passe correspondent
        if (password !== password_verif) {
            console.log("❌ Les mots de passe ne correspondent pas.");
            return res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
        }

        // 🟡 Vérifier si l'email existe déjà
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
            if (err) {
                console.error("⚠️ Erreur SQL (Vérification email) :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la vérification de l'email." });
            }

            if (result.length > 0) {
                console.log("⚠️ Email déjà utilisé :", email);
                return res.status(400).json({ error: "Cet email est déjà utilisé." });
            }

            try {
                console.log("🔑 Hachage et salage du mot de passe...");
                const hashedPassword = await hashPassword(password);
                console.log("✅ Mot de passe haché :", hashedPassword);

                // 🔵 Insérer l'utilisateur avec `is_actif = 'INACTIVE'`
                db.query(
                    "INSERT INTO users (nickname, email, mdp, is_actif, type_abonnement_id, type_user_id) VALUES (?, ?, ?, ?, ?, ?)",
                    [nickname, email, hashedPassword, "INACTIVE", type_abonnement_id || null, type_user_id || null],
                    (err, result) => {
                        if (err) {
                            console.error("⚠️ Erreur SQL (Insertion utilisateur) :", err);
                            return res.status(500).json({ error: "Erreur serveur lors de l'insertion de l'utilisateur." });
                        }

                        const userId = result.insertId;
                        console.log("✅ Utilisateur inséré avec ID :", userId);

                        // 🟢 Générer et insérer un code de validation
                        const verificationCode = crypto.randomInt(100000, 999999).toString();
                        const createdDate = new Date();
                        const expirationDate = new Date(createdDate.getTime() + 15 * 60 * 1000); // Expiration en 15 min
                        
                        console.log("📌 Code de validation généré :", verificationCode);
                        console.log("⏳ Date d'expiration :", expirationDate);

                        db.query(
                            "INSERT INTO validation (code, created_date, expiration, user_id) VALUES (?, ?, ?, ?)",
                            [verificationCode, createdDate, expirationDate, userId],
                            (err) => {
                                if (err) {
                                    console.error("⚠️ Erreur SQL (Insertion validation) :", err);
                                    return res.status(500).json({ error: "Erreur serveur lors de l'insertion du code de validation." });
                                }

                                console.log("✅ Code de validation inséré avec succès !");
                                res.status(201).json({ 
                                    message: "Compte créé. Vérifiez votre email pour valider votre compte.", 
                                    verificationCode 
                                });
                            }
                        );
                    }
                );
            } catch (error) {
                console.error("⚠️ Erreur interne (Hachage / Encryption) :", error);
                res.status(500).json({ error: "Erreur lors de l'inscription." });
            }
        });
    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("📥 Tentative de connexion avec l'email :", email);

        // 🔎 Vérifier si l'utilisateur existe
        db.query(
            "SELECT id, email, mdp, is_actif FROM users WHERE email = ? LIMIT 1",
            [email],
            async (err, result) => {
                if (err) {
                    console.error("⚠️ Erreur SQL (Vérification utilisateur) :", err);
                    return res.status(500).json({ error: "Erreur serveur lors de la récupération de l'utilisateur." });
                }

                if (result.length === 0) {
                    console.log("❌ Utilisateur non trouvé :", email);
                    return res.status(400).json({ error: "Utilisateur non trouvé." });
                }

                const foundUser = result[0];

                // 🔒 Vérifier si le compte est actif
                if (foundUser.is_actif !== "ACTIVE") {
                    return res.status(403).json({ error: "Compte inactif. Veuillez vérifier votre email." });
                }

                // 🔐 Vérifier le mot de passe
                const isMatch = await verifyPassword(foundUser.mdp, password);
                if (!isMatch) {
                    console.log("❌ Mot de passe incorrect pour :", email);
                    return res.status(400).json({ error: "Mot de passe incorrect." });
                }

                // 🔑 Générer un token JWT avec une durée de 48 heures
                const token = jwt.sign({ id: foundUser.id }, process.env.JWT_SECRET, { expiresIn: "48h" });

                console.log("✅ Connexion réussie pour l'utilisateur ID :", foundUser.id);

                // ✅ Retourner le token et l'ID de l'utilisateur
                res.status(200).json({
                    message: "Connexion réussie",
                    token,
                    user_id: foundUser.id,
                });
            }
        );
    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

exports.verifyUser = (req, res) => {
    const { email, verificationCode } = req.body;

    console.log("📩 Vérification du code reçu :", { email, verificationCode });

    // 🔎 Vérifier l'existence de l'utilisateur
    db.query(
        "SELECT id, is_actif FROM users WHERE email = ? LIMIT 1",
        [email],
        (err, users) => {
            if (err) {
                console.error("⚠️ Erreur SQL (Récupération utilisateur) :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération de l'utilisateur." });
            }

            if (users.length === 0) {
                console.log("❌ Utilisateur non trouvé avec l'email :", email);
                return res.status(400).json({ error: "Utilisateur non trouvé." });
            }

            const foundUser = users[0];

            // ✅ Vérifier si l'utilisateur est déjà actif
            if (foundUser.is_actif === "ACTIVE") {
                return res.status(400).json({ error: "Le compte est déjà activé." });
            }

            // 🔎 Vérifier le dernier code de validation
            db.query(
                "SELECT code, expiration FROM validation WHERE user_id = ? ORDER BY created_date DESC LIMIT 1",
                [foundUser.id],
                (err, result) => {
                    if (err) {
                        console.error("⚠️ Erreur SQL (Récupération validation) :", err);
                        return res.status(500).json({ error: "Erreur serveur lors de la récupération du code de validation." });
                    }

                    if (result.length === 0) {
                        return res.status(400).json({ error: "Aucun code de validation trouvé." });
                    }

                    const validation = result[0];

                    // 🔍 Vérifier le code
                    if (validation.code !== verificationCode) {
                        console.log("❌ Code de validation incorrect :", verificationCode);
                        return res.status(400).json({ error: "Code de validation incorrect." });
                    }

                    // ⏳ Vérifier l'expiration du code
                    if (new Date(validation.expiration) < new Date()) {
                        console.log("⏳ Code de validation expiré :", validation.expiration);
                        return res.status(400).json({ error: "Le code de validation a expiré." });
                    }

                    // ✅ Activer l'utilisateur
                    db.query(
                        "UPDATE users SET is_actif = 'ACTIVE' WHERE id = ?",
                        [foundUser.id],
                        (err) => {
                            if (err) {
                                console.error("⚠️ Erreur SQL (Activation utilisateur) :", err);
                                return res.status(500).json({ error: "Erreur serveur lors de l'activation du compte." });
                            }

                            console.log("✅ Compte activé avec succès pour l'utilisateur ID :", foundUser.id);
                            res.status(200).json({ message: "Compte activé avec succès !" });
                        }
                    );
                }
            );
        }
    );
};

exports.getUserStrategies = (req, res) => {
    const userId = req.user.id; // Récupération de l'ID utilisateur depuis le token JWT

    console.log(`📥 Récupération des stratégies pour l'utilisateur ID: ${userId}`);

    // Vérifier si l'utilisateur est valide
    if (!userId) {
        console.error("❌ Erreur: Aucun utilisateur connecté.");
        return res.status(400).json({ error: "Utilisateur non connecté." });
    }

    // Récupérer les stratégies de cet utilisateur
    db.query(
        "SELECT * FROM strategies WHERE user_id = ?",
        [userId],
        (err, results) => {
            if (err) {
                console.error("⚠️ Erreur SQL (Récupération des stratégies) :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération des stratégies." });
            }

            console.log(`✅ Stratégies récupérées pour l'utilisateur ${userId}:`, results);
            res.status(200).json(results);
        }
    );
};

exports.getUserSessionBacktest = (req, res) => {
    const userId = req.user.id; // Récupération de l'ID utilisateur depuis le token JWT

    console.log(`📥 Récupération des session backtest pour l'utilisateur ID: ${userId}`);

    // Vérifier si l'utilisateur est valide
    if (!userId) {
        console.error("❌ Erreur: Aucun utilisateur connecté.");
        return res.status(400).json({ error: "Utilisateur non connecté." });
    }

    // Récupérer les stratégies de cet utilisateur
    db.query(
            `SELECT 
                sb.*, 
                a.nom_actif 
            FROM 
                sessions_backtest sb
            LEFT JOIN 
                actifs a 
            ON 
                sb.actif_id = a.id
            WHERE 
                sb.user_id = ?;
            `,
        [userId],
        (err, results) => {
            if (err) {
                console.error("⚠️ Erreur SQL (Récupération des session backtest) :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération des session backtest." });
            }

            console.log(`✅ Session backtest récupérées pour l'utilisateur ${userId}:`, results);
            res.status(200).json(results);
        }
    );
};



