var readline = require('readline'),
socketio = require('socket.io-client'),
util = require('util'),
color = require("ansi-color").set;
var notifier = require('node-notifier');


var nick;
//var socket = socketio.connect('http://appframework.cloudapp.net:3636');
var socket = socketio.connect('http://localhost:3636');
var rl = readline.createInterface(process.stdin, process.stdout);

rl.question("Please enter a nickname: ", function(name) {
    nick = name;
    var msg = nick + " has joined the chat";
    socket.emit('register',{name: name});
    rl.prompt(true);
});

function console_out(msg) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(msg);
    rl.prompt(true);
}

function getTime(){
  var date = new Date();

  var hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;

  var min  = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;

  var sec  = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;

  return "[" + hour + ":" + min + "]";

}

rl.on('line', function (line) {
    if (line[0] == "/" && line.length > 1) {
        var cmd = line.match(/[a-z]+\b/)[0];
        var arg = line.substr(cmd.length+2, line.length);
        chat_command(cmd, arg);

    } else {
        // send chat message
        socket.emit('send', { type: 'chat', message: line, nick: nick });
        rl.prompt(true);
    }
});

function chat_command(cmd, arg) {
    switch (cmd) {

        case 'nick':
            var notice = nick + " changed their name to " + arg;
            nick = arg;
            socket.emit('send', { type: 'notice', message: notice });
            break;

        case 'msg':
            var to = arg.match(/[a-zA-Z]+\b/)[0];
            var message = arg.substr(to.length, arg.length);
            socket.emit('privatemessage', {message: message, to: to});
            rl.prompt(true);
            break;

        case 'me':
            var emote = nick + " " + arg;
            socket.emit('send', { type: 'emote', message: emote });
            break;

        case 'toast':
            var to = arg.match(/[a-zA-Z*]+\b/)[0];
            var message = arg.substr(to.length, arg.length);
            socket.emit('toast', {message: message, to: to});
            rl.prompt(true);
            break;

        case 'users':
            socket.emit('users');
            break;

        default:
            console_out("That is not a valid command.");

    }
}

socket.on('userlist', function(data){
  console_out("Currently Logged in users: " + color(data,"green"));
})

socket.on('toast', function(data){
  notifier.notify({
    title: "Message from " + data.from,
    message: data.message,
    sound: true,
    wait: true,
    from: data.from
  })
})

socket.on('toastread',function(data){
  console_out(color(data.from + " read your toast.", 'cyan'));
});

socket.on('privatemessage', function(data){
  leader = color(data.from+"->"+data.to, "red_bg+white");
  time = color(getTime() + ": ", "cyan");
  console_out(leader + time + data.message);
});

socket.on('message', function (data) {
    var leader;
    var time;
    if (data.type == 'chat' && data.nick != nick) {
        leader = color(data.nick+ getTime() + ": ", "cyan");
        console_out(leader + data.message);
    }
    else if (data.type == "notice") {
        console_out(color(data.message, 'cyan'));
    }
    else if (data.type == "emote") {
        console_out(color(data.message, "cyan_bg+white"));
    }
});

notifier.on('click', function (notifierObject, options) {
  // Triggers if `wait: true` and user clicks notification
  socket.emit('toastread',{toastFrom: options.from});
});
