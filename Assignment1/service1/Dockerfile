FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
# vStorage mount point
VOLUME ["/vstorage"]
EXPOSE 8199
ENV STORAGE_URL=http://storage:8080
ENV SERVICE2_URL=http://service2:9090
CMD ["npm", "start"]