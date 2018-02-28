FROM node:6

WORKDIR /

ADD . /


RUN npm install

ENTRYPOINT npm run start
EXPOSE 3000
