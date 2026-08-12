const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'church.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// Création de la connexion SQLite
const db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? null : null });

// Activer le mode WAL et les clés étrangères
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Exécuter le schéma d'initialisation
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

console.log('✅ Base de données SQLite connectée et initialisée avec succès.');

module.exports = db;
