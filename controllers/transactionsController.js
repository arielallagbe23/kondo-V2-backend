const db = require("../database");

exports.addBacktestTransaction = async (req, res) => {
    try {
        console.log("📥 Requête reçue pour ajouter une transaction :", req.body);

        // ✅ Récupération de `user_id` depuis le token (middleware d'auth)
        const user_id = req.user.id;  

        // ✅ Récupération des données envoyées
        const { 
            session_backtest_id, 
            actif_id, 
            strategie_id, 
            timeframe_id, 
            resultat_id, 
            date_entree, 
            rrp, 
            risque,
            status 
        } = req.body;

        // ✅ Vérification des champs obligatoires
        if (!session_backtest_id || !actif_id || !timeframe_id || !resultat_id || !date_entree || !risque || !status) {
            console.error("❌ Erreur : Champs manquants !");
            return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis, y compris le status." });
        }

        // ✅ Données préparées pour l'insertion
        const preparedData = {
            user_id,
            session_backtest_id,
            actif_id,
            strategie_id: strategie_id || 0, // Par défaut 0
            timeframe_id,
            resultat_id,
            date_entree,
            rrp: rrp || "0", // Par défaut "0"
            risque,
            status
        };

        console.log("🛠️ Données prêtes à être insérées :", preparedData);

        // ✅ Requête SQL d'insertion
        const sql = `
            INSERT INTO transactions_backtest 
            (user_id, session_backtest_id, actif_id, strategie_id, timeframe_id, resultat_id, date_entree, rrp, risque, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            preparedData.user_id,
            preparedData.session_backtest_id,
            preparedData.actif_id,
            preparedData.strategie_id,
            preparedData.timeframe_id,
            preparedData.resultat_id,
            preparedData.date_entree,
            preparedData.rrp,
            preparedData.risque,
            preparedData.status
        ];

        // ✅ Exécution de la requête SQL
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("⚠️ Erreur SQL lors de l'insertion de la transaction :", err);
                return res.status(500).json({ error: "Erreur lors de l'ajout de la transaction." });
            }

            console.log(`✅ Transaction ajoutée avec succès ! ID inséré : ${result.insertId}`);
            res.status(201).json({ message: "Transaction ajoutée avec succès !", insertedId: result.insertId });
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

exports.getTransactionsBySession = async (req, res) => {
    try {
        const { session_backtest_id } = req.params;

        if (!session_backtest_id) {
            return res.status(400).json({ error: "L'ID de la session est requis." });
        }

        const sql = `SELECT 
                        tb.*,
                        a.nom_actif
                    FROM 
                        transactions_backtest tb
                    JOIN 
                        sessions_backtest sb ON tb.session_backtest_id = sb.id
                    JOIN 
                        actifs a ON sb.actif_id = a.id
                    WHERE 
                        tb.session_backtest_id = ?
                    AND 
                        tb.status = 'clôturé';`; // Ajout du filtre WHERE status = 'clôturé'

        db.query(sql, [session_backtest_id], (err, results) => {
            if (err) {
                console.error("⚠️ Erreur lors de la récupération des transactions :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération des transactions." });
            }

            res.status(200).json(results);
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

exports.getEnCoursTransactions = async (req, res) => {
    try {
        const sql = `
            SELECT 
                tb.*,
                a.nom_actif,
                s.nom_strategie,
                r.resultat
            FROM 
                transactions_backtest tb
            JOIN 
                actifs a ON tb.actif_id = a.id
            LEFT JOIN 
                strategies s ON tb.strategie_id = s.id
            LEFT JOIN 
                resultats r ON tb.resultat_id = r.id
            WHERE 
                tb.status = 'en_cours';
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error("⚠️ Erreur lors de la récupération des transactions en cours :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération des transactions en cours." });
            }

            res.status(200).json(results);
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const { transaction_id } = req.params;

        if (!transaction_id) {
            return res.status(400).json({ error: "L'ID de la transaction est requis." });
        }

        const sql = "DELETE FROM transactions_backtest WHERE id = ?";
        
        db.query(sql, [transaction_id], (err, result) => {
            if (err) {
                console.error("⚠️ Erreur lors de la suppression de la transaction :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la suppression." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Transaction non trouvée." });
            }

            console.log(`✅ Transaction supprimée avec succès ! ID : ${transaction_id}`);
            res.status(200).json({ message: "Transaction supprimée avec succès !" });
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};


// ✅ Fonction pour récupérer les transactions clôturées de l'utilisateur connecté (via Token)
exports.getUserTransactions = async (req, res) => {
    try {
        const user_id = req.user.id; // ✅ Récupérer `user_id` depuis `req.user` (ajouté par le middleware)

        const sql = `
            SELECT 
                tb.*, 
                a.nom_actif 
            FROM 
                transactions_backtest tb
            JOIN 
                actifs a ON tb.actif_id = a.id
            WHERE 
                tb.user_id = ?
                AND tb.status = 'clôturé';  -- 🔥 Ajout du filtre ici
        `;

        db.query(sql, [user_id], (err, results) => {
            if (err) {
                console.error("⚠️ Erreur lors de la récupération des transactions :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la récupération des transactions." });
            }

            res.status(200).json(results);
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};


exports.updateTransaction = async (req, res) => {
    try {
        const { transaction_id } = req.params;
        const { 
            user_id, 
            session_backtest_id, 
            actif_id, 
            strategie_id, 
            timeframe_id, 
            resultat_id, 
            date_entree, 
            rrp, 
            risque, 
            status 
        } = req.body;

        if (!transaction_id) {
            return res.status(400).json({ error: "L'ID de la transaction est requis." });
        }

        // Vérifier s'il y a au moins un champ à mettre à jour
        if (!user_id && !session_backtest_id && !actif_id && !strategie_id && 
            !timeframe_id && !resultat_id && !date_entree && !rrp && !risque && !status) {
            return res.status(400).json({ error: "Aucune donnée fournie pour la mise à jour." });
        }

        // Construction de la requête SQL dynamique
        let updateFields = [];
        let values = [];

        if (user_id) updateFields.push("user_id = ?");
        if (session_backtest_id) updateFields.push("session_backtest_id = ?");
        if (actif_id) updateFields.push("actif_id = ?");
        if (strategie_id) updateFields.push("strategie_id = ?");
        if (timeframe_id) updateFields.push("timeframe_id = ?");
        if (resultat_id) updateFields.push("resultat_id = ?");
        if (date_entree) updateFields.push("date_entree = ?");
        if (rrp) updateFields.push("rrp = ?");
        if (risque) updateFields.push("risque = ?");
        if (status) updateFields.push("status = ?");

        values = [user_id, session_backtest_id, actif_id, strategie_id, timeframe_id, resultat_id, date_entree, rrp, risque, status]
                    .filter(value => value !== undefined);

        const sql = `UPDATE transactions_backtest SET ${updateFields.join(", ")} WHERE id = ?`;
        values.push(transaction_id);

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("⚠️ Erreur lors de la mise à jour de la transaction :", err);
                return res.status(500).json({ error: "Erreur serveur lors de la mise à jour de la transaction." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Transaction non trouvée." });
            }

            console.log(`✅ Transaction mise à jour avec succès ! ID : ${transaction_id}`);
            res.status(200).json({ message: "Transaction mise à jour avec succès !" });
        });

    } catch (error) {
        console.error("⚠️ Erreur interne du serveur :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};

exports.getValidClosedBacktestTransactions = async (req, res) => {
    try {
      const user_id = req.user?.id;
  
      console.log("🔥 getValidClosedBacktestTransactions appelée par user_id:", user_id);
  
      if (!user_id) {
        return res.status(401).json({ error: "Utilisateur non authentifié." });
      }
  
      const sql = `
        SELECT 
          tb.*,
          a.nom_actif,
          ta.type_actif,
          sb.titre AS session_titre,  -- ✅ Ajouté ici
          sb.date_debut,
          sb.capital,
          sb.benefice,
          sb.status AS session_status,
          sb.decision,
          s.nom_strategie,
          r.resultat
        FROM 
          transactions_backtest tb
        JOIN 
          sessions_backtest sb ON tb.session_backtest_id = sb.id
        JOIN 
          actifs a ON tb.actif_id = a.id
        JOIN 
          types_actif ta ON a.type_actif_id = ta.id
        LEFT JOIN 
          strategies s ON tb.strategie_id = s.id
        LEFT JOIN 
          resultats r ON tb.resultat_id = r.id
        WHERE 
          tb.status = 'clôturé'
          AND sb.decision = 'recommandé'
          AND tb.user_id = ?;
      `;
  
      db.query(sql, [user_id], (err, results) => {
        if (err) {
          console.error("❌ Erreur SQL :", err);
          return res.status(500).json({ error: "Erreur SQL." });
        }
  
        console.log(`✅ ${results.length} transaction(s) trouvée(s) pour user_id ${user_id}`);
        res.status(200).json(results);
      });
  
    } catch (error) {
      console.error("❌ Erreur serveur :", error);
      res.status(500).json({ error: "Erreur interne du serveur." });
    }
  };
  
