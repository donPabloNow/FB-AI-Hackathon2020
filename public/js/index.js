var app = angular.module("myApp", []);
var socket = io();
jq = jQuery.noConflict();
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}
// Convert ms to Hours/Minutes
function msToHMS( ms ) {
  var seconds = ms / 1000; // 1- Convert to seconds
  var hours = parseInt( seconds / 3600 ); // 2- Extract hours
  seconds = seconds % 3600;
  var minutes = parseInt( seconds / 60 ); // 3- Extract minutes
  seconds = seconds % 60; // 4- Keep only seconds not extracted to minutes
  if(hours)
    return ( hours+" hr "+minutes+" min ");
  else
    return ( minutes+"m "+parseInt(seconds)+"s" );
}

function checkMobile(){
  return (document.getElementById('result').style.display == 'block');
}
var ih = 80;
if(checkMobile()) ih = 500;


app.controller("mainController", ['$scope','$http','$sce', function($scope, $http, $sce) {
  $scope.view = 0;
  $scope.currid = "home";
  $scope.search = "";
  $scope.results = {};
  $scope.top = [];
  $scope.arts = [];
  $scope.features = {};
  $scope.userInfo;
  $scope.currentSong;
  $scope.currentSongId;
  $scope.initialId;
  $scope.playing = false;
  $scope.changeActive = function(id) {
    document.getElementById($scope.currid).className = 'nav-link'; 
    document.getElementById(id).className = 'nav-link active';
    $scope.currid = id;
  }

  $scope.pause = function() {
    socket.emit('pause');
    $scope.playing = false;
  }

  $scope.play = function() {
    socket.emit('play');
    $scope.playing = true;
  }

  $scope.query = function() {
    var q =$scope.search;
    var id=$scope.currentSongId;
    var packet = {q, id};
    socket.emit('query', packet);
    socket.on('query_response', function(data) {
      $scope.$apply(function () {
        var ind = 0;
        $scope.playing = true;
        $scope.currentSongId = data[0].id;
        $scope.features = {};
        $scope.features[0] = ([data[1].body.danceability,'Danceability']);
        $scope.features[1] = ([data[1].body.energy,'Energy']);
        $scope.features[2] = ([data[1].body.loudness,'Loudness']);
        $scope.features[3] = ([data[1].body.speechiness,'Speechiness']);
        $scope.features[4] = ([data[1].body.acousticness,'Acousticness']);
        $scope.features[5] = ([data[1].body.instrumentalness,'Instrumentalness']);
        $scope.features[6] = ([data[1].body.liveness,'Liveness']);
        $scope.features[7] = ([data[1].body.valence,'Valence']);
        $scope.features[8] = ([data[1].body.tempo,'Tempo']);
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data[0].id+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      });
    })
    socket.on('play', function() {
      $scope.$apply(function () {
        $scope.playing = true;
      });
    });
    socket.on('pause', function() {
      console.log('paused;')
      $scope.$apply(function () {
        $scope.playing = false;
      });
    });
  }
  $scope.login = function(){
    $http.get("/authUrl/").then(function(data) {
      window.location = data.data.authUrl;
    });
  }
  $scope.user = function(){
    $http.get("/userInfo/").then(function(data) {
      return data.data.user;
    }).then( function(result){
      $scope.userInfo = result;
      if(!$scope.userInfo.product || $scope.userInfo.product != 'premium') {
        console.log($scope.userInfo.product);
        jq('#non-premium').modal('show');
      }
    })
  }
  $scope.logout = function(){
    console.log('logclick')
    socket.emit('logout');
    socket.on('resp', function(url){
      window.location=url;
    })
  }

  $scope.runCheck = function(id) {
    $http.get("/currentlyPlaying?id="+id).then(function(data) {
      if(data.data.data) {
        $scope.currentSongId = data.data.data.body.item.id;
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.body.item.id+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
        $scope.features = {};
        $scope.features[0] = ([data.data.feats.body.danceability,'Danceability']);
        $scope.features[1] = ([data.data.feats.body.energy,'Energy']);
        $scope.features[2] = ([data.data.feats.body.loudness,'Loudness']);
        $scope.features[3] = ([data.data.feats.body.speechiness,'Speechiness']);
        $scope.features[4] = ([data.data.feats.body.acousticness,'Acousticness']);
        $scope.features[5] = ([data.data.feats.body.instrumentalness,'Instrumentalness']);
        $scope.features[6] = ([data.data.feats.body.liveness,'Liveness']);
        $scope.features[7] = ([data.data.feats.body.valence,'Valence']);
        $scope.features[8] = ([data.data.feats.body.tempo,'Tempo']);
      }
    });
  }

  $scope.checkCurrent = function(){
    var id = $scope.currentSongId;
    id == $scope.initialId ? id = null : id; 
    $scope.playing = true;
    $scope.runCheck(id);
    setInterval(() => {
      var id = $scope.currentSongId;
      id == $scope.initialId ? id = null : id; 
      $scope.runCheck(id);
    }, 10000);
  }
  $scope.getMyRecent = function() {
    $http.get("/getMyRecent").then(function(data) {
      console.log(data.data.data);
      if(data.data.data.body) {
        var ind = randomIntFromInterval(0,data.data.data.body.items.length-1);
        $scope.currentSongId = data.data.data.body.items[ind].track.id;
        $scope.initialId = $scope.currentSongId;
        if(player_loaded) {
          play({playerInstance: player, spotify_uri: data.data.data.body.items[ind].track.uri})
        } else {
          var watch = setInterval(() => {
            if(player_loaded) {
              play({playerInstance: player, spotify_uri: data.data.data.body.items[ind].track.uri})
              clearInterval(watch);
            }
          });
        }
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.body.items[ind].track.id+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      } else if(data.data.data !== 'x') {
        $scope.currentSongId = data.data.data.id;
        $scope.initialId = $scope.currentSongId;
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.id+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      } else {
        console.log(data);
        $scope.currentSong =  $sce.trustAsHtml('<p class="text-center">No device found! Open a Spotify player on any device and refresh this page!</p>')
      }
    })
  }
}]);