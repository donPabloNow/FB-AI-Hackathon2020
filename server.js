const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sslRedirect = require('heroku-ssl-redirect');
const SpotifyWebApi = require('./spotify-web-api-node');
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

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.CALLBACK_URI
});


var scopes = ["user-read-private", "user-read-email","playlist-read-private", "playlist-modify-private", "playlist-modify-public","user-top-read","user-follow-read","user-read-recently-played","user-library-read","user-modify-playback-state","user-read-playback-state","streaming"];
var authorizeURL = spotifyApi.createAuthorizeURL(scopes);

app.get('/authUrl/', (req, res) => res.json({authUrl: authorizeURL}));

// once the user has authorized, it will send a get request to the redirect uri with the auth code
app.get('/callback', (req, res) => {
  // get and set authorization code for this user
  spotifyApi.authorizationCodeGrant(req.query.code).then(
      data => {
        // Set the access token on the API object to use it in later calls
        spotifyApi.setAccessToken(data.body.access_token);
        spotifyApi.setRefreshToken(data.body.refresh_token);
        console.log('The token expires in ' + data.body['expires_in']);
      },
      err => console.log('Error granting auth code: ', err.statusCode))
    .then(() => res.redirect('/radio?token='+spotifyApi.getAccessToken()))
    .catch(err => console.log('error in callback function: ', err.statusCode));
});

// Returns JSON data about user
app.get('/userInfo/', (req, res) => {
  spotifyApi.getMe()
    .then(data => res.json({data: data.body}))
    .catch(err => console.log("error getting userInfo: ",err.statusCode));
});

//Gets a starting song to seed requests from
app.get('/getMyRecent', async (req, res) => {
  //resume playback if a device is active on launch
  await spotifyApi.play().catch(err => {console.log('Error setting playback to play: ', err.statusCode)});
  await spotifyApi.getMyCurrentPlaybackState().then(resu => {
    //check for active devices (Spotify returns no data for current playback on paused devices)
    if(resu.body.device) {
      res.json({data: resu.body.item, id: resu.body.device.id});
    } else {
      //check if their is a device but its just paused
      spotifyApi.getMyDevices().then(async data => {
        console.log(data.body.devices); //if this is a empty array we need to use a created browser player
        if(data.body.devices.length) {
          console.log(data.body.devices[0].id);
          await spotifyApi.play({device_id: data.body.devices[0].id}).catch(err => console.log('Error setting playback to play: ', err.statusCode));
          spotifyApi.getMyCurrentPlaybackState().then((resu) => {
            if(resu.body.device) 
              res.json({data: resu.body.item, id: resu.body.device.id});
          }).catch(err => console.log('Error getting current playback state: ',err));
        } else {
          //if no active device choose a song that was recently played
          spotifyApi.getMyRecentlyPlayedTracks()
          .then(data => res.json({data:data}))
          .catch(err => console.log('Error getting recently played tracks', err.statusCode));
        }
      }).catch(err => {console.log('Error getting current devices: ', err);});
    }
  }).catch(er => {
    //if something breaks just return a recently played song
    spotifyApi.getMyRecentlyPlayedTracks()
    .then(data => res.json({data:data}))
    .catch(err => console.log('Error getting recently played tracks', err.statusCode));

    console.log('Error getting currently playing: ', er.statusCode);
  });
});

//landing page
app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/public/landing.html')));

//Main radio page w/ functionality
app.get('/radio', (req, res) => {
  if(req.query.token !== spotifyApi.getAccessToken())
    res.redirect('/');
  res.sendFile(path.join(__dirname + '/public/radio.html'));
  var refresher = setInterval(() => {
    spotifyApi.refreshAccessToken().then(
      function(data) {
        console.log('The access token has been refreshed!');
        spotifyApi.setAccessToken(data.body['access_token']);
      },
      function(err) {
        console.log('Could not refresh access token', err);
      }
    );
  }, 3600000);
});

app.get('/currentlyPlaying', (req, res) => {
  spotifyApi.getMyCurrentPlayingTrack().then(data => {
    if(data.body.item) {
      var time_left = data.body.item.duration_ms - data.body.progress_ms;
      if(time_left < 11000) {
        spotifyApi.getRecommendations({limit: 50, seed_tracks: [data.body.item.id]}).then(recs => {
          let ind = randomIntFromInterval(0,recs.body.tracks.length-1);
          spotifyApi.addToQueue(recs.body.tracks[ind].uri).catch(err => console.log('error adding to queue', err));
        }).catch((err) => console.log('error getting new recs', err));
      }
      spotifyApi.getAudioFeaturesForTrack(data.body.item.id).then((feats) => {
        res.json({data:data, feats: feats});
      }).catch((err) => console.log('Error getting audio features for current song: ', err.statusCode))
    }
  }).catch((err) => {console.log(err)});
})

