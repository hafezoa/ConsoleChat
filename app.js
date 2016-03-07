var readline = require('readline'),
socketio = require('socket.io-client'),
util = require('util'),
color = require("ansi-color").set;
var notifier = require('node-notifier');
var path = require('path');
var fs = require('fs');
var fileConfirmationMode, fileConfirmationData;
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
    readline.moveCursor(process.stdout,0,-1);
    process.stdout.clearLine();
    if (fileConfirmationMode){
      fileConfirmationMode = false;
      if (line === "Y"){
        console_out(color("Relayed to " + fileConfirmationData.from + " that you Accepted. Waiting to receive file...", "green"));
        fileConfirmationData.response = true;
      }else{
        fileConfirmationData.response = false;
        console_out(color("Relayed to " + fileConfirmationData.from + " that you Rejected. Aborted file receive.", "red"));
      }
      socket.emit('fileConfirmResponse', fileConfirmationData);
    } else {
      if (line[0] == "/" && line.length > 1) {
          var cmd = line.match(/[a-z]+\b/)[0];
          var arg = line.substr(cmd.length+2, line.length);
          chat_command(cmd, arg);
      } else {
          // send chat message
          socket.emit('send', { type: 'chat', message: line, nick: nick });
          rl.prompt(true);
      }
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

        case 'file':
            var to = arg.match(/[a-zA-Z]+\b/)[0];
            var filepath = arg.substr(to.length+1, arg.length);
            var data = {path: filepath, name:path.basename(filepath), to:to};
            console_out(color("Sending file download request to " + data.to, "cyan"));
            socket.emit('fileConfirmPrompt', data);
            rl.prompt(true);
            break;

        default:
            console_out("That is not a valid command.");

    }
}

socket.on('userlist', function(data){
  console_out("Currently Logged in users: " + color(data,"green"));
})

socket.on('fileConfirmPrompt', function(data){
  console_out(color(data.from + ' is sending you a file ' + data.name + '... Accept (Y/n)?',"yellow"));
  fileConfirmationData = data;
  fileConfirmationMode = true;
})

socket.on('fileConfirmResponse', function(data){
  if (data.response){
    console_out(color(data.to + ' has accepted to download the file. Sending... [Actual send implementation is not yet completed.]', 'green'));
  }else{
    console_out(color(data.to + ' has rejected the file send request. Aborted sending file.', 'red'));
  }
});

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
    if (data.type == 'chat') {
        leader = color(data.nick+ getTime() + ": ", "cyan");
        console_out(leader + data.message);
    }
    else if (data.type == "notice") {
        console_out(color(data.message, 'cyan'));
    }
    else if (data.type == "emote") {
        console_out(color(data.message, "blue_bg+white"));
    }
});

notifier.on('click', function (notifierObject, options) {
  // Triggers if `wait: true` and user clicks notification
  socket.emit('toastread',{toastFrom: options.from});
});
