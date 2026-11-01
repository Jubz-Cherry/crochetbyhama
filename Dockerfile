FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
ENV VITE_DEMO_MODE=false
RUN npm run db:generate && npm run build
ENV NODE_ENV=production
EXPOSE 3001
USER node
CMD ["npm", "run", "server"]
