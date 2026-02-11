FROM ghcr.io/puppeteer/puppeteer:24.10.2

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
