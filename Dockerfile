# Stage 1: Build the application
FROM node:20-alpine AS build

# Inject environment variables at build time
ARG VITE_PFM_BASE_URL
ENV VITE_PFM_BASE_URL=$VITE_PFM_BASE_URL

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine

# Copy the custom nginx config to handle the /api proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from the build stage to Nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
