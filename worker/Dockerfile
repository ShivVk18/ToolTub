# LibreOffice (MPL-2.0) + Node. Runs as an unprivileged user on an internal-only network.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer-nogui fonts-dejavu fonts-liberation fonts-noto-core \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
RUN useradd -m klip && mkdir -p /data/jobs && chown klip /data/jobs
USER klip
CMD ["node", "src/index.mjs"]
