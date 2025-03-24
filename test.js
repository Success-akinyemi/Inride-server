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


    /***
     * /**  JOB TO KEEP ALIVE */
const SERVER_URL = "https://golden-epics-server.onrender.com";
const intervals = Array.from({ length: 11 }, (_, i) => i + 2); // [2, 3, ..., 12]

async function fetchData() {
    try {
        const response = await axios.get(SERVER_URL);
        console.log("✅ Server Response:", response.data);
    } catch (error) {
        console.error("❌ Error fetching data:", error.message);
    }
}

// Function to schedule the next API request
function scheduleNextRequest() {
    const randomMinutes = intervals[Math.floor(Math.random() * intervals.length)];
    console.log(`⏳ Next API request scheduled in ${randomMinutes} minutes`);

    // Schedule cron job
    cron.schedule(`*/${randomMinutes} * * * *`, async () => {
        console.log(`🚀 Making API request at interval of ${randomMinutes} minutes`);
        await fetchData();

        // Reschedule with a new random interval
        scheduleNextRequest();
    }, {
        scheduled: true,
        timezone: "UTC"
    });
}

//Start the first request scheduling
scheduleNextRequest();

/***END OF JOB */
     */