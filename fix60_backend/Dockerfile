# API image. Web apps (site, admin) are deployed separately.
FROM node:24-alpine AS base
ENV HUSKY=0 PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Toolchain for bcrypt's native build.
RUN apk add --no-cache python3 make g++
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config packages/typescript-config
RUN pnpm install --frozen-lockfile --filter=@fix60/api...
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter=@fix60/shared build \
  && pnpm --filter=@fix60/db build \
  && pnpm --filter=@fix60/api build
RUN pnpm --filter=@fix60/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist

FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${API_PORT:-4000}/api/v1/health || exit 1
# Late build arg so earlier layers stay cached across commits.
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
CMD ["node", "dist/main.js"]
