FROM node:22

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install yarn (comes with corepack in Node 22)
RUN corepack enable

# Install dependencies
RUN yarn install

# Copy rest of code
COPY . .

EXPOSE 5000

CMD ["yarn", "start"]
