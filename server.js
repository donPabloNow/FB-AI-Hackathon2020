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

var USERID;

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
    if(result) USERID = result["id"];
    res.json( { user: result } );
  });
});

// Logout
app.get('/logout/', function(req, res){
  spotifyApi.resetAccessToken();
  spotifyApi.resetRefreshToken();
  res.redirect('/');
});

//get statistics from user
app.get('/stats', function(req, res) {
  //no personalization endpoints in the npm
  var out;
  spotifyApi.getMyTopTracks().then(function(data) {
    out = data;
    spotifyApi.getMyTopArtists().then(function(arts) {
     out.body.previous = arts.body.items;
     res.json({data: out})
    }, function(err) {
      console.log('Something went wrong!', err);
    });
    //res.json({data: data})
  }, function(err) {
    console.log('Something went wrong!', err);
  });
})
//get audio analysis for top tracks
app.get('/stats/detailed', function(req, res) {
  //no personalization endpoints in the npm
  spotifyApi.getMyTopTracks().then(function(data) {;
    var features = {0:"", 1:"", 2:"", 3:"", 4:""};
    var call_cnt = 0;
    for(var i = 0; i < 5; i++) {
      spotifyApi.getAudioFeaturesForTrack(data.body.items[i].id).then(function(arts) {
        features[call_cnt] = arts;
        call_cnt++;
        if(call_cnt == 5){
          res.json({data:features});
        }
      }, function(err) {
        console.log('Something went wrong!', err);
      });
    }
  }, function(err) {
    console.log('Something went wrong!', err);
  });
})

app.get('/getMyRecent', function(req, res) {
  spotifyApi.getMyRecentlyPlayedTracks().then(function(data) {
    res.json({data:data});
  })
})
app.use(express.static('public'));

app.get('/', function(req, res){
    res.sendFile('/index.html');
});

app.use(express.static('public'));


io.on('connection', function(socket){ 

  socket.on('query', function(packet) { //take query and current song id
    client.message(packet.q, {}).then((data) => {
      spotifyApi.getAudioFeaturesForTrack(packet.id).then(function(feats) {
        spotifyApi.getRecommendations({limit: 50, seed_tracks: [packet.id],
          min_tempo: feats.body.tempo-15, max_tempo: feats.body.tempo + 15, min_danceability: feats.body.danceability-.3, max_danceability: feats.body.danceability+.3,
          min_energy: feats.body.energy-.3, max_energy: feats.body.energy+.3, min_key: feats.body.key -3, max_key: feats.body.key+3, min_instrumentalness: feats.body.instrumentalness-.3,
          max_instrumentalness: feats.body.instrumentalness+.3, min_liveness: feats.body.liveness-.3, max_liveness: feats.body.liveness+.3, min_acousticness: feats.body.acousticness-.3,
          max_acousticness: feats.body.acousticness+.3, min_valence: feats.body.valence-.35, max_valence: feats.body.valence+.35
        }).then(function(recs) {
          console.log(recs);
          socket.emit('query_response', recs); //search using curr id as seed and adjust audio features by query  results
        });
      });
    });
  });

});



http.listen(3000, function(){
    console.log('\nServer up on *:3000');
  });
