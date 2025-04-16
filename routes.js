const express = require("express");
const router = express.Router();

const elementsController = require("./controllers/elementsController");

router.get("/types-actif", elementsController.getTypesActif);

router.get("/actifs", elementsController.getActifs);

router.get("/types-ordres", elementsController.getTypesOrdres);

router.get("/timeframes", elementsController.getTimeframes);

router.get("/resultats", elementsController.getResultats);

module.exports = router;
