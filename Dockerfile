FROM node:18-alpine

# Install Python and build tools for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Set environment variables for Docker
ENV NODE_ENV=docker
ENV DOCKER_ENV=true

WORKDIR /app

# Copy package files first for better caching
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY . .

# Build arguments for backend configuration
ARG INVITATION_CODE=----
ARG YEAR_DATA_START=1991
ARG QINIU_ACCESS_KEY=
ARG QINIU_SECRET_KEY=
ARG DB_HOST=mysql
ARG DB_USER=root
ARG DB_PASSWORD=rootpassword
ARG DB_PORT=3306
ARG DB_TIMEZONE=

# Create dynamic config files
RUN echo '{ \
    "invitation_code": "'$INVITATION_CODE'", \
    "year_data_start": '$YEAR_DATA_START', \
    "qiniu_access_key": "'$QINIU_ACCESS_KEY'", \
    "qiniu_secret_key": "'$QINIU_SECRET_KEY'" \
}' > config/configProject.json

RUN echo '{ \
    "host": "'$DB_HOST'", \
    "user": "'$DB_USER'", \
    "password": "'$DB_PASSWORD'", \
    "port": '$DB_PORT', \
    "multipleStatements": true, \
    "timezone": "'$DB_TIMEZONE'" \
}' > config/configDatabase.json

# Build the TypeScript application
RUN yarn build

# Create a startup script to rebuild bcrypt at runtime (use printf for LF)
RUN printf '#!/bin/sh\nnpm rebuild bcrypt --build-from-source\nexec node ./dist/bin/portal.js\n' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Start the application
CMD ["/app/start.sh"]