app.get('/getDevices', (req, res) => {
  spotifyApi.getMyDevices().then((data) => {
    res.json({data:data});
  });
})

var determine_change = (changeData, feats) => {
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



io.on('connection', socket => { 

  //Process audio/typed request into actionable items
  socket.on('query', packet => { 
    client.message(packet.q, {}).then(data => { 
        console.log(packet.q, packet.id, packet.deviceId);
        var targets = {};
        if(data) {
          console.log(data.entities);
          //check command intent 
          if(data.entities.intent && data.entities.intent[0].value != 'Search' && data.entities.intent[0].value !='Pause' && data.entities.intent[0].value != 'Play') {
            //Parse audio feature tweak request
            spotifyApi.getAudioFeaturesForTrack(packet.id).then(async feats => {
              targets = await determine_change(data, feats);//generate new target audio features
              spotifyApi.getRecommendations({limit: 50, seed_tracks: [packet.id], targets}).then(recs => {
                let ind = randomIntFromInterval(0, recs.body.tracks.length-1);
                spotifyApi.getAudioFeaturesForTrack(recs.body.tracks[ind].id).then(async feats => {
                  if(!packet.nonPremium) 
                    spotifyApi.play({device_id: packet.deviceId, uris: [recs.body.tracks[ind].uri]})
                    .then(() => socket.emit('query_response', [recs.body.tracks[ind], feats]))
                    .catch(err => console.log('Error adding song to queue: ', err.statusCode));
                  else 
                    socket.emit('query_response', [data.body.tracks.items[ind], test]);
                });
              });
            }).catch(err => console.log(err));
          } else if(data.entities.intent && data.entities.intent[0].value == 'Search') {
            //Parse search request and return a song
            var q;
            if(data.entities.search_term)
              q = data.entities.search_term[0].value;
            if(data.entities.search_art) { 
              q = 'track:';
              q += data.entities.search_term[0].value;  //artist name;
              q += ' artist:';
              q +=  data.entities.search_art[0].value;  //track name
            }
            if(data.entities.search_genre) {
              q= 'genre:';
              q+= data.entities.search_genre[0].value; //genre name
            }
            console.log(q);
            spotifyApi.searchTracks(q).then(data => {
              //pick a random track from results
              let ind = randomIntFromInterval(0, data.body.tracks.items.length-1);
              let id = data.body.tracks.items[ind].id; 

              //get audio features and start playing the song
              spotifyApi.getAudioFeaturesForTrack(id).then((test) => {
                if(!packet.nonPremium) 
                  spotifyApi.play({device_id: packet.deviceId, uris: [data.body.tracks.items[ind].uri]})
                  .then(res => socket.emit('query_response', [data.body.tracks.items[ind], test]))
                  .catch((err) => console.log('Error adding search song to queue', err.statusCode));
                else 
                  socket.emit('query_response', [data.body.tracks.items[ind], test]);
              }).catch((err) => {'Error getting audio from searched track:', err.statusCode});
            }).catch((err) => {'Error resolving the search', err.statusCode});

          } else if(data.entities.intent && data.entities.intent[0].value == 'Pause'){
            //Pause playback
            if(!packet.nonPremium) spotifyApi.pause({device_id: packet.deviceId})
            .catch(err => console.log(err));
            socket.emit('pause');
          } else if(data.entities.intent && data.entities.intent[0].value == 'Play'){
            //Resume playback
            if(!packet.nonPremium) spotifyApi.play({device_id: packet.deviceId})
            .catch(err => console.log(err));
            socket.emit('play');
          } else {
            //Bad data
            console.log("Couldnt understand the request");
          }
        } else{
          //No data
          console.log("Couldnt understand the request");
        }
    }).catch(err => console.log(err));
  });

  socket.on('logout', () => {
    spotifyApi.resetAccessToken();
    spotifyApi.resetRefreshToken();
    spotifyApi.resetCode();
    console.log(spotifyApi.getCredentials());
    socket.emit('resp', process.env.REDIRECT_URI);
  });

  socket.on('pause', () => spotifyApi.pause()
  .catch(err => console.log("error pausing playback")));

  socket.on('play', () => spotifyApi.play()
  .catch(err => console.log("error playing playback")));

  //Switch currently active device
  socket.on('transfer', () => spotifyApi.transferMyPlayback({deviceIds: [id], play: true})
  .catch(err => console.log(err)));

});


http.listen(PORT, () => console.log('\nServer up on *:3000') );
