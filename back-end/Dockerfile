FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm set strict-ssl false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN npm install

# prisma.config.ts exige DATABASE_URL ao carregar; .env não entra no build (.dockerignore)
ENV DATABASE_URL=postgresql://docker:docker@project-forklift-database:5432/forklift_db?schema=public

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/prisma.config.ts ./prisma.config.ts
COPY --from=build /usr/src/app/src ./src

EXPOSE 3131
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npx prisma db seed && npm run start"]