FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma generate --schema prisma/schema.prisma
RUN pnpm --filter api build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/seed-super-admin.mjs ./apps/api/seed-super-admin.mjs
COPY --from=build /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
COPY --from=build /app/prisma ./prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN sed -i 's/\r$//' apps/api/docker-entrypoint.sh && chmod +x apps/api/docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["sh", "apps/api/docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/main.js"]