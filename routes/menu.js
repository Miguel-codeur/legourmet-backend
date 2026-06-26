const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { pool } = require('../config/db');

// GET /api/menu
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM menu ORDER BY categorie, nom');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// POST /api/menu
router.post('/', verifyToken, async (req, res) => {
    const { nom, description, prix, categorie, disponible } = req.body;

    try {
        await pool.query(
            'INSERT INTO menu (nom, description, prix, categorie, disponible) VALUES ($1, $2, $3, $4, $5)',
            [nom, description, prix, categorie, disponible ?? true]
        );
        res.status(201).json({ message: 'Article ajouté avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// PUT /api/menu/:id
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { nom, description, prix, categorie, disponible } = req.body;

    try {
        await pool.query(
            'UPDATE menu SET nom = $1, description = $2, prix = $3, categorie = $4, disponible = $5 WHERE id = $6',
            [nom, description, prix, categorie, disponible, id]
        );
        res.json({ message: 'Article mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// DELETE /api/menu/:id
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM menu WHERE id = $1', [id]);
        res.json({ message: 'Article supprimé avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

module.exports = router;