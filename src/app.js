const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require("socket.io");
const Filter = require('bad-words');
const {generateMessage, generateLocationMessage} = require('./utils/messages');
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.json());
// Setup static directory to serve
app.use(express.static(publicDirectoryPath));

app.get('', (req, res) => {});

io.on('connection', (socket) => {
    socket.on('join', (options, callback) => {
        const {error, user} = addUser({id: socket.id, ...options});
        if (error) {
            return callback(error);
        }

        socket.join(user.room); // join the room
        socket.emit('message', generateMessage('Chat administrator bot', 'Welcome!')); // send message only to current connection - Welcome message for current user

        // emit message to all users that are in the room
        socket.broadcast.to(user.room).emit('message', generateMessage('Chat administrator bot', `${user.username} has joined!`)); // send message for every connection except the connection from which was event
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!');
        }

        const user = getUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage(user.username, message)); // send message for every connection
            callback('Delivered');
        }

    });

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id);
        if (user) {
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude}, ${location.longitude}`)) // send message for every connection
            callback('Location shared!');
        }
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMessage('Chat administrator bot', `${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

module.exports = {
    app,
    server
};
