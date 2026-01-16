# Development Dockerfile for What's On The Menu
# Supports hot-reloading via Vite dev server

FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Default port (overridden by docker-compose)
ENV PORT=5173

# Expose Vite dev server port
EXPOSE $PORT

# Start the dev server with configurable port
CMD sh -c "npm run dev -- --port $PORT"
