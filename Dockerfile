# Utiliser une image officielle de Node.js comme base
FROM node:18

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json avant d’installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tous les fichiers du projet dans le conteneur
COPY . .

# Exposer le port défini dans .env (5001 par défaut)
EXPOSE 5001

# Commande pour démarrer l’application
CMD ["npm", "start"]
