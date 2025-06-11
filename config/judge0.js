const axios = require('axios');

const judge0Api = axios.create({
    baseURL: process.env.JUDGE0_API_URL || 'https://api.judge0.com',
    headers: {
        'x-rapidapi-key': process.env.JUDGE0_API_KEY,
        'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
        'Content-Type': 'application/json'
    }
});

module.exports = judge0Api;