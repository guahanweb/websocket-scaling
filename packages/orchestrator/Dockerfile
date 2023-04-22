FROM node:20-alpine

# generic node installation
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g nodemon

# any app running from src will work
COPY tsconfig.json ./
COPY ./src ./src
CMD ["npm", "run", "dev"]
