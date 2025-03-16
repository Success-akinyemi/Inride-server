const coordinates = {
    "lat": 56.130366,
    "lng": -106.346771
};

const parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;

const coordinatesArray = [parsedCoordinates.lng, parsedCoordinates.lat]; // [longitude, latitude]

console.log('coordinates:', coordinatesArray);
