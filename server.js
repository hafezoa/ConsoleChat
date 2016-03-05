var socketio = require('socket.io');
var connections = {};
// Listen on port 3636
var io = socketio.listen(3636);
console.log('started listening on port 3636...');
io.sockets.on('connection', function (socket) {
    //register on the server that a user has joined.
    socket.on('register', function(data){
      var msg = data.name + " has joined the chat.";
      connections[socket.id] = data.name;
      connections[data.name] = socket.id;
      console.log(msg);
      io.sockets.emit('message', {type:"notice", message: msg});
    });

    // Broadcast a user's message to everyone else in the room
    socket.on('send', function (data) {
        io.sockets.emit('message', data);
    });

    socket.on('disconnect', function(data){
      console.log(connections[socket.id] + " has left the chat.");
      delete connections[connections[socket.id]];
      delete connections[socket.id];
    })

    socket.on('users', function(data){
      var userlist = "";
      Object.keys(connections).forEach(function(item){
        userlist += connections[item] + ", ";
      })
      userlist = userlist.substr(0,userlist.length - 2);
      io.sockets.connected[socket.id].emit('userlist', userlist);
    })

    socket.on('toast', function(data){
      io.sockets.connected[connections[data.to]].emit('toast', {message: data.message, from:connections[socket.id]});
    })

    socket.on('toastread', function(data){
      io.sockets.connected[connections[data.toastFrom]].emit('toastread',{from:connections[socket.id]});
    })

    socket.on('privatemessage', function(data){
      io.sockets.connected[connections[data.to]].emit('privatemessage', {from:connections[socket.id], message: data.message, to:data.to});
    })
});
