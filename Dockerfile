# Development Dockerfile for What's On The Menu
# Supports hot-reloading via Vite dev server + Express backend

FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose ports for Vite (5173) and Express (3001)
EXPOSE 5173 3001

# Run both client and server
CMD ["npm", "run", "dev"]
