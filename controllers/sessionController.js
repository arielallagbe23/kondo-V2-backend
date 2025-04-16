const db = require("../database");
const multer = require("multer");
const path = require("path");

// 📌 Modifier manuellement la décision d'une session
exports.updateSessionDecision = async (req, res) => {
    const { session_id } = req.params;
    const { decision } = req.body;

    // Validation basique
    if (!["valid", "invalid", "recommandé"].includes(decision)) {
        return res.status(400).json({ error: "La décision doit être 'valid' ou 'invalid' ou 'recommandé'." });
    }

    const sql = `
        UPDATE sessions_backtest
        SET decision = ?
        WHERE id = ?
    `;

    db.query(sql, [decision, session_id], (err, result) => {
        if (err) {
            console.error("❌ Erreur lors de la mise à jour de la décision :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la mise à jour de la décision." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Session non trouvée." });
        }

        res.status(200).json({ message: `✅ Décision de la session mise à jour en '${decision}'.` });
    });
};


// 📌 Modifier une session de backtest
exports.updateBacktestSession = async (req, res) => {
    try {
        const { session_backtest_id } = req.params;
        const { titre, objet, date_debut, capital, actif_id, benefice } = req.body;

        if (!session_backtest_id) {
            return res.status(400).json({ error: "L'ID de la session est requis." });
        }

        // Vérifier qu'au moins un champ est fourni pour la mise à jour
        if (!titre && !objet && !date_debut && !capital && !actif_id && benefice === undefined) {
            return res.status(400).json({ error: "Aucune donnée à mettre à jour." });
        }

        let updateFields = [];
        let values = [];

        if (titre) {
            updateFields.push("titre = ?");
            values.push(titre);
        }
        if (objet) {
            updateFields.push("objet = ?");
            values.push(objet);
        }
        if (date_debut) {
            updateFields.push("date_debut = ?");
            values.push(date_debut);
        }
        if (capital) {
            updateFields.push("capital = ?");
            values.push(capital);
        }
        if (actif_id) {
            updateFields.push("actif_id = ?");
            values.push(actif_id);
        }
        if (benefice !== undefined) { // Permet 0 et valeurs NULL
            updateFields.push("benefice = ?");
            values.push(benefice);
        }

        values.push(session_backtest_id);

        const sql = `UPDATE sessions_backtest SET ${updateFields.join(", ")} WHERE id = ?`;

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("⚠️ Erreur lors de la mise à jour de la session :", err);
                return res.status(500).json({ error: "Erreur lors de la mise à jour de la session." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Session non trouvée." });
            }

            console.log(`✅ Session ID ${session_backtest_id} mise à jour avec succès !`);
            res.status(200).json({ message: "Session mise à jour avec succès !" });
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

exports.getSessionBenefice = async (req, res) => {
    try {
        const { session_id } = req.params;

        if (!session_id) {
            return res.status(400).json({ error: "L'ID de la session est requis." });
        }

        const sql = `
            SELECT 
                s.id AS session_backtest_id,
                s.capital AS capital_initial,
                SUM(
                    CASE 
                        WHEN t.resultat_id = 2 THEN -t.risque  -- Perte
                        WHEN t.resultat_id IN (3, 4) THEN t.risque * t.rrp  -- Gain
                        ELSE 0  -- BE ou autres
                    END
                ) AS benefice_total,
                ((s.capital * (SUM(
                    CASE 
                        WHEN t.resultat_id = 2 THEN -t.risque
                        WHEN t.resultat_id IN (3, 4) THEN t.risque * t.rrp
                        ELSE 0
                    END
                ) / 100)) + s.capital) AS capital_final
            FROM sessions_backtest s
            LEFT JOIN transactions_backtest t ON s.id = t.session_backtest_id
            WHERE s.id = ?
            GROUP BY s.id, s.capital;
        `;

        db.query(sql, [session_id], (err, results) => {
            if (err) {
                console.error("❌ Erreur lors du calcul du bénéfice :", err);
                return res.status(500).json({ error: "Erreur serveur lors du calcul du bénéfice." });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Aucune transaction trouvée pour cette session." });
            }

            res.status(200).json(results[0]);
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

// 📌 Configuration de Multer pour stocker les images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/images/"); // 📂 Dossier où seront stockées les images
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // 🔄 Générer un nom unique
    },
});

const upload = multer({ storage: storage });

// 📌 POST : Ajouter une photo à une session
exports.uploadPhoto = (req, res) => {
    const { session_backtest_id } = req.body;

    if (!session_backtest_id || !req.file) {
        return res.status(400).json({ error: "L'ID de la session et la photo sont requis." });
    }

    const photoUrl = `/uploads/images/${req.file.filename}`;

    const sql = "INSERT INTO transactions_photos (session_backtest_id, photo_url) VALUES (?, ?)";

    db.query(sql, [session_backtest_id, photoUrl], (err, result) => {
        if (err) {
            console.error("❌ Erreur lors de l'ajout de la photo :", err);
            return res.status(500).json({ error: "Erreur serveur lors de l'ajout de la photo." });
        }

        res.status(201).json({ message: "Photo ajoutée avec succès !", photoUrl });
    });
};

// 📌 GET : Récupérer les photos d'une session par ID
exports.getPhotosBySession = (req, res) => {
    const { session_id } = req.params;

    if (!session_id) {
        return res.status(400).json({ error: "L'ID de la session est requis." });
    }

    console.log("📸 Requête pour récupérer les photos de la session :", session_id);

    const sql = "SELECT id, photo_url FROM transactions_photos WHERE session_backtest_id = ?";

    db.query(sql, [session_id], (err, results) => {
        if (err) {
            console.error("❌ Erreur lors de la récupération des photos :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des photos." });
        }

        console.log("🔍 Résultats trouvés :", results);

        if (results.length === 0) {
            return res.status(404).json({ error: "Aucune photo trouvée pour cette session." });
        }

        // Ajouter le domaine complet pour accéder aux images
        const photos = results.map(photo => ({
            id: photo.id,
            photo_url: `${req.protocol}://${req.get("host")}${photo.photo_url}`
        }));

        res.status(200).json({ photos });
    });
};

// 🔹 Middleware pour Multer
exports.upload = upload.single("photo");

exports.addBacktestSession = async (req, res) => {
    try {
        const user_id = req.user.id;  // ✅ Récupération de l'utilisateur connecté
        const { titre, objet, date_debut, capital, actif_id, status } = req.body;

        if (!titre || !date_debut || !capital || !actif_id) {
            return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
        }

        // Vérification du status pour s'assurer qu'il est bien valide
        const validStatuses = ['backtest', 'journal_trading'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: "Le status doit être 'backtest' ou 'journal_trading'." });
        }

        const sql = `
            INSERT INTO sessions_backtest (user_id, titre, objet, date_debut, capital, actif_id, status, decision)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Ajout d'une valeur pour `decision`, ici on met `null` par défaut
        db.query(
            sql,
            [user_id, titre, objet, date_debut, capital, actif_id, status || 'backtest', null],
            (err, result) => {
                if (err) {
                    console.error("❌ Erreur lors de l'ajout de la session :", err);
                    return res.status(500).json({ error: "Erreur serveur lors de l'ajout de la session." });
                }

                res.status(201).json({ message: "Session ajoutée avec succès !", session_id: result.insertId });
            }
        );

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};



exports.deleteBacktestSession = async (req, res) => {
    try {
        const { session_id } = req.params;

        if (!session_id) {
            return res.status(400).json({ error: "L'ID de la session est requis." });
        }

        const deleteQuery = "DELETE FROM sessions_backtest WHERE id = ?";

        db.query(deleteQuery, [session_id], (err, result) => {
            if (err) {
                console.error("❌ Erreur lors de la suppression de la session :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la suppression de la session." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Session non trouvée." });
            }

            console.log(`🗑️ Session ID ${session_id} supprimée avec succès.`);
            res.status(200).json({ message: "Session supprimée avec succès !" });
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

// 📌 Récupérer la session de backtest ayant un statut "journal trading" et correspondant à l'actif_id
exports.getSessionByActif = async (req, res) => {
    try {
        const { actif_id } = req.params;

        if (!actif_id) {
            return res.status(400).json({ error: "L'ID de l'actif est requis." });
        }

        const sql = `
            SELECT id, titre, date_debut, capital, status, decision
            FROM sessions_backtest
            WHERE actif_id = ? AND status = 'journal_trading'
            LIMIT 1
        `;

        db.query(sql, [actif_id], (err, results) => {
            if (err) {
                console.error("❌ Erreur lors de la récupération de la session :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération de la session." });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Aucune session trouvée pour cet actif avec le statut 'journal trading'." });
            }

            res.status(200).json(results[0]);
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

