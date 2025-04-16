const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { authenticateUser } = require("../middlewares/authMiddleware"); // 🔹 Assure-toi d'importer la bonne fonction

// 📌 Route pour modifier une session de backtest
router.put("/updateSession/:session_backtest_id", sessionController.updateBacktestSession);

// 📌 Route pour récupérer le bénéfice d'une session
router.get("/session-benefice/:session_id", sessionController.getSessionBenefice);

// 📌 Route pour uploader une image
router.post("/photos/upload", sessionController.upload, sessionController.uploadPhoto);

// 📌 Route pour récupérer les photos d'une session
router.get("/photos/:session_id", sessionController.getPhotosBySession);

// 📌 Route pour ajouter une nouvelle session (Utilisateur connecté requis)
router.post("/addSession", authenticateUser, sessionController.addBacktestSession); // 🔹 Utilisation du bon middleware

// 📌 Route pour supprimer une session et toutes ses transactions associées (DELETE CASCADE)
router.delete("/deleteSession/:session_id", authenticateUser, sessionController.deleteBacktestSession);

// 📌 Route pour récupérer la session de backtest en fonction de l'actif
router.get("/session-backtest/:actif_id", sessionController.getSessionByActif);

router.put("/updateSessionDecision/:session_id", authenticateUser, sessionController.updateSessionDecision);

module.exports = router;
