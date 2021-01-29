FROM node:14-alpine

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN npm install

ENV CCV_API_PORT=8080

EXPOSE 8080

CMD ["npm", "start"]
