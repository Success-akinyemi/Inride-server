import axios from 'axios';

const apiKey = '';

const config = {
    method: 'get',  // Change to 'post', 'put', or 'delete' if needed
    url: 'https://api.checkr-staging.com/v1/reports/84a4f0acc619083ef55074f5',
    auth: {
        username: apiKey,
        password: '' // Some APIs require an empty password for Basic Auth
    }
};

axios(config)
    .then(response => {
        console.log('Response:', response.data);
    })
    .catch(error => {
        console.error('Error:', error.response ? error.response.data : error.message);
    });
