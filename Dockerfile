# --- build the React app
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# --- serve it with nginx; /api/ is forwarded to the Loan API (API_UPSTREAM)
FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://192.168.2.93:80 \
    MAX_UPLOAD_SIZE=20m
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
