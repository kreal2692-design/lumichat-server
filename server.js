const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

let waitingUser = null;

io.on('connection', (socket) => {
    console.log('Sitede yeni biri var: ' + socket.id);

    socket.on('join', () => {
        if (waitingUser && waitingUser.id !== socket.id) {
            let roomName = waitingUser.id + '#' + socket.id;
            socket.join(roomName);
            waitingUser.join(roomName);

            // İki tarafa da eşleştiğini ve kimin "Arayan (Offer başlatan)" olduğunu bildiriyoruz
            socket.emit('matched', { roomName, isInitiator: true });
            waitingUser.emit('matched', { roomName, isInitiator: false });
            
            console.log('İki kişi eşleşti ve WebRTC odası kuruldu!');
            waitingUser = null;
        } else {
            waitingUser = socket;
            socket.emit('waiting');
        }
    });

    // WebRTC Sinyal Mesajlarının Taşınması (Offer, Answer, ICE)
    socket.on('signal', (data) => {
        const rooms = Array.from(socket.rooms);
        const roomName = rooms.find(r => r.includes('#'));
        if (roomName) {
            socket.to(roomName).emit('signal', data);
        }
    });

    socket.on('leave', () => {
        const rooms = Array.from(socket.rooms);
        const roomName = rooms.find(r => r.includes('#'));
        if (roomName) {
            socket.to(roomName).emit('strangerLeft');
            socket.leave(roomName);
        }
        if (waitingUser && waitingUser.id === socket.id) waitingUser = null;
    });

    socket.on('message', (data) => {
        const rooms = Array.from(socket.rooms);
        const roomName = rooms.find(r => r.includes('#'));
        if (roomName) {
            socket.to(roomName).emit('message', data);
        }
    });

    socket.on('disconnect', () => {
        if (waitingUser && waitingUser.id === socket.id) waitingUser = null;
    });
});

http.listen(3000, () => {
    console.log('LumiChat WebRTC Sunucusu 3000 portunda aktif!');
});