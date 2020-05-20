// server init + mods

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const {Wit, log} = require('node-wit');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new Wit({
  accessToken: 'PPXFLS65PXL3DHVFHFUOYC5VGCKPDUS4',
  logger: new log.Logger(log.DEBUG) // optional
});

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/callback'
 });
var scopes = ["user-read-private", "user-read-email","playlist-read-private", "playlist-modify-private", "playlist-modify-public","user-top-read","user-follow-read","user-read-recently-played","user-library-read"];
var authorizeURL = spotifyApi.createAuthorizeURL(scopes);
app.get('/authUrl/', function(req, res){
  res.json({authUrl: authorizeURL});
});

// once the user has authorized, it will send a get request to the redirect uri with the auth code
app.get('/callback', function(req, res){
  // get and set authorization code for this user
  spotifyApi.authorizationCodeGrant(req.query.code).then(
      function(data) {
        console.log('The token expires in ' + data.body.expires_in);
        console.log('The access token is ' + data.body.access_token);
        console.log('The refresh token is ' + data.body.refresh_token);
        // Set the access token on the API object to use it in later calls
        spotifyApi.setAccessToken(data.body.access_token);
        spotifyApi.setRefreshToken(data.body.refresh_token);
      },
      function(err) {
        console.log('Something went wrong!', err);
      }
    ).then(function() {
      res.redirect('/');
    });

});

// Returns JSON data about user
app.get('/userInfo/', function(req, res){
  spotifyApi.getMe().then(function(data) {
    return data.body;
  }, function(err) {
    return null;
  }).then( function(result){
    USERID = result["id"];
    res.json( { user: result } );
  });
});

// Logout
app.get('/logout/', function(req, res){
  spotifyApi.resetAccessToken();
  spotifyApi.resetRefreshToken();
  res.redirect('/');
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
