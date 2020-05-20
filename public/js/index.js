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
}]);
