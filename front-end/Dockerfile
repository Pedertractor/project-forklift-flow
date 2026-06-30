FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm set strict-ssl false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN npm ci

COPY . .

# Padrão /api (proxy nginx → back-end). Sobrescreva via build-arg ou raiz .env.
ARG VITE_BASE_URL_API=/api
ENV VITE_BASE_URL_API=${VITE_BASE_URL_API}

RUN export VITE_BASE_URL_API="${VITE_BASE_URL_API:-/api}" && npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
