FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/package.json
COPY FrontEnd/package.json ./FrontEnd/package.json
RUN npm ci --workspace=c-lime-backend --include-workspace-root=false

COPY Backend ./Backend

WORKDIR /app/Backend
ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]
