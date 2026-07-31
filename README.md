# pi-pod-landing

Public marketing site for [pipod.dev](https://pipod.dev).

Static HTML/CSS served by a tiny Node HTTP server (`src/server.js`). No database,
no secrets, no runtime configuration beyond `PORT` (default `8080`).

## Local

```bash
npm start
# http://127.0.0.1:8080
```

## Production

- Image: `ghcr.io/pi-pod/pi-pod-landing`
- Service id: `pi-pod-landing` on mainvm4
- Routes: `pipod.dev` and `www.pipod.dev` (API remains on `api.pipod.dev`)

Deploy is digest-pinned and Cosign-signed via `.github/workflows/deploy.yml`.
