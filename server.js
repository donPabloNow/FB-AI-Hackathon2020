// server init + mods

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var sslRedirect = require('heroku-ssl-redirect');
var SpotifyWebApi = require('./spotify-web-api-node');
require('dotenv').config();
const PORT = process.env.PORT || 3000
const SECRET_TOKEN = process.env.SECRET_TOKEN;

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const {Wit, log} = require('node-wit');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sslRedirect());

const client = new Wit({
  accessToken: SECRET_TOKEN,
});

app.use(express.static('public'));

var USERID;

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.CALLBACK_URI
});
spotifyApi.setAccessToken(null);
spotifyApi.setRefreshToken(null);
spotifyApi.resetCode();
var scopes = ["user-read-private", "user-read-email","playlist-read-private", "playlist-modify-private", "playlist-modify-public","user-top-read","user-follow-read","user-read-recently-played","user-library-read","user-modify-playback-state","user-read-playback-state"];
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
        console.log('Error granting auth code: ', err.statusCode);
      }
    ).then(function() {
      res.redirect('/radio?token='+spotifyApi.getAccessToken());
    }).catch(function(err){
      console.log('error in callback function: ', err.statusCode);
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
  }).catch(function(err){
    console.log("error getting userInfo: ",err.statusCode);
  });
});

app.get('/getMyRecent', async function(req, res) {
  await spotifyApi.play().catch(function(err) {console.log('Error setting playback to play: ', err.statusCode)});
  await spotifyApi.getMyCurrentPlaybackState().then(function(resu) {
    if(resu.body.device) {
      res.json({data: resu.body.item});
    } else {
      spotifyApi.getMyDevices().then(async function(data) {
        console.log(data.body.devices); //if this is a empty array we need to tell the user to turn on a spotify player
        if(data.body.devices.length) {
          await spotifyApi.play({device_id: data.body.devices[0].id}).catch(function(err) {console.log('Error setting playback to play: ', err.statusCode)});
          spotifyApi.getMyCurrentPlaybackState().then(function(resu) {
            if(resu.body.device) {
              res.json({data: resu.body.item});
            }
          }).catch(function(err){console.log('Error getting current playback state: ',err)});
        } else {
          let data = 'x';
          res.json({data: data});
        }
      }).catch(function(err){console.log('Error getting current devices: ', err);});
    }
  }).catch(function(er){
    spotifyApi.getMyRecentlyPlayedTracks().then(function(data) {
      res.json({data:data});
    }).catch(function(err){
      console.log('Error getting recently played tracks', err.statusCode);
    });
    console.log('Error getting currently playing: ', er.statusCode);
  });
});

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/public/landing.html'));
});
app.get('/radio', function(req, res) {
  if(req.query.token !== spotifyApi.getAccessToken())
    res.redirect('/');
  res.sendFile(path.join(__dirname + '/public/radio.html'));
});

app.get('/currentlyPlaying', function(req, res) {
  spotifyApi.getMyCurrentPlayingTrack().then(function(data) {
    if(req.query.id != data.body.item.id){
      spotifyApi.getAudioFeaturesForTrack(data.body.item.id).then(function(feats) {
        res.json({data:data, feats: feats});
      }).catch(function(err) {console.log('Error getting audio features for current song: ', err.statusCode)})
    } else {
      res.json({data:null});
    }
  }).catch(function(err){console.log('Error getting current song: ', err.statusCode)});
})

