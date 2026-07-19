FROM node:18-bullseye

# Install FFmpeg at the system level
RUN apt-get update && apt-get install -y ffmpeg

# Set up the app
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Open the port for Express
EXPOSE 4000

# Start both the API and the Background Worker together
CMD ["sh", "-c", "node server.js & node worker.js"]