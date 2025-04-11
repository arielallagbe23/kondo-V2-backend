const express = require("express");
const router = express.Router();
const transactionsController = require("../controllers/transactionsController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// ✅ Route pour récupérer les transactions de l'utilisateur connecté (via Token)
router.get("/transactions/me", authenticateUser, transactionsController.getUserTransactions);

// ✅ Route pour ajouter une transaction
router.post("/addTransactions", authenticateUser, transactionsController.addBacktestTransaction);

// ✅ Route pour récupérer les transactions d'une session spécifique
router.get("/transactions/:session_backtest_id", transactionsController.getTransactionsBySession);

// ✅ Route pour récupérer toutes les transactions en cours
router.get("/transactions-en-cours", authenticateUser, transactionsController.getEnCoursTransactions);

// ✅ Route pour supprimer une transaction
router.delete("/deleteTransaction/:transaction_id", authenticateUser, transactionsController.deleteTransaction);

router.put("/updateTransaction/:transaction_id", authenticateUser, transactionsController.updateTransaction);

// ✅ Route pour récupérer les transactions clôturées validées de l'utilisateur connecté
router.get("/valid-cloturees", authenticateUser, transactionsController.getValidClosedBacktestTransactions);

module.exports = router;
