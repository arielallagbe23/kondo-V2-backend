const express = require("express");
const router = express.Router();
const userController = require("../controllers/usersController");
const { authenticateUser } = require("../middlewares/authMiddleware");

router.post("/register", userController.registerUser);

router.post("/verify", userController.verifyUser);

router.post("/login", userController.loginUser);

router.get("/strategies", authenticateUser, userController.getUserStrategies);

router.get("/sessions-backtest", authenticateUser, userController.getUserSessionBacktest);

module.exports = router;
