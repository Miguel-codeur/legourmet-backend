const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const verifyToken = require('../middleware/auth');
const { pool } = require('../config/db');

// GET /api/parametres/profil
router.get('/profil', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nom, email, role FROM utilisateurs WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// PUT /api/parametres/profil
router.put('/profil', verifyToken, async (req, res) => {
    const { nom, email, nouveauMotDePasse } = req.body;

    try {
        if (nouveauMotDePasse && nouveauMotDePasse.length >= 8) {
            const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
            await pool.query(
                'UPDATE utilisateurs SET nom = $1, email = $2, motdepasse = $3 WHERE id = $4',
                [nom, email, hashedPassword, req.user.id]
            );
        } else {
            await pool.query(
                'UPDATE utilisateurs SET nom = $1, email = $2 WHERE id = $3',
                [nom, email, req.user.id]
            );
        }
        res.json({ message: 'Profil mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// GET /api/parametres/restaurant
router.get('/restaurant', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM restaurant WHERE id = 1');
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Informations restaurant introuvables.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// PUT /api/parametres/restaurant
router.put('/restaurant', verifyToken, async (req, res) => {
    const { nom, adresse, telephone, heure_ouverture, heure_fermeture, capacite } = req.body;

    try {
        await pool.query(
            `UPDATE restaurant SET
        nom = $1, adresse = $2, telephone = $3,
        heure_ouverture = $4, heure_fermeture = $5, capacite = $6
       WHERE id = 1`,
            [nom, adresse, telephone, heure_ouverture, heure_fermeture, capacite]
        );
        res.json({ message: 'Informations restaurant mises à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// GET /api/parametres/dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        const caResult = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'Day') AS jour,
        DATE(created_at) AS date,
        COALESCE(SUM(total), 0) AS ca
      FROM commandes
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        AND statut != 'annulee'
      GROUP BY DATE(created_at), TO_CHAR(created_at, 'Day')
      ORDER BY date ASC
    `);

        const resumeResult = await pool.query(`
      SELECT
        COALESCE(SUM(total), 0) AS total_ca,
        COUNT(*) AS total_commandes
      FROM commandes
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
    `);

        const couvertsResult = await pool.query(`
      SELECT COALESCE(SUM(couverts), 0) AS total_couverts
      FROM reservations
      WHERE statut = 'confirmee'
        AND date_heure >= CURRENT_DATE - INTERVAL '6 days'
    `);

        const resume = resumeResult.rows[0];
        const couverts = couvertsResult.rows[0].total_couverts;
        const totalCommandes = parseInt(resume.total_commandes) || 1;

        res.json({
            ca_semaine: caResult.rows,
            resume: {
                total_ca: resume.total_ca,
                total_commandes: resume.total_commandes,
                total_couverts: couverts,
                moy_commandes_jour: Math.round(resume.total_commandes / 7),
                ticket_moyen: Math.round(resume.total_ca / totalCommandes),
            },
        });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

module.exports = router;