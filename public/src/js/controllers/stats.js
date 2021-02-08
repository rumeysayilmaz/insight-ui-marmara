'use strict';

angular.module('insight.stats').controller('StatsController',
function($scope, $routeParams, $location, $interval, Global, Stats, StatsSync, StatsChart) {
  var syncInterval;
  $scope.global = Global;
  $scope.sync = {};
  $scope.ranges = [{
    name: '7d',
    title: '7 days',
  }, {
    name: '30d',
    title: '1 month',
  }, {
    name: '90d',
    title: '3 months',
  }, {
    name: 'all',
    title: 'All',
  }];
  $scope.selectedItem = $scope.ranges[1];

  $scope.updateChartRange = function() {
    $scope.getChartData();
  };

  $scope.getStats = function() {
    Stats.get({},
      function(d) {
        $scope.loaded = 1;
        $scope.stats = d.info;
        $scope.stats.total = d.info.TotalActivated + d.info.TotalLockedInLoops + d.info.TotalNormals;
        angular.extend($scope, d);
      },
      function(e) {
        $scope.error = 'API ERROR: ' + e.data;
      });
  };

  $scope.getSync = function() {
    StatsSync.get({},
      function(sync) {
        if (sync.info.progress < 100) {
          $scope.sync.status = 'syncing';
          $scope.sync.lastBlockChecked = sync.info.lastBlockChecked;
          $scope.sync.chainTip = sync.info.chainTip;
          $scope.sync.progress = sync.info.progress;
        } else {
          $interval.cancel(syncInterval);
          $scope.sync.status = '';
        }
      },
      function(e) {
        var err = 'Could not get sync information' + e.toString();
        $scope.sync = {
          error: err
        };
      });
  };

  $scope.getSync();
  syncInterval = $interval(function() {
    $scope.getSync();
    $scope.getStats();
    $scope.getChartData();
  }, 5 * 1000);

  $scope.getChartData = function() {
    $scope.loading = true;

    var chartTypeEnum = [{
      title: 'Total Normals',
      name: 'TotalNormals'
    }, {
      title: 'Total Activated',
      name: 'TotalActivated'
    }, {
      title: 'Total Locked',
      name: 'TotalLockedInLoops'
    }];
    var months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    StatsChart.get({type: $scope.selectedItem.name},
      function(chartData) {
        $scope.chartName = 'Historical stats';

        if (!chartData.hasOwnProperty('error')) {
          for (var i = 0; i < chartTypeEnum.length; i++) {
            var chart = {
              bindto: '#chart' + (i + 1),
              name: 'Historical stats',
              "data":{
                "x":"date",
                "json": chartData.info[chartTypeEnum[i].name],
                "names":{
                  "date":"Date",
                  "value": chartTypeEnum[i].title + " (" + $scope.selectedItem.title + ")"
                },
              },
              axis : {
                x : {
                  type: 'timeseries',
                  tick: {
                    format: function (x) { return x.getDate() + ' ' + months[x.getMonth()] }
                  }
                }
              }
            };

            c3.generate(chart);
          }

          $scope.loading = false;
          $scope.syncing = false;
        } else {
          $scope.loading = false;
          $scope.syncing = true;
        }
      },
      function(e) {
        var err = 'Could not get chart information' + e.toString();
        $scope.chart = {
          error: err
        };
      });
  };

  $scope.$on('$destroy', function() {
    $interval.cancel(syncInterval);
  });
});
