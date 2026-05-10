# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_GATEWAY_URL=http://localhost:3000
ARG VITE_ANALYTICS_URL=http://localhost:3001
ARG VITE_ADMIN_KEY=
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_ANALYTICS_URL=$VITE_ANALYTICS_URL
ENV VITE_ADMIN_KEY=$VITE_ADMIN_KEY
RUN npm run build

# ── Stage 2: Serve with nginx ───────────────────────────────────────────────────
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
