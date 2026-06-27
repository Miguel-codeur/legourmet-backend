const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { pool } = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, motdepasse } = req.body;

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM utilisateurs WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
        }

        const user = result.recordset[0];
        const validPassword = await bcrypt.compare(motdepasse, user.motdepasse);

        if (!validPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            token,
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                role: user.role,
            },
        });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// POST /api/auth/mot-de-passe-oublie
router.post('/mot-de-passe-oublie', async (req, res) => {
    const { email } = req.body;

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM utilisateurs WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Aucun compte associé à cet email.' });
        }

        // Générer un code à 6 chiffres
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await pool.request()
            .input('email', sql.VarChar, email)
            .input('code', sql.VarChar, code)
            .input('expiration', sql.DateTime, expiration)
            .query('UPDATE utilisateurs SET reset_code = @code, reset_expiration = @expiration WHERE email = @email');

        // Envoyer l'email
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Le Gourmet" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Code de réinitialisation - Le Gourmet',
            html: `
        <h2>Réinitialisation de mot de passe</h2>
        <p>Votre code de réinitialisation est : <strong>${code}</strong></p>
        <p>Ce code expire dans 15 minutes.</p>
      `,
        });

        res.json({ message: 'Code envoyé par email.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// POST /api/auth/verifier-code
router.post('/verifier-code', async (req, res) => {
    const { email, code } = req.body;

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .input('code', sql.VarChar, code)
            .query('SELECT * FROM utilisateurs WHERE email = @email AND reset_code = @code');

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Code incorrect.' });
        }

        const user = result.recordset[0];
        if (new Date() > new Date(user.reset_expiration)) {
            return res.status(400).json({ message: 'Code expiré.' });
        }

        res.json({ message: 'Code valide.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

// POST /api/auth/nouveau-mot-de-passe
router.post('/nouveau-mot-de-passe', async (req, res) => {
    const { email, code, nouveauMotDePasse } = req.body;

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .input('code', sql.VarChar, code)
            .query('SELECT * FROM utilisateurs WHERE email = @email AND reset_code = @code');

        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Code incorrect.' });
        }

        const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);

        await pool.request()
            .input('email', sql.VarChar, email)
            .input('motdepasse', sql.VarChar, hashedPassword)
            .query('UPDATE utilisateurs SET motdepasse = @motdepasse, reset_code = NULL, reset_expiration = NULL WHERE email = @email');

        res.json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

module.exports = router;