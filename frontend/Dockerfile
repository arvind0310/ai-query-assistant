# syntax=docker/dockerfile:1

# ---- build: produce static assets ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ---- runtime: static files served by unprivileged nginx on :8080 ----
FROM nginxinc/nginx-unprivileged:1.27-alpine
# Rendered with envsubst at container start; BACKEND_URL is where /api is proxied.
ENV BACKEND_URL=http://backend:3001
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
