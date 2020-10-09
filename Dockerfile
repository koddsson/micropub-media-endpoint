FROM node:14

RUN apk update \
    && apk add --virtual build-dependencies \
        build-base \
        gcc \
        nasm \
        autoconf

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# If you are building your code for production
RUN npm install --only=production

# Bundle app source
COPY . .

CMD [ "npm", "start" ]
