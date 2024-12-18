require('dotenv').config(); // This line loads the environment variables from the .env file

const config = {
    port: process.env.PORT || 5000,  // Default to 5000 if PORT is not set
};

module.exports = config;
