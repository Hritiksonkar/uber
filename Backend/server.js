const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');
const port = Number.parseInt(process.env.PORT, 10) || 3000;

const server = http.createServer(app);

initializeSocket(server);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the other process or set PORT to a different value (e.g. PORT=${port + 1}).`);
        process.exit(1);
    }

    throw err;
});