var determine_change = function(changeData, feats) {
  console.log(changeData.entities);
  var changeString = changeData.entities.intent[0].value;
  if(changeString === 'Instrumentalness_Up') {
    feats.body.instrumentalness=1;
    feats.body.speechiness-=.33
    return {target_speechiness: feats.body.speechiness, target_instrumentalness: feats.body.instrumentalness};
  }
  if(changeString === 'Instrumentalness_Down') {
    feats.body.instrumentalness=0;
    feats.body.speechiness+=.33
    return {target_speechiness: feats.body.speechiness, target_instrumentalness: feats.body.instrumentalness};
  }
 
  if(changeString === 'Valence_Up') {
    feats.body.valence+=.7;
    return {target_valence: feats.body.valence};
  }
  if(changeString === 'Valence_Down') {
    feats.body.valence-=.7;
    return {target_valence: feats.body.valence};
  }

  if(changeString === 'Tempo_Up') {
    feats.body.tempo+=30
    return {target_tempo: feats.body.tempo};
  }
  if(changeString === 'Tempo_Down') {
    feats.body.tempo-=30
    return {target_tempo: feats.body.tempo};
  }

  if(changeString === 'Energy_Up') {
    feats.body.energy+=.30
    return {target_energy: feats.body.energy};
  }
  if(changeString === 'Energy_Down') {
    feats.body.energy-=.30
    return {target_energy: feats.body.energy};
  }

  if(changeString === 'Danceability_Up') {
    feats.body.danceability+=.30
    return {target_danceability: feats.body.danceability};
  }
  if(changeString === 'Danceability_Down') {
    feats.body.danceability-=.30
    return {target_danceability: feats.body.danceability};
  }

  if(changeString === 'Speechiness_Up') {
    feats.body.speechiness+=.33
    feats.body.instrumentalness=0;
    return {target_speechiness: feats.body.speechiness, target_instrumentalness: feats.body.instrumentalness};
  }
  if(changeString === 'Speechiness_Down') {
    feats.body.speechiness-=.33
    feats.body.instrumentalness=1;
    return {target_speechiness: feats.body.speechiness, target_instrumentalness: feats.body.instrumentalness};
  }

  if(changeString === 'Loudness_Up') {
    feats.body.loudness+=5
    return {target_loudness: feats.body.loudness};
  }
  if(changeString === 'Loudness_Down') {
    feats.body.loudness-=5
    return {target_loudness: feats.body.loudness};
  }
  if(changeString === 'Skip') {
    return {};
  }
}

io.on('connection', function(socket){ 

  socket.on('query', function(packet) { //take query and current song id
    client.message(packet.q, {}).then((data) => {
      spotifyApi.getAudioFeaturesForTrack(packet.id).then(async function(feats) {
        console.log(packet.id);
        var targets = {};
        if(data) {
          console.log(data.entities);
          if(data.entities.intent && data.entities.intent[0].value != 'Search' && data.entities.intent[0].value !='Pause' && data.entities.intent[0].value != 'Play') {
            targets = await determine_change(data, feats);
            spotifyApi.getRecommendations({limit: 50, seed_tracks: [packet.id], targets}).then(function(recs) {
              let ind = randomIntFromInterval(0, recs.body.tracks.length-1);
              spotifyApi.getAudioFeaturesForTrack(recs.body.tracks[ind].id).then(async function(feats) {
                spotifyApi.addToQueue(recs.body.tracks[ind].uri).then(function(res) {
                  spotifyApi.skipToNext().catch(function(err) {console.log('Error skipping song: ', err)});
                  socket.emit('query_response', [recs.body.tracks[ind], feats]); //search using curr id as seed and adjust audio features by query  results
                }).catch(function(err) {
                  console.log('Error adding song to queue: ', err.statusCode);
                });
              });
            });
          } else if(data.entities.intent[0].value == 'Search') {
            var types = ['track']; 
            var q = data.entities.search_term[0].value.replace(/ /g,"+");
            if(data.entities.search_art) { //check for specific artist request
              q = 'track:';
              q += data.entities.search_term[0].value//.replace(/ /g,"+"); //artist name;
              q += ' artist:';
              q +=  data.entities.search_art[0].value//.replace(/ /g,"+"); //track name
            }
            console.log(q);
            spotifyApi.searchTracks(q).then(function(data) {
            //  console.log(data.body.tracks.items)
              let ind = randomIntFromInterval(0, data.body.tracks.items.length-1);
              let id = data.body.tracks.items[ind].id;
              spotifyApi.getAudioFeaturesForTrack(id).then(function(test) {
                spotifyApi.addToQueue(data.body.tracks.items[ind].uri).then(function(res) {
                  spotifyApi.skipToNext().catch(function(err) {console.log('Error skipping song: ', err)});
                  socket.emit('query_response', [data.body.tracks.items[ind], test]);
                }).catch(function(err){'Error adding search song to queue', err.statusCode});
              }).catch(function(err){'Error getting audio from searched track:', err.statusCode});
            }).catch(function(err){'Error resolving the search', err.statusCode});
          } else if(data.entities.intent[0].value == 'Pause'){
            spotifyApi.pause(); 
          }else if(data.entities.intent[0].value == 'Play'){
            spotifyApi.play();
          } else {
            console.log("Couldnt understand the request");
          }
        } else{
          console.log("Couldnt understand the request");
        }
      });
    });
  });

  socket.on('logout', function() {
    spotifyApi.resetAccessToken();
    spotifyApi.resetRefreshToken();
    spotifyApi.resetCode();
    console.log(spotifyApi.getCredentials());
    if(PORT == 3000)
      socket.emit('resp', 'http://localhost:3000');
    else
      socket.emit('resp', 'https://fluxdj.herokuapp.com');
  });


});


http.listen(PORT, function(){
    console.log('\nServer up on *:3000');
  });
