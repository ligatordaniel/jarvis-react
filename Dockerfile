FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_OCARINA_API_URL=http://localhost:8081
ARG VITE_KAFRA_API_URL=/kafra-api
ARG VITE_SHAULA_API_URL=/shaula-api
ARG VITE_BEE_API_URL=/bee-api
ENV VITE_OCARINA_API_URL=$VITE_OCARINA_API_URL
ENV VITE_KAFRA_API_URL=$VITE_KAFRA_API_URL
ENV VITE_SHAULA_API_URL=$VITE_SHAULA_API_URL
ENV VITE_BEE_API_URL=$VITE_BEE_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
