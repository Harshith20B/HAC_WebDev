# Use Node base with Debian/Ubuntu
FROM node:22-bullseye

# Install Python 3.11 and pip
RUN apt-get update && \
    apt-get install -y python3 python3-venv python3-pip && \
    ln -s /usr/bin/python3 /usr/bin/python

# Set workdir
WORKDIR /app

# Copy package.json and install Node deps
COPY package*.json ./
RUN npm install

# Copy requirements and install Python deps
COPY python/requirements.txt ./python/
RUN pip install -r ./python/requirements.txt

# Copy the rest of the app
COPY . .

# Expose your Node port
EXPOSE 5000

# Start the Node server
CMD ["node", "server.js"]
