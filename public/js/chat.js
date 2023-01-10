const socket = io();

// Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input.message-input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');

const $chatSection = document.querySelector('#message');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {ignoreQueryPrefix: true});

const formatDate = (date) => moment(date).format('h:mm a');

function sendMessage(message) {
    socket.emit('sendMessage', message, (error) => {
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.value = '';
        $messageFormInput.focus();
        if (error) {
            return console.log(error);
        }
    });
}

function receiveMessage(message) {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: formatDate(message.createdAt)
    });
    appendToChatSection(html);
}

function receiveLocationMessage(message) {
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url,
        createdAt: formatDate(message.createdAt)
    });
    appendToChatSection(html);
}

function appendToChatSection(html) {
    $chatSection.insertAdjacentHTML('beforeend', html);
    autoscroll();
}

const autoscroll = () => {
    const $newMessage = $chatSection.lastElementChild;

    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;
    const visibleHeight = $chatSection.offsetHeight;

    const contentHeight = $chatSection.scrollHeight;

    const scrollOffset = $chatSection.scrollTop + visibleHeight;

    if (contentHeight - newMessageHeight <= scrollOffset) {
        $chatSection.scrollTop = $chatSection.scrollHeight;
    }
};

socket.on('message', message => {
    receiveMessage(message);
});

socket.on('locationMessage', url => {
    receiveLocationMessage(url);
});

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // console.log(e.target.elements.message.value); // access input in form by name
    if ($messageFormInput.value) {
        $messageFormButton.setAttribute('disabled', 'disabled');
        sendMessage($messageFormInput.value);
    }
});

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser!');
    }
    $sendLocationButton.setAttribute('disabled', 'disabled');
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            $sendLocationButton.removeAttribute('disabled');
        });
    });
});

socket.emit('join', {username, room}, (error) => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});
