FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm set strict-ssl false
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN npm ci

COPY . .

ARG VITE_BASE_URL_API
ENV VITE_BASE_URL_API=${VITE_BASE_URL_API}

RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
