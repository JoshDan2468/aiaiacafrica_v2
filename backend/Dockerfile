FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Compile migrations for Node; production does not need tsx or TypeScript.
COPY migrations ./migrations
RUN ./node_modules/.bin/tsc --ignoreConfig --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --outDir compiled-migrations migrations/*.ts \
    && echo '{"type":"module"}' > compiled-migrations/package.json
RUN npm prune --omit=dev

FROM node:22-bookworm-slim
ARG VERSION=0.1.0
LABEL org.opencontainers.image.title="AIAIAC backend" org.opencontainers.image.version=$VERSION
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/compiled-migrations ./migrations
COPY package.json ./
COPY docker/migrate.mjs docker/initialize.sh ./docker/
USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]
