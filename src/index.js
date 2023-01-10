const {server} = require('./app');
const port = process.env.PORT;

server.listen(port, () => {
    console.log(`Chat-app listening on port ${port}!`);
});
