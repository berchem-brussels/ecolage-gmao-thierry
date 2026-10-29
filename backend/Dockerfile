# Serveur : Node 20, dépendances verrouillées par npm ci, utilisateur non root appuser (10001), contrôle de santé ;
# image à version fixée (standard v3.2, sections 10.2 et 15.6).
FROM node:20.19.5-alpine3.22
ENV NODE_ENV=production TZ=UTC
RUN addgroup -S -g 10001 appuser && adduser -S -D -H -u 10001 -G appuser appuser
WORKDIR /app
COPY package.json package-lock.json ./
# npm ls arrête la construction si une dépendance manque (npm ci peut finir à 0 sur une installation incomplète).
RUN npm ci --omit=dev && npm ls --omit=dev > /dev/null && npm cache clean --force
COPY --chown=10001:10001 src/ ./src/
COPY --chown=10001:10001 config/ ./config/
RUN mkdir -p data && chown 10001:10001 data
USER 10001
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/index.js"]
