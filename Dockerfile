FROM node:22-alpine

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose ports for Vite (5173) and Express (3001)
EXPOSE 5173 3001

# Run both client and server
CMD ["npm", "run", "dev"]
