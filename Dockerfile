# Étape 1 : Build Angular
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build -- --configuration production

# Étape 2 : Serve via Nginx
FROM nginx:alpine
COPY --from=build /app/dist/Modernize/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
