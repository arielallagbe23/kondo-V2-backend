const db = require("../database");

exports.getTypesActif = (req, res) => {
  const query = "SELECT * FROM types_actif";

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
};

exports.getActifs = (req, res) => {
  const query = "SELECT * FROM actifs";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
};

exports.getTypesOrdres = (req, res) => {
  const query = "SELECT * FROM types_ordres";

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
};

exports.getTimeframes = (req, res) => {
  const query = "SELECT * FROM timeframes";

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
};

exports.getResultats = (req, res) => {
  const query = "SELECT * FROM resultats";

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
};