require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");


const app = express();
const PORT = process.env.PORT || 5001;

console.log("🔐 JWT_SECRET:", process.env.JWT_SECRET ? "OK ✅" : "NON DÉFINI ❌");
console.log("🔐 ENCRYPTION_KEY:", process.env.ENCRYPTION_KEY ? "OK ✅" : "NON DÉFINI ❌");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,
  message: "Trop de requêtes, veuillez réessayer plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 📌 Vérifier si `routes.js` est bien dans `routes/`
const routes = require("./routes");
app.use("/api", routes);

// 📌 Vérifier l'import de `usersRoutes.js`
const userRoutes = require("./routes/usersRoutes");
app.use("/api/users", userRoutes);

const transactionsRoutes = require("./routes/transactionsRoutes");
app.use("/api/transactions", transactionsRoutes);

const observationsRoutes = require("./routes/obrservationsRoutes");
app.use("/api/observations", observationsRoutes);

const sessionRoutes = require("./routes/sessionRoutes");
app.use("/api/sessions", sessionRoutes);

// 🔥 Correction du middleware d'erreur
app.use((err, req, res, next) => {
  console.error("💥 Erreur sur le serveur :", err);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
