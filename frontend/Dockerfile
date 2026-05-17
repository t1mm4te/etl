FROM node:22-alpine

WORKDIR /app

ENV CI=true

RUN corepack enable && \
    corepack prepare pnpm@10.16.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]