'use strict';

// ad rotator
angular.module('insight.system').controller('AdRotatorController',
function($scope, $rootScope, $routeParams, $location, $http) {
  var adRotatorInterval = 10 * 1000;

  $http.get('/public/js/rotate.json').then(function(response) {
    $scope.adIndex = 0;
    $scope.ads = shuffleArray(response.data);

    setInterval(function() {
      if ($scope.adIndex < $scope.ads.length - 1) {
        $scope.adIndex++;
      } else {
        $scope.adIndex = 0;
      }

      $scope.$apply();
    }, adRotatorInterval);
  });
});