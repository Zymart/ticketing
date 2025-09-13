# Dockerfile (optional - Railway can auto-detect Node.js)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create data directory for JSON storage
RUN mkdir -p data

CMD ["npm", "start"]
