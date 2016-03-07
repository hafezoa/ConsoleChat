var socketio = require('socket.io');
var connections = {};
var users = [];
// Listen on port 3636
var io = socketio.listen(3636);
console.log('started listening on port 3636...');
io.sockets.on('connection', function (socket) {
    //register on the server that a user has joined.
    socket.on('register', function(data){
      var msg = data.name + " has joined the chat.";
      connections[socket.id] = data.name;
      connections[data.name] = socket.id;
      users.push(data.name);
      console.log(msg);
      io.sockets.emit('message', {type:"notice", message: msg});
    });

    socket.on('fileConfirmPrompt', function(data){
      data.from = connections[socket.id];
      if (connections[data.to]){
        io.sockets.connected[connections[data.to]].emit('fileConfirmPrompt', data);
      }
    })

    socket.on('fileConfirmResponse', function(data){
      if (connections[data.from]){
        io.sockets.connected[connections[data.from]].emit('fileConfirmResponse', data);
      }
    })

    // Broadcast a user's message to everyone else in the room
    socket.on('send', function (data) {
        io.sockets.emit('message', data);
    });

    socket.on('disconnect', function(data){
      var msg = connections[socket.id] + " has left the chat.";
      console.log(msg);
      var name = connections[socket.id];
      delete connections[name];
      delete connections[socket.id];
      users.splice(users.indexOf(name),1);
      io.sockets.emit('message', {type:"notice", message:msg})
    })

    socket.on('users', function(data){
      var userlist = "";
      users.forEach(function(item){
        userlist += item + ", ";
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
