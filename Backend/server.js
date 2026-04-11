const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');
const port = process.env.PORT || 3000;

const server = http.createServer(app);

initializeSocket(server);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        const suggestedPort = Number(port) + 1;
        console.error(
            `Port ${port} is already in use. Stop the other process or set PORT to a different value (e.g. PORT=${suggestedPort}).`
        );
        process.exit(1);
    }

    throw err;
});