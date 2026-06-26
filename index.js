const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');

// Import des routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const commandesRoutes = require('./routes/commandes');
const reservationsRoutes = require('./routes/reservations');
const parametresRoutes = require('./routes/parametres');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/commandes', commandesRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/parametres', parametresRoutes);

// Route de test
app.get('/', (req, res) => {
    res.json({ message: '🍽️ Le Gourmet API is running!' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;

const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
};

start();