FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/package.json
COPY FrontEnd/package.json ./FrontEnd/package.json
RUN npm ci --workspace=c-lime-frontend --include-workspace-root=false

COPY FrontEnd ./FrontEnd
ARG VITE_API_BASE_URL=http://localhost:5000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build --workspace=c-lime-frontend

FROM nginx:stable-alpine

COPY FrontEnd/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/FrontEnd/dist /usr/share/nginx/html

EXPOSE 80
