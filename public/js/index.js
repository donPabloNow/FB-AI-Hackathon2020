var app = angular.module("myApp", []);
var socket = io();

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
  $scope.features= [];
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
      console.log(data);
      $scope.$apply(function () {
        $scope.currentSongId = data.body.tracks[0].id;
        $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.body.tracks[0].id+'" width="500" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
      });
    })
  }
  $scope.login = function(){
    $http.get("/authUrl/").then(function(data) {
      window.location = data.data.authUrl;
    })
    $scope.getStats();
  }
  $scope.user = function(){
    $http.get("/userInfo/").then(function(data) {
      return data.data.user;
    }).then( function(result){
      $scope.userInfo = result;
      console.log(result);
    })
  }
  $scope.logout = function(){
    $http.get("/logout/");
    $scope.user();
  }

  // Get stats about user
  $scope.getStats = function() {
    $http.get("/stats").then(function(data) {
      console.log(data);
      $scope.top = [];
      $scope.arts = [];
      entry = [];
      for(var i = 0; i < 5;i++) {
        var obj = data.data.data.body.items;
        entry = [];
        entry.push(obj[i].name);
        entry.push(obj[i].artists[0].name);
        entry.push(obj[i].album.name);
        entry.push(msToHMS(obj[i].duration_ms));
        entry.push('{\'width\': \''+obj[i].popularity*6+'px\'}');
        if(obj[i].album.images.length >=2)
          entry.push(obj[i].album.images[2].url);
        else
          entry.push('noimage.png');
        $scope.top.push(entry);
        var arts = data.data.data.body.previous;
        entry = [];
        entry.push(arts[i].name);
        entry.push(arts[i].genres[0]);
        entry.push(arts[i].followers.total);
        entry.push(arts[i].popularity);
        entry.push('{\'width\': \''+arts[i].popularity*6+'px\'}');
        if(arts[i].images.length >=2)
          entry.push(arts[i].images[2].url);
        else
          entry.push('noimage.png');
        $scope.arts.push(entry);
      }
    })
    $http.get("/stats/detailed").then(function(data) {
      $scope.features= [];
      //dance,energy,key,loudness,mode,speechy,acousticy,intrumentaly,live,valence,tempo
      var averages = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
      var feat_cnt = 0;
      for(var i = 0; i < 5; i++) {
        feat_cnt = 0;
        var x = data.data.data[i].body;
        for(feat in x){
          if(feat_cnt <= 10)
            averages[feat_cnt] += (x[feat]/5);
          feat_cnt++;
        }
      }
      console.log(averages);
      $scope.features.push(['{\'height\': \''+averages[0]*700+'px\'}','Danceability']);
      $scope.features.push(['{\'height\': \''+averages[1]*700+'px\'}','Energy']);
      $scope.features.push(['{\'height\': \''+averages[3]*-70+'px\'}','Loudness']);
      $scope.features.push(['{\'height\': \''+averages[5]*700+'px\'}','Speechiness']);
      $scope.features.push(['{\'height\': \''+averages[6]*700+'px\'}','Acousticness']);
      $scope.features.push(['{\'height\': \''+averages[7]*700+'px\'}','Instrumentalness']);
      $scope.features.push(['{\'height\': \''+averages[8]*700+'px\'}','Liveness']);
      $scope.features.push(['{\'height\': \''+averages[9]*700+'px\'}','Valence']);
      $scope.features.push(['{\'height\': \''+averages[10]*4+'px\'}','Tempo']);
    })
  }
  $scope.getMyRecent = function() {
    $http.get("/getMyRecent").then(function(data) {
      console.log(data.data.data.body.items[0].track.id);
      $scope.currentSongId = data.data.data.body.items[0].track.id;
      $scope.currentSong = $sce.trustAsHtml('<iframe src="https://open.spotify.com/embed/track/'+data.data.data.body.items[0].track.id+'" width="500" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>');
    })
  }
}]);
