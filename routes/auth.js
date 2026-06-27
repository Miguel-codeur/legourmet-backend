const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { pool } = require('../config/db');

router.post('/login', async (req, res) => {
    const { email, motdepasse } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM utilisateurs WHERE email = $1', [email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
        }
        const user = result.rows[0];
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
            user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

router.post('/mot-de-passe-oublie', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM utilisateurs WHERE email = $1', [email]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Aucun compte associé à cet email.' });
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 15 * 60 * 1000);
        await pool.query(
            'UPDATE utilisateurs SET reset_code = $1, reset_expiration = $2 WHERE email = $3',
            [code, expiration, email]
        );
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
            from: `"Le Gourmet" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Code de réinitialisation - Le Gourmet',
            html: `<h2>Réinitialisation</h2><p>Code : <strong>${code}</strong></p><p>Expire dans 15 minutes.</p>`,
        });
        res.json({ message: 'Code envoyé par email.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

router.post('/verifier-code', async (req, res) => {
    const { email, code } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM utilisateurs WHERE email = $1 AND reset_code = $2',
            [email, code]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Code incorrect.' });
        }
        const user = result.rows[0];
        if (new Date() > new Date(user.reset_expiration)) {
            return res.status(400).json({ message: 'Code expiré.' });
        }
        res.json({ message: 'Code valide.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

router.post('/nouveau-mot-de-passe', async (req, res) => {
    const { email, code, nouveauMotDePasse } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM utilisateurs WHERE email = $1 AND reset_code = $2',
            [email, code]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Code incorrect.' });
        }
        const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);
        await pool.query(
            'UPDATE utilisateurs SET motdepasse = $1, reset_code = NULL, reset_expiration = NULL WHERE email = $2',
            [hashedPassword, email]
        );
        res.json({ message: 'Mot de passe mis à jour avec succès.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur.', error: err.message });
    }
});

module.exports = router;