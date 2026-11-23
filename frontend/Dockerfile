# Interface : dist/ construit et testé avant la livraison (patron PILOT, admis par le standard v3.2 section 5
# quand la durée de construction sur le NAS le justifie ; choix du 15/10/2026). L'image ne fait que copier.
# Images à version fixée (section 15.6) ; contrôle de santé par openssl.
FROM nginx:1.27.5-alpine
RUN apk add --no-cache openssl
COPY --chmod=755 dist /usr/share/nginx/html
COPY --chmod=644 nginx.conf /etc/nginx/app.conf.template
COPY --chmod=755 docker-entrypoint.sh /app-entrypoint.sh
EXPOSE 443 80
# Contrôle de santé par openssl : le wget de BusyBox ne suit pas la redirection de HTTP vers HTTPS (standard v3.2, section 15.6)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD sh -c "echo | openssl s_client -connect 127.0.0.1:443 >/dev/null 2>&1"
CMD ["/app-entrypoint.sh"]
