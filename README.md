# 🛠 Progressively‑Enhanced Job Board

A tiny Express + SSE demo that shows how to:

* **Progressive enhancement** – full‑function HTML when JavaScript is off; instant refinements (live search, tag filters) when it’s on.
* **Minimal dependencies** – framework‑agnostic UI (Chota ≈ 10 KB), zero front‑end build steps.
* **Strong security posture** – CSP without `'unsafe-inline'`, SameSite Strict cookies, CSRF tokens via `csrf-sync`, HTTPS even in dev.
* **Server‑Sent Events** – stateless live updates powered by Node streams.
* **Clean Docker workflow** – one `Dockerfile` + Nginx sidecar for local TLS and eventual prod parity.

---

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
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /etc/nginx/certs/dev.crt;
    ssl_certificate_key /etc/nginx/certs/dev.key;

    # Main proxy
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }

    # SSE stream
    location /events {
        proxy_pass          http://app:3000;
        proxy_http_version  1.1;
        proxy_set_header    Connection '';
        proxy_buffering     off;
        proxy_cache         off;
        proxy_read_timeout  1h;
        chunked_transfer_encoding on;
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
| **CSP**       | `default-src 'self'`; external CSS whitelisted with SRI; no `unsafe-inline`.  |
| **XSS**       | Output escaped with `html‑escaper`; URLs validated server‑side.               |

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

Enjoy hacking on a truly tiny yet secure full‑stack app!

