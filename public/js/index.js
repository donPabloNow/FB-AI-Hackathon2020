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
  $scope.premium = true;
  $scope.devices = {};
  $scope.deviceId;
  $scope.changeActive = function(id) {
    document.getElementById($scope.currid).className = 'nav-link'; 
    document.getElementById(id).className = 'nav-link active';
    $scope.currid = id;
  }

  $scope.pause = function() {
    if($scope.premium) socket.emit('pause');
    $scope.playing = false;
  }

  $scope.play = function() {
    if($scope.premium) socket.emit('play');
    $scope.playing = true;
  }

  $scope.query = function() {
    let q =$scope.search;
    let id=$scope.currentSongId;
    let deviceId = $scope.deviceId;
    var packet = {q, id, deviceId}
    if(!$scope.premium) packet.nonPremium = true;
    socket.emit('query', packet);
    socket.on('query_response', function(data) {
      $scope.$apply(function () {
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
        $scope.currentSong = $sce.trustAsHtml('<iframe id="audioframe" src="https://open.spotify.com/embed/track/'+data[0].id+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      });
    })
    socket.on('play', function() {
      $scope.$apply(function () {
        $scope.playing = true;
      });
    });
    socket.on('pause', function() {
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
        $scope.premium = false;
        jq('#non-premium').modal('show');
      }
    })
  }
  $scope.logout = function(){
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
    if($scope.premium) {
      setInterval(() => {
        var id = $scope.currentSongId;
        id == $scope.initialId ? id = null : id; 
        $scope.runCheck(id);
      }, 10000);
    }
  }
  $scope.getMyRecent = function() {
    $http.get("/getMyRecent").then(function(data) {
      if(data.data.id){
        $scope.deviceId = data.data.id;
        $scope.getDevices();  
      }
      if(data.data.data.body) {
        var ind = randomIntFromInterval(0,data.data.data.body.items.length-1);
        if(data.data.data.body.items[ind].track.id) {
          $scope.currentSongId = data.data.data.body.items[ind].track.id;
          $scope.initialId = $scope.currentSongId;
        }
        if($scope.premium) {
          if(player_loaded) {
            play({playerInstance: player, spotify_uri: data.data.data.body.items[ind].track.uri});
            $scope.getDevices();  
          } else {
            var watch = setInterval(() => {
              if(player_loaded) {
                play({playerInstance: player, spotify_uri: data.data.data.body.items[ind].track.uri});
                $scope.getDevices(); 
                clearInterval(watch);
              }
            });
          }
         $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.body.items[ind].track.id+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
        } else {
          $scope.currentSongId = '06AKEBrKUckW0KREUWRnvT'; //just pick a random one if theyve never played anything on spotify
          $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+$scope.currentSongId+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
        }
      } else if(data.data.data !== 'x') {
        $scope.currentSongId = data.data.data.id;
        $scope.initialId = $scope.currentSongId;
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.id+'" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      } else {
        $scope.currentSong =  $sce.trustAsHtml('<p class="text-center">No device found! Open a Spotify player on any device and refresh this page!</p>')
      }
    })
  }
  $scope.getDevices = function() { 
    $http.get('/getDevices').then(function(data) {
      let numDevices = data.data.data.body.devices.length;
      $scope.devices = {};
      var content = '';
      for(let i = 0; i < numDevices; i++) {
        $scope.devices[i] = data.data.data.body.devices[i];
        let classes = data.data.data.body.devices[i].is_active ? "btn btn-outline-success tooltip-button active" : "btn btn-outline-success tooltip-button";
        let ico = data.data.data.body.devices[i].is_active ? "fa fa-laptop iactive" : "fa fa-laptop";
        let subclasses = data.data.data.body.devices[i].is_active ? "tool-subtitle active" : "tool-subtitle";
        content += '<div class="tool-box">\
                      <i class="'+ico+'"></i>\
                      <button onclick="changeDevice(\''+$scope.devices[i].id+'\')" class="'+classes+'">'+$scope.devices[i].name+'</button>\
                      <div class="'+subclasses+'">Spotify Connect</div>\
                    </div>';
      }
      tippy('.fa-desktop', {
        content: 'Global content',
        trigger: 'click',
        interactive: true,
        content: content,
        allowHTML: true,
      });
    });
  }

  tippy('.fa-desktop', {
    content: 'Global content',
    trigger: 'mouseenter focus',
    content: "Devices Available",
    allowHTML: true,
  });

  changeDevice = async function(id){
    $scope.deviceId = id;
    socket.emit('transfer', id);
  }

  mic.onresult = function (intent, entities, res) {
    console.log(res.msg_body);
    if(res.msg_body) {
      $scope.search = res.msg_body;
      $scope.query();
    }
    document.getElementById("result").innerHTML = res.msg_body;
  };
}]);