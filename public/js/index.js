var app = angular.module("myApp", []);
var socket = io();

app.controller("mainController", ['$scope','$http','$sce', function($scope, $http, $sce) {
  $scope.view = 0;
  $scope.currid = "home";
  $scope.search = "";
  $scope.results = {};
  $scope.changeActive = function(id) {
    document.getElementById($scope.currid).className = 'nav-link'; 
    document.getElementById(id).className = 'nav-link active';
    $scope.currid = id;
  }

  $scope.query = function() {
    socket.emit('query', $scope.search);
    socket.on('query_response', function(data) {
      $scope.$apply(function () {
        $scope.results = data;
      });
    })
  }
  $scope.login = function(){
    $http.get("/authUrl/").then(function(data) {
      window.location = data.data.authUrl;
    })
    $scope.refreshPlaylist();
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
}]);
