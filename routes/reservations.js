const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { pool } = require('../config/db');

// GET /api/reservations
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservations ORDER BY date_heure DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// GET /api/reservations/stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN statut = 'en_attente' THEN 1 END) AS en_attente,
        COUNT(CASE WHEN statut = 'confirmee' THEN 1 END) AS confirmees,
        COALESCE(SUM(CASE WHEN statut = 'confirmee' THEN couverts END), 0) AS couverts_confirmes
      FROM reservations
    `);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// POST /api/reservations
router.post('/', verifyToken, async (req, res) => {
    const { client_nom, client_telephone, date_heure, couverts, numero_table, note, statut } = req.body;

    try {
        await pool.query(
            `INSERT INTO reservations (client_nom, client_telephone, date_heure, couverts, numero_table, note, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [client_nom, client_telephone, date_heure, couverts, numero_table, note || null, statut || 'en_attente']
        );
        res.status(201).json({ message: 'Réservation créée avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// PUT /api/reservations/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { client_nom, client_telephone, date_heure, couverts, numero_table, note, statut } = req.body;

    try {
        await pool.query(
            `UPDATE reservations SET
        client_nom = $1, client_telephone = $2, date_heure = $3,
        couverts = $4, numero_table = $5, note = $6, statut = $7
       WHERE id = $8`,
            [client_nom, client_telephone, date_heure, couverts, numero_table, note || null, statut, id]
        );
        res.json({ message: 'Réservation mise à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// PUT /api/reservations/:id/statut
router.put('/:id/statut', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;

    try {
        await pool.query('UPDATE reservations SET statut = $1 WHERE id = $2', [statut, id]);
        res.json({ message: 'Statut mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// DELETE /api/reservations/:id
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM reservations WHERE id = $1', [id]);
        res.json({ message: 'Réservation supprimée avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

module.exports = router;