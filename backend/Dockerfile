FROM node:20-bullseye

# Install FFmpeg at the system level
RUN apt-get update && apt-get install -y ffmpeg

# Set up the app
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Open the port for Express
EXPOSE 4000

# Single process: the worker runs in-process with the API (no Redis needed)
CMD ["node", "server.js"]