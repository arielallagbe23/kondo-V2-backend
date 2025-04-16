const express = require("express");
const router = express.Router();
const observationsController = require("../controllers/observationsController");

// 📌 Route pour ajouter une observation
router.post("/addObservation", observationsController.addObservation);

// 📌 Route pour récupérer les observations d'une session
router.get("/observations/:session_id", observationsController.getObservationsBySession);

// 📌 Route pour supprimer une observation
router.delete("/deleteObservation/:observation_id", observationsController.deleteObservation);

module.exports = router;
