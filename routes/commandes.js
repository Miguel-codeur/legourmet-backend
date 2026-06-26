const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { pool } = require('../config/db');

// GET /api/commandes
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT c.*,
        STRING_AGG(m.nom || ' x' || cd.quantite::text, ', ') AS articles
      FROM commandes c
      LEFT JOIN commandes_details cd ON cd.commande_id = c.id
      LEFT JOIN menu m ON cd.menu_id = m.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// GET /api/commandes/stats
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN statut = 'en_attente' THEN 1 END) AS en_attente,
        COUNT(CASE WHEN statut = 'en_cours' THEN 1 END) AS en_cours,
        COUNT(CASE WHEN statut = 'servie' THEN 1 END) AS servies,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total END), 0) AS ca_jour
      FROM commandes
      WHERE DATE(created_at) = CURRENT_DATE
    `);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// POST /api/commandes
router.post('/', verifyToken, async (req, res) => {
    const { numero_table, articles, total } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO commandes (numero_table, total, statut, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
            [numero_table, total, 'en_attente']
        );

        const commandeId = result.rows[0].id;

        for (const article of articles) {
            await pool.query(
                'INSERT INTO commandes_details (commande_id, menu_id, quantite, prix_unitaire) VALUES ($1, $2, $3, $4)',
                [commandeId, article.menu_id, article.quantite, article.prix_unitaire]
            );
        }

        res.status(201).json({ message: 'Commande créée avec succès.', id: commandeId });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// PUT /api/commandes/:id/statut
router.put('/:id/statut', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;

    try {
        await pool.query('UPDATE commandes SET statut = $1 WHERE id = $2', [statut, id]);
        res.json({ message: 'Statut mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// DELETE /api/commandes/:id
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM commandes_details WHERE commande_id = $1', [id]);
        await pool.query('DELETE FROM commandes WHERE id = $1', [id]);
        res.json({ message: 'Commande supprimée avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

module.exports = router;