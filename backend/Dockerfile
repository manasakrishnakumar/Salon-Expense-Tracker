# Single-stage is enough here — this is plain ESM Node, no build/transpile
# step. node:20-alpine keeps the image small.
FROM node:20-alpine

WORKDIR /app

# Copy manifest first so `npm ci` is cached unless dependencies actually change.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY openapi.yaml ./openapi.yaml

ENV NODE_ENV=production
EXPOSE 4000

# Real Appwrite credentials (APPWRITE_API_KEY etc.) are NOT baked into the
# image — they're supplied at run time via `docker run -e` / --env-file, or
# by whatever the hosting platform's secret store is. See ../DEPLOYMENT.md.

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
