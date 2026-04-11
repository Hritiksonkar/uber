const path = require('path');
let dotenv;
try {
    dotenv = require('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '.env') });
} catch (err) {
    // Allows the app to still run in environments where env vars are injected
    // (and provides a clearer hint for local dev if node_modules isn't installed).
    console.warn(
        'dotenv is not available. If you are running locally, run `npm install` in the Backend folder. ' +
        'If running in production, ensure environment variables are provided by the host.'
    );
}
const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const connectToDb = require('./db/db');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const mapsRoutes = require('./routes/maps.routes');
const rideRoutes = require('./routes/ride.routes');

connectToDb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/users', userRoutes);
app.use('/captains', captainRoutes);
app.use('/maps', mapsRoutes);
app.use('/rides', rideRoutes);




module.exports = app;

