var app = angular.module("myApp", []);
var socket = io();
var checking; 
jq = jQuery.noConflict();
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}
var ih = 80;
const iframe_H1 = '<iframe id="audioframe" src="https://open.spotify.com/embed/track/';
const iframe_H2 = '" width="100%" height="'+ih+'" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>';

app.controller("mainController", ['$scope','$http','$sce', ($scope, $http, $sce) => {
  $scope.search = "";
  $scope.results = {};
  $scope.features = {};
  $scope.userInfo;
  $scope.currentSong;
  $scope.currentSongId;
  $scope.playing = false;
  $scope.premium = true;
  $scope.devices = {};
  $scope.deviceId;

  $scope.pause = () => {
    if($scope.premium) socket.emit('pause');
    $scope.playing = false;
    clearInterval(checking);
  }

  $scope.play = () => {
    if($scope.premium) socket.emit('play');
    $scope.playing = true;
    $scope.checkCurrent();
  }

  $scope.query = () => {
    let q =$scope.search;
    let id=$scope.currentSongId;
    let deviceId = $scope.deviceId;
    var packet = {q, id, deviceId}
    if(!$scope.premium) packet.nonPremium = true;
    socket.emit('query', packet);
    socket.on('query_response', (data) => {
      $scope.$apply(() => {
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
        $scope.currentSong = $sce.trustAsHtml(iframe_H1+data[0].id+iframe_H2);
      });
    })
    socket.on('play', () => {
      $scope.$apply(() => {
        $scope.playing = true;
        $scope.checkCurrent();
      });
    });
    socket.on('pause', () => {
      $scope.$apply(() => {
        $scope.playing = false;
        clearInterval(checking);
      });
    });
  }
  $scope.login = () => {
    $http.get("/authUrl/").then((data) => {
      window.location = data.data.authUrl;
    });
  }
  $scope.user = () => {
    $http.get("/userInfo/").then((data) => {
      return data.data.data;
    }).then( (result) =>{
      $scope.userInfo = result;
      if(!$scope.userInfo.product || $scope.userInfo.product != 'premium') {
        $scope.premium = false;
        jq('#non-premium').modal('show');
      }
    })
  }
  $scope.logout = () => {
    socket.emit('logout');
    socket.on('resp', (url) =>{
      window.location=url;
    })
  }

  $scope.runCheck = () => {
    $http.get("/currentlyPlaying").then((data) => {
      if(data.data.data) {
        $scope.currentSongId = data.data.data.body.item.id;
        $scope.currentSong = $sce.trustAsHtml(iframe_H1+data.data.data.body.item.id+iframe_H2);
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

  $scope.checkCurrent = () => {
    $scope.playing = true;
    $scope.runCheck();
    if($scope.premium) {
      checking = setInterval(() => {
        $scope.runCheck();
      }, 10000);
    }
  }
  $scope.getMyRecent = () => {
    $http.get("/getMyRecent").then((data) => {
      if(data.data.id){
        $scope.deviceId = data.data.id;
        $scope.getDevices();  
      }
      if(data.data.data.body) {
        var ind = randomIntFromInterval(0,data.data.data.body.items.length-1);
        if(data.data.data.body.items[ind].track.id) {
          $scope.currentSongId = data.data.data.body.items[ind].track.id;
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
         $scope.currentSong = $sce.trustAsHtml(iframe_H1+data.data.data.body.items[ind].track.id+iframe_H2);
        } else {
          $scope.currentSongId = '06AKEBrKUckW0KREUWRnvT'; //just pick a random one if theyve never played anything on spotify
          $scope.currentSong = $sce.trustAsHtml(iframe_H1+$scope.currentSongId+iframe_H2);
        }
      } else if(data.data.data !== 'x') {
        $scope.currentSongId = data.data.data.id;
        $scope.currentSong = $sce.trustAsHtml(iframe_H1+data.data.data.id+iframe_H2);
      } else {
        $scope.currentSong =  $sce.trustAsHtml('<p class="text-center">No device found! Open a Spotify player on any device and refresh this page!</p>')
      }
    })
  }
  $scope.getDevices = () => { 
    $http.get('/getDevices').then((data) => {
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

  changeDevice = async id =>{
    $scope.deviceId = id;
    socket.emit('transfer', id);
  }

  mic.onresult = (intent, entities, res) => {
    console.log(res.msg_body);
    if(res.msg_body) {
      $scope.search = res.msg_body;
      $scope.query();
    }
    document.getElementById("result").innerHTML = res.msg_body;
  };
}]);
