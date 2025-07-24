# -------- build stage --------
FROM node:20-alpine AS build

# Create app directory
WORKDIR /usr/src/app

# Install production deps first for better cache‑reuse
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the sources
COPY . .

# -------- runtime stage --------
FROM node:20-alpine

# App runs as node (UID 1000) instead of root
USER node

WORKDIR /home/node/app
COPY --from=build /usr/src/app .

# Bind to port 3000 at runtime
EXPOSE 3000

CMD ["node", "index.js"]
