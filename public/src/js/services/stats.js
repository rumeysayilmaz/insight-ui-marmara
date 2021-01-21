'use strict';

angular.module('insight.stats')
  .factory('Stats',
    function($resource) {
      return $resource(window.apiPrefix + '/stats');
    })
  .factory('StatsSync',
    function($resource) {
      return $resource(window.apiPrefix + '/stats/sync');
    })
  .factory('StatsChart',
    function($resource) {
      return $resource(window.apiPrefix + '/stats/chart', {
        type: '@type'
      });
    })
