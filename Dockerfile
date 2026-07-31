# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS runtime

ARG SOURCE_DATE_EPOCH
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

# Non-root runtime identity (matches hardened mainvm4 posture).
RUN addgroup -g 10001 -S pipod \
  && adduser -u 10001 -S -G pipod -H -s /sbin/nologin pipod

COPY --chown=pipod:pipod package.json ./
COPY --chown=pipod:pipod src ./src
COPY --chown=pipod:pipod public ./public

USER 10001:10001
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

LABEL org.opencontainers.image.source="https://github.com/pi-pod/pi-pod-landing" \
      org.opencontainers.image.title="pi-pod-landing" \
      org.opencontainers.image.description="Public marketing site for pipod.dev"

CMD ["node", "src/server.js"]
