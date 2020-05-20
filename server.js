// server init + mods

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

const {Wit, log} = require('node-wit');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new Wit({
  accessToken: 'PPXFLS65PXL3DHVFHFUOYC5VGCKPDUS4',
  logger: new log.Logger(log.DEBUG) // optional
});

app.use(express.static('public'));

app.get('/', function(req, res){
    res.sendFile('/index.html');
});

app.use(express.static('public'));


io.on('connection', function(socket){ 

  socket.on('query', function(packet) {
    client.message(packet, {}).then((data) => {
      socket.emit('query_response', data);
    })
  });

});



http.listen(3000, function(){
    console.log('\nServer up on *:3000');
  });
