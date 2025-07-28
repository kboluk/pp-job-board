# 🛠 Progressively‑Enhanced Job Board

A tiny Express + SSE demo that shows how to:

* **Progressive enhancement** – full‑function HTML when JavaScript is off; instant refinements (live search, tag filters) when it’s on.
* **Minimal dependencies** – framework‑agnostic UI (Chota ≈ 10 KB), zero front‑end build steps.
* **Strong security posture** – Nginx sets CSP without 'unsafe-inline', serves static files and enforces rate limits; SameSite Strict cookies, CSRF tokens via `csrf-sync`, HTTPS even in dev.
* **Server‑Sent Events** – stateless live updates powered by Node streams.
* **Clean Docker workflow** – one `Dockerfile` + Nginx sidecar for local TLS and eventual prod parity.

## Demo

<p align="center">
  <img src="docs/media/screenshot-home.png" alt="Job board home" width="700">
</p>

### Instant search (JS enabled)

<p align="center">
  <img src="docs/media/demo-instant-search.gif" alt="Instant search with HTMX" width="700">
</p>

### Baseline experience (JS disabled)

<p align="center">
  <img src="docs/media/demo-no-js.gif" alt="Full-page reload fallback" width="700">
</p>


## 🗂 Repository layout

```

.
├─ data/                 # sample JSON data source
│  └─ jobs.sample.json
├─ lib/
│  ├─ jobs.js            # data loading & sanitisation
│  ├─ render.js          # server‑side HTML templates
│  ├─ sessions.js        # session state management
│  └─ util.js
├─ public/
│  ├─ style.css          # tiny add‑on to Chota
│  └─ app.js             # browser JS (SSE + fetch)
├─ index.js              # express server
├─ nginx.conf            # reverse‑proxy & TLS termination
├─ docker-compose.yml
├─ Dockerfile
└─ README.md

````

---

## ⚙️ Daily development loop

We run **everything inside Docker**, even during development, so that TLS, cookies (`Secure` always on), and proxy behaviour match production byte‑for‑byte.

```bash
# Hot‑reload dev stack
docker compose -f docker-compose.dev.yml up --build

# Stop / prune
docker compose -f docker-compose.dev.yml down
```

---

## 🚀 Quick start

> **Prerequisites**
> Docker ≥ 24
>
> Docker Compose v2 (bundled with Docker Desktop / recent Engine)
>
> Node.js 20.x

### 1. Generate a local certificate _(once per machine)_

```bash
mkdir certs
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout certs/dev.key -out certs/dev.crt -days 825 \
  -subj "/CN=localhost"
````

> macOS users can alternatively run `mkcert -install && mkcert -key-file certs/dev.key -cert-file certs/dev.crt localhost`.

### 2. Build & run

```bash
docker compose up --build
```

* `app` → Node image exposes port **3000** inside the network.
* `nginx` → Alpine Nginx on **[https://localhost:3443](https://localhost:3443)** (TLS) and proxies SSE with buffering disabled.

Visit **[https://localhost:3443](https://localhost:3443)** ‑‑ you’ll see the job board and can live‑filter without page reloads.

### 3. Stop / clean up

```bash
docker compose down
```

---

## 🔑 Nginx config (recap)

```nginx
limit_req_zone $binary_remote_addr zone=req:10m rate=7r/m;

server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /etc/nginx/certs/dev.crt;
    ssl_certificate_key /etc/nginx/certs/dev.key;

    client_max_body_size 2M;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Permissions-Policy "interest-cohort=()" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "
      default-src 'self';
      connect-src 'self';
      style-src 'self' https://unpkg.com;
      img-src 'self' data:;
      font-src 'self';
      object-src 'none';
      base-uri 'none';
      form-action 'self';
    " always;

    location ~* \.(?:css|js|woff2?|ico|png|svg)$ {
        root /usr/share/nginx/html;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        limit_req zone=req burst=20 nodelay;
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    location /events {
        proxy_pass          http://app:3000;
        proxy_http_version  1.1;
        proxy_set_header    Connection '';
        proxy_buffering     off;
        proxy_cache         off;
        proxy_read_timeout  1h;
        chunked_transfer_encoding on;
        proxy_set_header    Accept-Encoding '';
        gzip off;
    }
}
```

---

## 🔒 Security highlights

| Layer         | Measure                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| **Transport** | Local TLS via Nginx; production ready for Let’s Encrypt.                      |
| **Cookies**   | `HttpOnly; Secure; SameSite=Strict` |
| **CSRF**      | `csrf-sync` synchroniser token with secret cookie & `x-csrf-token` header.    |
| **CSP**       | Set in Nginx: `default-src 'self'`; external CSS whitelisted with SRI; no `unsafe-inline`.  |
| **XSS**       | Output escaped with `html‑escaper`; URLs validated server‑side.               |
| **Rate limiting** | `limit_req` in Nginx restricts clients to 7 req/min (burst 20). |
| **Static files** | Served by Nginx with 30d immutable cache. |

---

## 🪄 Major features / talking points

1. **Progressive Enhancement:**

   * HTML renders all jobs and tag filters server‑side.
   * JS upgrades: debounced search, SSE push, multi‑column tag layout.

2. **Data pipeline:**

   * Raw JSON ➜ validated on startup ➜ lower‑cased search keys cached.

3. **Server‑Sent Events:**

   * Single `/events` endpoint; pings every 15 s to keep Heroku‑style dynos warm; Nginx pipe kept open with `proxy_read_timeout 1h`.

4. **Zero front‑end build:**

   * Chota CSS pulled via CDN + SRI; additional 20 lines in `public/style.css`.

5. **Slim container images:**

   * Multi‑stage build (npm ci, then copy artefacts). Final image ≈ 90 MB.

---

## 🧞 Handy dev commands

```bash
# Rebuild only the Node image
docker compose build app

# Tail logs for SSE debugging
docker compose logs -f app

# Hot‑reload inside container (nodemon dev variant)
docker compose -f docker-compose.dev.yml up --build
```

---

## 🙌 Contributing

1. Fork & clone.
2. Create a feature branch.
3. Run `npm run lint` and `npm test` before PR.
4. Open your pull request—CI will build the Docker image and run integration tests (SSE + CSRF).
5. Lighthouse audits run in CI via `.lighthouserc.json` against the HTTPS Nginx front-end, uploading the results to Google's temporary public storage.

Enjoy hacking on a truly tiny yet secure full‑stack app!

