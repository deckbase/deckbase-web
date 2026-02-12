FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  ca-certificates \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=8080
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 8080

CMD ["node", "server.js"]
