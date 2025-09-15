# === Builder ===
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Gerar Prisma e compilar TypeScript
RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# === Runner ===
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Dependências nativas do Prisma e curl para health checks
RUN apk add --no-cache openssl curl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
# Porta padrão do app
EXPOSE 3000
CMD ["node", "dist/index.js"]