
var app = angular.module("myApp", []);
var socket = io();
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
  $scope.changeActive = function(id) {
    document.getElementById($scope.currid).className = 'nav-link'; 
    document.getElementById(id).className = 'nav-link active';
    $scope.currid = id;
  }

  $scope.query = function() {
    var q =$scope.search;
    var id=$scope.currentSongId;
    var packet = {q, id};
    socket.emit('query', packet);
    socket.on('query_response', function(data) {
      $scope.$apply(function () {
        var ind = 0;
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

        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data[0].id+'" width="500" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      });
    })
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
    })
  }
  $scope.logout = function(){
    $http.get("/logout/");
    $scope.user();
  }

  $scope.checkCurrent = function(){
    setInterval(() => {
      $http.get("/currentlyPlaying/").then(function(data) {
        $scope.currentSongId = data.data.data.body.item.id;
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.body.item.id+'" width="500" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
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
      });
    }, 2000);
  }

  $scope.getMyRecent = function() {
    $http.get("/getMyRecent").then(function(data) {
      if(data.data.data.body) {
        var ind = randomIntFromInterval(0,data.data.data.body.items.length-1);
        $scope.currentSongId = data.data.data.body.items[ind].track.id;
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.body.items[ind].track.id+'" width="500" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      } else {
        $scope.currentSongId = data.data.data.id;
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.id+'" width="500" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      }
    })
  }

  var mic = new Wit.Microphone(document.getElementById("microphone"));
  var info = function (msg) {
    document.getElementById("info").innerHTML = msg;
  };
  var error = function (msg) {
    document.getElementById("error").innerHTML = msg;
  };
  mic.onready = function () {
    info("Microphone is ready to record");
  };
  mic.onaudiostart = function () {
    info("Recording started");
    error("");
  };
  mic.onaudioend = function () {
    info("Recording stopped, processing started");
  };
  mic.onresult = function (intent, entities) {
    var r = kv("intent", intent);

    for (var k in entities) {
      var e = entities[k];

      if (!(e instanceof Array)) {
        r += kv(k, e.value);
      } else {
        for (var i = 0; i < e.length; i++) {
          r += kv(k, e[i].value);
        }
      }
    }

    document.getElementById("result").innerHTML = r;
  };
  mic.onerror = function (err) {
    error("Error: " + err);
  };
	mic.onconnecting = function () {
		info("Microphone is connecting");
	};
	mic.ondisconnected = function () {
    info("Microphone is not connected");
    mic.connect("VF37BMDRZO74V4XNSGLDRCCR6LZS2MQD");
	};

	mic.connect("VF37BMDRZO74V4XNSGLDRCCR6LZS2MQD");

  function kv (k, v) {
    if (toString.call(v) !== "[object String]") {
      v = JSON.stringify(v);
    }
    return k + "=" + v + "\n";
  }
}]);
