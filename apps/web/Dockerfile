FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN npm ci
COPY apps/web apps/web
COPY packages/api-client packages/api-client
ARG VITE_DEFAULT_LOCALE=vi
ENV VITE_DEFAULT_LOCALE=$VITE_DEFAULT_LOCALE
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
