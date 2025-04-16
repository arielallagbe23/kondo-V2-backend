const db = require("../database");

// 📌 Ajouter une observation
exports.addObservation = async (req, res) => {
    try {
        console.log("📥 Requête reçue pour ajouter une observation :", req.body);

        const { session_id, contenu } = req.body;

        if (!session_id || !contenu) {
            console.error("❌ Erreur : session_id ou contenu manquant !");
            return res.status(400).json({ error: "Le session_id et le contenu sont requis." });
        }

        const sql = `
            INSERT INTO observations (session_id, contenu, date_ajout) 
            VALUES (?, ?, NOW())
        `;

        db.query(sql, [session_id, contenu], (err, result) => {
            if (err) {
                console.error("⚠️ Erreur lors de l'ajout de l'observation :", err);
                return res.status(500).json({ error: "Erreur serveur lors de l'ajout de l'observation." });
            }

            console.log(`✅ Observation ajoutée avec succès ! ID inséré : ${result.insertId}`);
            res.status(201).json({ message: "Observation ajoutée avec succès !", insertedId: result.insertId });
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

// 📌 Récupérer les observations d'une session spécifique
exports.getObservationsBySession = async (req, res) => {
    try {
        const { session_id } = req.params;

        if (!session_id) {
            return res.status(400).json({ error: "L'ID de la session est requis." });
        }

        const sql = `
            SELECT id, session_id, contenu, date_ajout 
            FROM observations 
            WHERE session_id = ? 
            ORDER BY date_ajout DESC;
        `;

        db.query(sql, [session_id], (err, results) => {
            if (err) {
                console.error("⚠️ Erreur lors de la récupération des observations :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération des observations." });
            }

            res.status(200).json(results);
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

// 📌 Supprimer une observation par ID
exports.deleteObservation = async (req, res) => {
    try {
        const { observation_id } = req.params;

        if (!observation_id) {
            return res.status(400).json({ error: "L'ID de l'observation est requis." });
        }

        const sql = `DELETE FROM observations WHERE id = ?`;

        db.query(sql, [observation_id], (err, result) => {
            if (err) {
                console.error("⚠️ Erreur lors de la suppression de l'observation :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la suppression de l'observation." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Observation non trouvée." });
            }

            console.log(`✅ Observation ID ${observation_id} supprimée avec succès !`);
            res.status(200).json({ message: "Observation supprimée avec succès !" });
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};
