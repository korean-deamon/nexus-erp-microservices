FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Tailwind compile bo'lishi uchun build qilamiz
RUN npm run build

EXPOSE 3000

# Standalone o'rniga oddiy startdan foydalanamiz (monorepo uchun xavfsizroq)
CMD ["npm", "start"]
