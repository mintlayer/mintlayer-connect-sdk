FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@10.15.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile \
    && pnpm build:sdk \
    && pnpm --filter market-maker-bot build \
    && mkdir -p /data && chown node:node /data
USER node
ENV BOT_HOST=0.0.0.0 BOT_PORT=3001 BOT_DB_PATH=/data/bot.sqlite
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3001/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "examples/market-maker-bot/dist-server/main.cjs"]
