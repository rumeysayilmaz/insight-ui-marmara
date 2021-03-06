// Source: public/src/js/app.js
var testnet = false;
var netSymbol = testnet ? 'TAZ' : 'MCL';

var defaultLanguage = localStorage.getItem('insight-language') || 'en';
var defaultCurrency = localStorage.getItem('insight-currency') || netSymbol;

angular.module('insight',[
  'ngAnimate',
  'ngResource',
  'ngRoute',
  'ngProgress',
  'ui.bootstrap',
  'ui.route',
  'monospaced.qrcode',
  'gettext',
  'angularMoment',
  'insight.system',
  'insight.socket',
  'insight.blocks',
  'insight.transactions',
  'insight.address',
  'insight.search',
  'insight.charts',
  'insight.status',
  'insight.stats',
  'insight.connection',
  'insight.currency',
  'insight.messages'
]);

angular.module('insight.system', []);
angular.module('insight.socket', []);
angular.module('insight.blocks', []);
angular.module('insight.transactions', []);
angular.module('insight.address', []);
angular.module('insight.search', []);
angular.module('insight.charts', []);
angular.module('insight.status', []);
angular.module('insight.stats', []);
angular.module('insight.connection', []);
angular.module('insight.currency', []);
angular.module('insight.messages', []);

// Source: public/src/js/controllers/address.js
angular.module('insight.address').controller('AddressController',
  function($scope, $rootScope, $routeParams, $location, Global, Address, getSocket) {
    $scope.global = Global;

    var socket = getSocket($scope);
    var addrStr = $routeParams.addrStr;

    var _startSocket = function() {
      socket.on('bitcoind/addresstxid', function(data) {
        if (data.address === addrStr) {
          $rootScope.$broadcast('tx', data.txid);
          var base = document.querySelector('base');
          var beep = new Audio(base.href + '/sound/transaction.mp3');
          beep.play();
        }
      });
      socket.emit('subscribe', 'bitcoind/addresstxid', [addrStr]);
    };

    var _stopSocket = function () {
      socket.emit('unsubscribe', 'bitcoind/addresstxid', [addrStr]);
    };

    socket.on('connect', function() {
      _startSocket();
    });

    $scope.$on('$destroy', function(){
      _stopSocket();
    });

    $scope.params = $routeParams;

    $scope.findOne = function() {
      $rootScope.currentAddr = $routeParams.addrStr;
      _startSocket();

      Address.get({
          addrStr: $routeParams.addrStr
        },
        function(address) {
          $rootScope.titleDetail = address.addrStr.substring(0, 7) + '...';
          $rootScope.flashMessage = null;
          $scope.address = address;
        },
        function(e) {
          if (e.status === 400) {
            $rootScope.flashMessage = 'Invalid Address: ' + $routeParams.addrStr;
          } else if (e.status === 503) {
            $rootScope.flashMessage = 'Backend Error. ' + e.data;
          } else {
            $rootScope.flashMessage = 'Address Not Found';
          }
          $location.path('/');
        });
    };

  });

// Source: public/src/js/controllers/blocks.js
angular.module('insight.blocks').controller('BlocksController',
  function($scope, $rootScope, $routeParams, $location, Global, Block, Blocks, BlockByHeight) {
  $scope.global = Global;
  $scope.loading = false;

  if ($routeParams.blockHeight) {
    BlockByHeight.get({
      blockHeight: $routeParams.blockHeight
    }, function(hash) {
      $location.path('/block/' + hash.blockHash);
    }, function() {
      $rootScope.flashMessage = 'Bad Request';
      $location.path('/');
    });
  }

  //Datepicker
  var _formatTimestamp = function (date) {
    var yyyy = date.getUTCFullYear().toString();
    var mm = (date.getUTCMonth() + 1).toString(); // getMonth() is zero-based
    var dd  = date.getUTCDate().toString();

    return yyyy + '-' + (mm[1] ? mm : '0' + mm[0]) + '-' + (dd[1] ? dd : '0' + dd[0]); //padding
  };

  $scope.$watch('dt', function(newValue, oldValue) {
    if (newValue !== oldValue) {
      $location.path('/blocks-date/' + _formatTimestamp(newValue));
    }
  });

  $scope.openCalendar = function($event) {
    $event.preventDefault();
    $event.stopPropagation();

    $scope.opened = true;
  };

  $scope.humanSince = function(time) {
    var m = moment.unix(time).startOf('day');
    var b = moment().startOf('day');
    return moment.min(m).from(b);
  };

  $scope.list = function() {
    $scope.loading = true;

    if ($routeParams.blockDate) {
      $scope.detail = 'On ' + $routeParams.blockDate;
    }

    if ($routeParams.startTimestamp) {
      var d=new Date($routeParams.startTimestamp*1000);
      var m=d.getMinutes();
      if (m<10) m = '0' + m;
      $scope.before = ' before ' + d.getHours() + ':' + m;
    }

    $rootScope.titleDetail = $scope.detail;

    Blocks.get({
      blockDate: $routeParams.blockDate,
      startTimestamp: $routeParams.startTimestamp
    }, function(res) {
      $scope.loading = false;
      $scope.blocks = res.blocks;
      $scope.pagination = res.pagination;
    });
  };

  $scope.findOne = function() {
    $scope.loading = true;

    Block.get({
      blockHash: $routeParams.blockHash
    }, function(block) {
      $rootScope.titleDetail = block.height;
      $rootScope.flashMessage = null;
      $scope.loading = false;
      $scope.block = block;
    }, function(e) {
      if (e.status === 400) {
        $rootScope.flashMessage = 'Invalid Transaction ID: ' + $routeParams.txId;
      }
      else if (e.status === 503) {
        $rootScope.flashMessage = 'Backend Error. ' + e.data;
      }
      else {
        $rootScope.flashMessage = 'Block Not Found';
      }
      $location.path('/');
    });
  };

  $scope.params = $routeParams;

});

// Source: public/src/js/controllers/charts.js
angular.module('insight.charts').controller('ChartsController',
  function($scope, $rootScope, $routeParams, $location, Chart, Charts) {
  $scope.loading = false;

  $scope.list = function() {
    Charts.get({
    }, function(res) {
      $scope.charts = res.charts;
    });

    if ($routeParams.chartType) {
      $scope.chart();
    }
  };

  $scope.chart = function() {
    $scope.loading = true;

    Chart.get({
      chartType: $routeParams.chartType
    }, function(chart) {
      $scope.loading = false;
      $scope.chartType = $routeParams.chartType;
      $scope.chartName = chart.name;
      $scope.chart = c3.generate(chart);
    }, function(e) {
      if (e.status === 400) {
        $rootScope.flashMessage = 'Invalid chart: ' + $routeParams.chartType;
      }
      else if (e.status === 503) {
        $rootScope.flashMessage = 'Backend Error. ' + e.data;
      }
      else {
        $rootScope.flashMessage = 'Chart Not Found';
      }
      $location.path('/');
    });
  };

  $scope.params = $routeParams;

});

// Source: public/src/js/controllers/connection.js
angular.module('insight.connection').controller('ConnectionController',
  function($scope, $window, Status, getSocket, PeerSync) {

    // Set initial values
    $scope.apiOnline = true;
    $scope.serverOnline = true;
    $scope.clienteOnline = true;

    var socket = getSocket($scope);

    // Check for the node server connection
    socket.on('connect', function() {
      $scope.serverOnline = true;
      socket.on('disconnect', function() {
        $scope.serverOnline = false;
      });
    });

    // Check for the  api connection
    $scope.getConnStatus = function() {
      PeerSync.get({},
        function(peer) {
          $scope.apiOnline = peer.connected;
          $scope.host = peer.host;
          $scope.port = peer.port;
        },
        function() {
          $scope.apiOnline = false;
        });
    };

    socket.emit('subscribe', 'sync');
    socket.on('status', function(sync) {
      $scope.sync = sync;
      $scope.apiOnline = (sync.status !== 'aborted' && sync.status !== 'error');
    });

    // Check for the client conneciton
    $window.addEventListener('offline', function() {
      $scope.$apply(function() {
        $scope.clienteOnline = false;
      });
    }, true);

    $window.addEventListener('online', function() {
      $scope.$apply(function() {
        $scope.clienteOnline = true;
      });
    }, true);

  });

// Source: public/src/js/controllers/currency.js
angular.module('insight.currency').controller('CurrencyController',
  function($scope, $rootScope, Currency) {
    $rootScope.currency.symbol = defaultCurrency;

    var _roundFloat = function(x, n) {
      if(!parseInt(n, 10) || !parseFloat(x)) n = 0;

      return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
    };

    $rootScope.currency.getConvertion = function(value) {
      value = value * 1; // Convert to number

      if (!isNaN(value) && typeof value !== 'undefined' && value !== null) {
        if (value === 0.00000000) return '0 ' + this.symbol; // fix value to show

        var response;

        if (this.symbol === 'USD') {
          response = _roundFloat((value * this.factor), 2);
        } else if (this.symbol === 'm'+netSymbol) {
          this.factor = 1000;
          response = _roundFloat((value * this.factor), 5);
        } else if (this.symbol === 'bits') {
          this.factor = 1000000;
          response = _roundFloat((value * this.factor), 2);
        } else {
          this.factor = 1;
          response = value;
        }
        // prevent sci notation
        if (response < 1e-7) response=response.toFixed(8);

        return response + ' ' + this.symbol;
      }

      return 'value error';
    };

    $scope.setCurrency = function(currency) {
      $rootScope.currency.symbol = currency;
      localStorage.setItem('insight-currency', currency);

      if (currency === 'USD') {
        Currency.get({}, function(res) {
          $rootScope.currency.factor = $rootScope.currency.bitstamp = res.data.bitstamp;
        });
      } else if (currency === 'm'+netSymbol) {
        $rootScope.currency.factor = 1000;
      } else if (currency === 'bits') {
        $rootScope.currency.factor = 1000000;
      } else {
        $rootScope.currency.factor = 1;
      }
    };

    // Get initial value
    Currency.get({}, function(res) {
      $rootScope.currency.factor = $rootScope.currency.bitstamp = res.data.bitstamp;
    });

  });

// Source: public/src/js/controllers/footer.js
angular.module('insight.system').controller('FooterController',
  function($scope, $route, $templateCache, gettextCatalog, amMoment,  Version) {

    $scope.defaultLanguage = defaultLanguage;

    var _getVersion = function() {
      Version.get({},
        function(res) {
          $scope.version = res.version;
        });
    };

    $scope.version = _getVersion();

    $scope.availableLanguages = [{
      name: 'English',
      isoCode: 'en',
    }, {
      name: 'Turkish',
      isoCode: 'tr_TR',
    },{
      name: 'Deutsch',
      isoCode: 'de',
    }, {
      name: 'Русский',
      isoCode: 'ru',
    }, {
      name: 'Spanish',
      isoCode: 'es',
    }, {
      name: 'Japanese',
      isoCode: 'ja',
    }];

    $scope.setLanguage = function(isoCode) {
      gettextCatalog.currentLanguage = $scope.defaultLanguage = defaultLanguage = isoCode;
      amMoment.changeLocale(isoCode);
      localStorage.setItem('insight-language', isoCode);
      var currentPageTemplate = $route.current.templateUrl;
      $templateCache.remove(currentPageTemplate);
      $route.reload();
    };

  });

// Source: public/src/js/controllers/header.js
angular.module('insight.system').controller('HeaderController',
  function($scope, $rootScope, $modal, getSocket, Global, Block, $location, $route) {
    $scope.global = Global;

    $rootScope.currency = {
      factor: 1,
      bitstamp: 0,
      testnet: testnet,
      netSymbol: netSymbol,
      symbol: netSymbol
    };

    $scope.menu = [{
      'title': 'Blocks',
      'link': 'blocks'
    }, {
      'title': 'Charts',
      'link': 'charts'
    }, {
      'title': 'Status',
      'link': 'status'
    }, {
      'title': 'Stats',
      'link': 'stats'
    }];

    $scope.openScannerModal = function() {
      var modalInstance = $modal.open({
        templateUrl: 'scannerModal.html',
        controller: 'ScannerController'
      });
    };

    var _getBlock = function(hash) {
      Block.get({
        blockHash: hash
      }, function(res) {
        $scope.totalBlocks = res.height;
      });
    };

    var socket = getSocket($scope);
    socket.on('connect', function() {
      socket.emit('subscribe', 'inv');

      socket.on('block', function(block) {
        var blockHash = block.toString();
        _getBlock(blockHash);
      });
    });

    $rootScope.isCollapsed = true;
  });

// Source: public/src/js/controllers/index.js
var TRANSACTION_DISPLAYED = 10;
var BLOCKS_DISPLAYED = 5;

angular.module('insight.system').controller('IndexController',
  function($scope, Global, getSocket, Blocks) {
    $scope.global = Global;

    var _getBlocks = function() {
      Blocks.get({
        limit: BLOCKS_DISPLAYED
      }, function(res) {
        $scope.blocks = res.blocks;
        $scope.blocksLength = res.length;
      });
    };

    var socket = getSocket($scope);

    var _startSocket = function() { 
      socket.emit('subscribe', 'inv');
      socket.on('tx', function(tx) {
        $scope.txs.unshift(tx);
        if (parseInt($scope.txs.length, 10) >= parseInt(TRANSACTION_DISPLAYED, 10)) {
          $scope.txs = $scope.txs.splice(0, TRANSACTION_DISPLAYED);
        }
      });

      socket.on('block', function() {
        _getBlocks();
      });
    };

    socket.on('connect', function() {
      _startSocket();
    });



    $scope.humanSince = function(time) {
      var m = moment.unix(time);
      return moment.min(m).fromNow();
    };

    $scope.index = function() {
      _getBlocks();
      _startSocket();
    };

    $scope.txs = [];
    $scope.blocks = [];
  });

// Source: public/src/js/controllers/messages.js
angular.module('insight.messages').controller('VerifyMessageController',
  function($scope, $http) {
  $scope.message = {
    address: '',
    signature: '',
    message: ''
  };
  $scope.verification = {
    status: 'unverified',  // ready|loading|verified|error
    result: null,
    error: null,
    address: ''
  };

  $scope.verifiable = function() {
    return ($scope.message.address
            && $scope.message.signature
            && $scope.message.message);
  };
  $scope.verify = function() {
    $scope.verification.status = 'loading';
    $scope.verification.address = $scope.message.address;
    $http.post(window.apiPrefix + '/messages/verify', $scope.message)
      .success(function(data, status, headers, config) {
        if(typeof(data.result) != 'boolean') {
          // API returned 200 but result was not true or false
          $scope.verification.status = 'error';
          $scope.verification.error = null;
          return;
        }

        $scope.verification.status = 'verified';
        $scope.verification.result = data.result;
      })
      .error(function(data, status, headers, config) {
        $scope.verification.status = 'error';
        $scope.verification.error = data;
      });
  };

  // Hide the verify status message on form change
  var unverify = function() {
    $scope.verification.status = 'unverified';
  };
  $scope.$watch('message.address', unverify);
  $scope.$watch('message.signature', unverify);
  $scope.$watch('message.message', unverify);
});

// Source: public/src/js/controllers/rotator.js
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
// Source: public/src/js/controllers/scanner.js
angular.module('insight.system').controller('ScannerController',
  function($scope, $rootScope, $modalInstance, Global) {
    $scope.global = Global;

    // Detect mobile devices
    var isMobile = {
      Android: function() {
          return navigator.userAgent.match(/Android/i);
      },
      BlackBerry: function() {
          return navigator.userAgent.match(/BlackBerry/i);
      },
      iOS: function() {
          return navigator.userAgent.match(/iPhone|iPad|iPod/i);
      },
      Opera: function() {
          return navigator.userAgent.match(/Opera Mini/i);
      },
      Windows: function() {
          return navigator.userAgent.match(/IEMobile/i);
      },
      any: function() {
          return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
      }
    };

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

    $scope.isMobile = isMobile.any();
    $scope.scannerLoading = false;

    var $searchInput = angular.element(document.getElementById('search')),
        cameraInput,
        video,
        canvas,
        $video,
        context,
        localMediaStream;

    var _scan = function(evt) {
      if ($scope.isMobile) {
        $scope.scannerLoading = true;
        var files = evt.target.files;

        if (files.length === 1 && files[0].type.indexOf('image/') === 0) {
          var file = files[0];

          var reader = new FileReader();
          reader.onload = (function(theFile) {
            return function(e) {
              var mpImg = new MegaPixImage(file);
              mpImg.render(canvas, { maxWidth: 200, maxHeight: 200, orientation: 6 });

              setTimeout(function() {
                qrcode.width = canvas.width;
                qrcode.height = canvas.height;
                qrcode.imagedata = context.getImageData(0, 0, qrcode.width, qrcode.height);

                try {
                  //alert(JSON.stringify(qrcode.process(context)));
                  qrcode.decode();
                } catch (e) {
                  alert(e);
                }
              }, 1500);
            };
          })(file);

          // Read  in the file as a data URL
          reader.readAsDataURL(file);
        }
      } else {
        if (localMediaStream) {
          context.drawImage(video, 0, 0, 300, 225);

          try {
            qrcode.decode();
          } catch(e) {
            //qrcodeError(e);
          }
        }

        setTimeout(_scan, 500);
      }
    };

    var _successCallback = function(stream) {
      video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
      localMediaStream = stream;
      video.play();
      setTimeout(_scan, 1000);
    };

    var _scanStop = function() {
      $scope.scannerLoading = false;
      $modalInstance.close();
      if (!$scope.isMobile) {
        if (localMediaStream.stop) localMediaStream.stop();
        localMediaStream = null;
        video.src = '';
      }
    };

    var _videoError = function(err) {
      console.log('Video Error: ' + JSON.stringify(err));
      _scanStop();
    };

    qrcode.callback = function(data) {
      _scanStop();

      var str = (data.indexOf('komodo:') === 0) ? data.substring(8) : data;
      console.log('QR code detected: ' + str);
      $searchInput
        .val(str)
        .triggerHandler('change')
        .triggerHandler('submit');
    };

    $scope.cancel = function() {
      _scanStop();
    };

    $modalInstance.opened.then(function() {
      $rootScope.isCollapsed = true;
      
      // Start the scanner
      setTimeout(function() {
        canvas = document.getElementById('qr-canvas');
        context = canvas.getContext('2d');

        if ($scope.isMobile) {
          cameraInput = document.getElementById('qrcode-camera');
          cameraInput.addEventListener('change', _scan, false);
        } else {
          video = document.getElementById('qrcode-scanner-video');
          $video = angular.element(video);
          canvas.width = 300;
          canvas.height = 225;
          context.clearRect(0, 0, 300, 225);

          navigator.getUserMedia({video: true}, _successCallback, _videoError); 
        }
      }, 500);
    });
});

// Source: public/src/js/controllers/search.js
angular.module('insight.search').controller('SearchController',
  function($scope, $routeParams, $location, $timeout, Global, Block, Transaction, Address, BlockByHeight) {
  $scope.global = Global;
  $scope.loading = false;

  var _badQuery = function() {
    $scope.badQuery = true;

    $timeout(function() {
      $scope.badQuery = false;
    }, 2000);
  };

  var _resetSearch = function() {
    $scope.q = '';
    $scope.loading = false;
  };

  $scope.search = function() {
    var q = $scope.q;
    $scope.badQuery = false;
    $scope.loading = true;

    Block.get({
      blockHash: q
    }, function() {
      _resetSearch();
      $location.path('block/' + q);
    }, function() { //block not found, search on TX
      Transaction.get({
        txId: q
      }, function() {
        _resetSearch();
        $location.path('tx/' + q);
      }, function() { //tx not found, search on Address
        Address.get({
          addrStr: q
        }, function() {
          _resetSearch();
          $location.path('address/' + q);
        }, function() { // block by height not found
          if (isFinite(q)) { // ensure that q is a finite number. A logical height value.
            BlockByHeight.get({
              blockHeight: q
            }, function(hash) {
              _resetSearch();
              $location.path('/block/' + hash.blockHash);
            }, function() { //not found, fail :(
              $scope.loading = false;
              _badQuery();
            });
          }
          else {
            $scope.loading = false;
            _badQuery();
          }
        });
      });
    });
  };

});

// Source: public/src/js/controllers/stats.js
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

// Source: public/src/js/controllers/status.js
angular.module('insight.status').controller('StatusController',
  function($scope, $routeParams, $location, Global, Status, Sync, getSocket) {
    $scope.global = Global;

    $scope.getStatus = function(q) {
      Status.get({
          q: 'get' + q
        },
        function(d) {
          $scope.loaded = 1;
          angular.extend($scope, d);
        },
        function(e) {
          $scope.error = 'API ERROR: ' + e.data;
        });
    };

    $scope.humanSince = function(time) {
      var m = moment.unix(time / 1000);
      return moment.min(m).fromNow();
    };

    var _onSyncUpdate = function(sync) {
      $scope.sync = sync;
    };

    var _startSocket = function () {
      socket.emit('subscribe', 'sync');
      socket.on('status', function(sync) {
        _onSyncUpdate(sync);
      });
    };
    
    var socket = getSocket($scope);
    socket.on('connect', function() {
      _startSocket();
    });


    $scope.getSync = function() {
      _startSocket();
      Sync.get({},
        function(sync) {
          _onSyncUpdate(sync);
        },
        function(e) {
          var err = 'Could not get sync information' + e.toString();
          $scope.sync = {
            error: err
          };
        });
    };
  });

// Source: public/src/js/controllers/transactions.js
angular.module('insight.transactions').controller('transactionsController',
function($scope, $rootScope, $routeParams, $location, Global, Transaction, TransactionsByBlock, TransactionsByAddress) {
  $scope.global = Global;
  $scope.loading = false;
  $scope.loadedBy = null;

  var pageNum = 0;
  var pagesTotal = 1;
  var COIN = 100000000;

  var _aggregateItems = function(items) {
    if (!items) return [];

    var l = items.length;

    var ret = [];
    var tmp = {};
    var u = 0;

    for(var i=0; i < l; i++) {

      var notAddr = false;
      // non standard input
      if (items[i].scriptSig && !items[i].addr) {
        items[i].addr = 'Unparsed address [' + u++ + ']';
        items[i].notAddr = true;
        notAddr = true;
      }

      // non standard output
      if (items[i].scriptPubKey && !items[i].scriptPubKey.addresses) {
        items[i].scriptPubKey.addresses = ['Unparsed address [' + u++ + ']'];
        items[i].notAddr = true;
        notAddr = true;
      }

      // multiple addr at output
      if (items[i].scriptPubKey && items[i].scriptPubKey.addresses.length > 1) {
        items[i].addr = items[i].scriptPubKey.addresses.join(',');
        ret.push(items[i]);
        continue;
      }

      var addr = items[i].addr || (items[i].scriptPubKey && items[i].scriptPubKey.addresses[0]);

      if (!tmp[addr]) {
        tmp[addr] = {};
        tmp[addr].valueSat = 0;
        tmp[addr].count = 0;
        tmp[addr].addr = addr;
        tmp[addr].items = [];
      }
      tmp[addr].isSpent = items[i].spentTxId;

      tmp[addr].doubleSpentTxID = tmp[addr].doubleSpentTxID   || items[i].doubleSpentTxID;
      tmp[addr].doubleSpentIndex = tmp[addr].doubleSpentIndex || items[i].doubleSpentIndex;
      tmp[addr].dbError = tmp[addr].dbError || items[i].dbError;
      tmp[addr].valueSat += Math.round(items[i].value * COIN);
      tmp[addr].items.push(items[i]);
      tmp[addr].notAddr = notAddr;

      if (items[i].unconfirmedInput)
        tmp[addr].unconfirmedInput = true;

      tmp[addr].count++;
    }

    angular.forEach(tmp, function(v) {
      v.value = v.value || parseInt(v.valueSat) / COIN;
      ret.push(v);
    });
    return ret;
  };

  var _processTX = function(tx) {
    tx.vinSimple = _aggregateItems(tx.vin);
    tx.voutSimple = _aggregateItems(tx.vout);
  };

  var _paginate = function(data) {
    $scope.loading = false;

    pagesTotal = data.pagesTotal;
    pageNum += 1;

    data.txs.forEach(function(tx) {
      _processTX(tx);
      $scope.txs.push(tx);
    });
  };

  var _byBlock = function() {
    TransactionsByBlock.get({
      block: $routeParams.blockHash,
      pageNum: pageNum
    }, function(data) {
      _paginate(data);
    });
  };

  var _byAddress = function () {
    TransactionsByAddress.get({
      address: $routeParams.addrStr,
      pageNum: pageNum
    }, function(data) {
      _paginate(data);
    });
  };

  var _findTx = function(txid) {
    Transaction.get({
      txId: txid
    }, function(tx) {
      $rootScope.titleDetail = tx.txid.substring(0,7) + '...';
      $rootScope.flashMessage = null;
      $scope.tx = tx;
      _processTX(tx);
      $scope.txs.unshift(tx);
    }, function(e) {
      if (e.status === 400) {
        $rootScope.flashMessage = 'Invalid Transaction ID: ' + $routeParams.txId;
      }
      else if (e.status === 503) {
        $rootScope.flashMessage = 'Backend Error. ' + e.data;
      }
      else {
        $rootScope.flashMessage = 'Transaction Not Found';
      }

      $location.path('/');
    });
  };

  $scope.findThis = function() {
    _findTx($routeParams.txId);
  };

  //Initial load
  $scope.load = function(from) {
    $scope.loadedBy = from;
    $scope.loadMore();
  };

  //Load more transactions for pagination
  $scope.loadMore = function() {
    if (pageNum < pagesTotal && !$scope.loading) {
      $scope.loading = true;

      if ($scope.loadedBy === 'address') {
        _byAddress();
      }
      else {
        _byBlock();
      }
    }
  };

  // Highlighted txout
  if ($routeParams.v_type == '>' || $routeParams.v_type == '<') {
    $scope.from_vin = $routeParams.v_type == '<' ? true : false;
    $scope.from_vout = $routeParams.v_type == '>' ? true : false;
    $scope.v_index = parseInt($routeParams.v_index);
    $scope.itemsExpanded = true;
  }
  
  //Init without txs
  $scope.txs = [];

  $scope.$on('tx', function(event, txid) {
    _findTx(txid);
  });
});

angular.module('insight.transactions').controller('SendRawTransactionController',
  function($scope, $http) {
  $scope.transaction = '';
  $scope.status = 'ready';  // ready|loading|sent|error
  $scope.txid = '';
  $scope.error = null;

  $scope.formValid = function() {
    return !!$scope.transaction;
  };
  $scope.send = function() {
    var postData = {
      rawtx: $scope.transaction
    };
    $scope.status = 'loading';
    $http.post(window.apiPrefix + '/tx/send', postData)
      .success(function(data, status, headers, config) {
        if(typeof(data.txid) != 'string') {
          // API returned 200 but the format is not known
          $scope.status = 'error';
          $scope.error = 'The transaction was sent but no transaction id was got back';
          return;
        }

        $scope.status = 'sent';
        $scope.txid = data.txid;
      })
      .error(function(data, status, headers, config) {
        $scope.status = 'error';
        if(data) {
          $scope.error = data;
        } else {
          $scope.error = "No error message given (connection error?)"
        }
      });
  };
});
// Source: public/src/js/services/address.js
angular.module('insight.address').factory('Address',
  function($resource) {
  return $resource(window.apiPrefix + '/addr/:addrStr/?noTxList=1', {
    addrStr: '@addStr'
  }, {
    get: {
      method: 'GET',
      interceptor: {
        response: function (res) {
          console.warn('block res', res);
          return res.data;
        },
        responseError: function (res) {
          if (res.status === 404) {
            return res;
          }
        }
      }
    }
  });
});

 
// Source: public/src/js/services/blocks.js
angular.module('insight.blocks')
  .factory('Block',
    function($resource) {
    return $resource(window.apiPrefix + '/block/:blockHash', {
      blockHash: '@blockHash'
    }, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('Blocks',
    function($resource) {
      return $resource(window.apiPrefix + '/blocks');
  })
  .factory('BlockByHeight',
    function($resource) {
      return $resource(window.apiPrefix + '/block-index/:blockHeight');
  });

// Source: public/src/js/services/charts.js
angular.module('insight.charts')
  .factory('Chart',
    function($resource) {
    return $resource(window.apiPrefix + '/chart/:chartType', {
      chartType: '@chartType'
    }, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('Charts',
    function($resource) {
      return $resource(window.apiPrefix + '/charts');
  });

// Source: public/src/js/services/currency.js
angular.module('insight.currency').factory('Currency',
  function($resource) {
    return $resource(window.apiPrefix + '/currency');
});

// Source: public/src/js/services/global.js
//Global service for global variables
angular.module('insight.system')
  .factory('Global',[
    function() {
      return {};
    }
  ])
  .factory('Version',
    function($resource) {
      return $resource(window.apiPrefix + '/version');
  });

// Source: public/src/js/services/socket.js
var ScopedSocket = function(socket, $rootScope) {
  this.socket = socket;
  this.$rootScope = $rootScope;
  this.listeners = [];
};

ScopedSocket.prototype.removeAllListeners = function(opts) {
  if (!opts) opts = {};
  for (var i = 0; i < this.listeners.length; i++) {
    var details = this.listeners[i];
    if (opts.skipConnect && details.event === 'connect') {
      continue;
    }
    this.socket.removeListener(details.event, details.fn);
  }
  this.listeners = [];
};

ScopedSocket.prototype.on = function(event, callback) {
  var socket = this.socket;
  var $rootScope = this.$rootScope;

  var wrapped_callback = function() {
    var args = arguments;
    $rootScope.$apply(function() {
      callback.apply(socket, args);
    });
  };
  socket.on(event, wrapped_callback);

  this.listeners.push({
    event: event,
    fn: wrapped_callback
  });
};

ScopedSocket.prototype.emit = function(event, data, callback) {
  var socket = this.socket;
  var $rootScope = this.$rootScope;
  var args = Array.prototype.slice.call(arguments);

  args.push(function() {
    var args = arguments;
    $rootScope.$apply(function() {
      if (callback) {
        callback.apply(socket, args);
      }
    });
  });

  socket.emit.apply(socket, args);
};

angular.module('insight.socket').factory('getSocket',
  function($rootScope) {
    var socket = io.connect(window.urlPrefix, window.socketPrefix ? {
      'path': '/' + window.socketPrefix + '/socket.io',
      'reconnect': true,
      'reconnection delay': 500,
    } : {
      'reconnect': true,
      'reconnection delay': 500,
    });
    return function(scope) {
      var scopedSocket = new ScopedSocket(socket, $rootScope);
      scope.$on('$destroy', function() {
        scopedSocket.removeAllListeners();
      });
      socket.on('connect', function() {
        scopedSocket.removeAllListeners({
          skipConnect: true
        });
      });
      return scopedSocket;
    };
  });

// Source: public/src/js/services/stats.js
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
// Source: public/src/js/services/status.js
angular.module('insight.status')
  .factory('Status',
    function($resource) {
      return $resource(window.apiPrefix + '/status', {
        q: '@q'
      });
    })
  .factory('Sync',
    function($resource) {
      return $resource(window.apiPrefix + '/sync');
    })
  .factory('PeerSync',
    function($resource) {
      return $resource(window.apiPrefix + '/peer');
    });

// Source: public/src/js/services/transactions.js
angular.module('insight.transactions')
  .factory('Transaction',
    function($resource) {
    return $resource(window.apiPrefix + '/tx/:txId', {
      txId: '@txId'
    }, {
      get: {
        method: 'GET',
        interceptor: {
          response: function (res) {
            return res.data;
          },
          responseError: function (res) {
            if (res.status === 404) {
              return res;
            }
          }
        }
      }
    });
  })
  .factory('TransactionsByBlock',
    function($resource) {
    return $resource(window.apiPrefix + '/txs', {
      block: '@block'
    });
  })
  .factory('TransactionsByAddress',
    function($resource) {
    return $resource(window.apiPrefix + '/txs', {
      address: '@address'
    });
  })
  .factory('Transactions',
    function($resource) {
      return $resource(window.apiPrefix + '/txs');
  });

// Source: public/src/js/directives.js
var ZeroClipboard = window.ZeroClipboard;

angular.module('insight')
  .directive('scroll', function ($window) {
    return function(scope, element, attrs) {
      angular.element($window).bind('scroll', function() {
        if (this.pageYOffset >= 200) {
          scope.secondaryNavbar = true;
        } else {
          scope.secondaryNavbar = false;
        }
        scope.$apply();
      });
    };
  })
  .directive('whenScrolled', function($window) {
    return {
      restric: 'A',
      link: function(scope, elm, attr) {
        var pageHeight, clientHeight, scrollPos;
        $window = angular.element($window);

        var handler = function() {
          pageHeight = window.document.documentElement.scrollHeight;
          clientHeight = window.document.documentElement.clientHeight;
          scrollPos = window.pageYOffset;

          if (pageHeight - (scrollPos + clientHeight) === 0) {
            scope.$apply(attr.whenScrolled);
          }
        };

        $window.on('scroll', handler);

        scope.$on('$destroy', function() {
          return $window.off('scroll', handler);
        });
      }
    };
  })
  .directive('clipCopy', function() {
    ZeroClipboard.config({
      moviePath: '/public/lib/zeroclipboard/ZeroClipboard.swf',
      trustedDomains: ['*'],
      allowScriptAccess: 'always',
      forceHandCursor: true
    });

    return {
      restric: 'A',
      scope: { clipCopy: '=clipCopy' },
      template: '<div class="tooltip fade right in"><div class="tooltip-arrow"></div><div class="tooltip-inner">Copied!</div></div>',
      link: function(scope, elm) {
        var clip = new ZeroClipboard(elm);

        clip.on('load', function(client) {
          var onMousedown = function(client) {
            client.setText(scope.clipCopy);
          };

          client.on('mousedown', onMousedown);

          scope.$on('$destroy', function() {
            client.off('mousedown', onMousedown);
          });
        });

        clip.on('noFlash wrongflash', function() {
          return elm.remove();
        });
      }
    };
  })
  .directive('focus', function ($timeout) {
    return {
      scope: {
        trigger: '@focus'
      },
      link: function (scope, element) {
        scope.$watch('trigger', function (value) {
          if (value === "true") {
            $timeout(function () {
              element[0].focus();
            });
          }
        });
      }
    };
  });

// Source: public/src/js/filters.js
angular.module('insight')
  .filter('startFrom', function() {
    return function(input, start) {
      start = +start; //parse to int
      return input.slice(start);
    }
  })
  .filter('split', function() {
    return function(input, delimiter) {
      var delimiter = delimiter || ',';
      return input.split(delimiter);
    }
  });

// Source: public/src/js/config.js
//Setting up route
angular.module('insight').config(function($routeProvider) {
  $routeProvider.
    when('/block/:blockHash/', {
      templateUrl: 'views/block.html',
      title: 'Marmara Block '
    }).
    when('/block-index/:blockHeight/', {
      controller: 'BlocksController',
      templateUrl: 'views/redirect.html'
    }).
    when('/tx/send/', {
      templateUrl: 'views/transaction_sendraw.html',
      title: 'Broadcast Raw Transaction'
    }).
    when('/tx/:txId/:v_type?/:v_index?/', {
      templateUrl: 'views/transaction.html',
      title: 'Marmara Transaction '
    }).
    when('/', {
      templateUrl: 'views/index.html',
      title: 'Home'
    }).
    when('/', {
      templateUrl: 'views/index.html',
      title: 'Home'
    }).
    when('/blocks/', {
      templateUrl: 'views/block_list.html',
      title: 'Marmara Blocks solved Today'
    }).
    when('/blocks-date/:blockDate/:startTimestamp?/', {
      templateUrl: 'views/block_list.html',
      title: 'Marmara Blocks solved '
    }).
    when('/address/:addrStr/', {
      templateUrl: 'views/address.html',
      title: 'Marmara Address '
    }).
    when('/charts/:chartType?/', {
      templateUrl: 'views/charts.html',
      title: 'Charts'
    }).
    when('/status/', {
      templateUrl: 'views/status.html',
      title: 'Status'
    }).
    when('/stats/', {
      templateUrl: 'views/stats.html',
      title: 'Stats'
    }).
    when('/messages/verify/', {
      templateUrl: 'views/messages_verify.html',
      title: 'Verify Message'
    })
    .otherwise({
      templateUrl: 'views/404.html',
      title: 'Error'
    });
});

//Setting HTML5 Location Mode
angular.module('insight')
  .config(function($locationProvider) {
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
  })
  .run(function($rootScope, $route, $location, $routeParams, $anchorScroll, ngProgress, gettextCatalog, amMoment) {
    gettextCatalog.currentLanguage = defaultLanguage;
    amMoment.changeLocale(defaultLanguage);
    $rootScope.$on('$routeChangeStart', function() {
      ngProgress.start();
    });

    $rootScope.$on('$routeChangeSuccess', function() {
      ngProgress.complete();

      //Change page title, based on Route information
      $rootScope.titleDetail = '';
      $rootScope.title = $route.current.title;
      $rootScope.isCollapsed = true;
      $rootScope.currentAddr = null;
      $rootScope.coin = window.netSymbol;

      $location.hash($routeParams.scrollTo);
      $anchorScroll();
    });
  });

// Source: public/src/js/init.js
angular.element(document).ready(function() {
  // Init the app
  // angular.bootstrap(document, ['insight']);
});

// Source: public/src/js/translations.js
angular.module('insight').run(['gettextCatalog', function (gettextCatalog) {
/* jshint -W100 */
    gettextCatalog.setStrings('de', {"(Input unconfirmed)":"(Eingabe unbestätigt)","404 Page not found :(":"404 Seite nicht gefunden :(","<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> is the first and the only Decentralized Finance (DeFi) system in the World\n                    designed to run in real economy.":"<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> ist das erste und einzige DeFi-System (Decentralized Finance)\n                    der Welt, das für den Betrieb in der Realwirtschaft konzipiert wurde.","<span>Historical stats</span>":"<span>Historische Statistiken</span>","Address":"Adresse","Age":"Alter","An error occured in the verification process.":"Bei der Überprüfung ist ein Fehler aufgetreten.","An error occured:<br>{{error}}":"Es ist ein Fehler aufgetreten:<br>{{error}}","Application Status":"Programmstatus","Block":"Block","Block Reward":"Belohnung","Blocks":"Blöcke","Broadcast Raw Transaction":"Broadcast Raw-Transaktion","Can't connect to Marmara to get live updates from the p2p network. (Tried connecting to komodod at {{host}}:{{port}} and failed.)":"Es ist nicht möglich mit Marmara zu verbinden um live Aktualisierungen vom P2P Netzwerk zu erhalten. (Verbindungsversuch zu komodod an {{host}}:{{port}} ist fehlgeschlagen.)","Can't connect to insight server. Attempting to reconnect...":"Keine Verbindung zum Insight-Server möglich. Es wird versucht die Verbindung neu aufzubauen...","Can't connect to internet. Please, check your connection.":"Keine Verbindung zum Internet möglich, bitte Zugangsdaten prüfen.","Charts":"Diagramme","Complete":"Vollständig","Confirmations":"Bestätigungen","Conn":"Verbindungen","Connections to other nodes":"Verbindungen zu Nodes","Current Blockchain Tip (insight)":"Aktueller Blockchain Tip (insight)","Current Sync Status":"Aktueller Status","Details":"Details","Difficulty":"Schwierigkeit","Double spent attempt detected. From tx:":"Es wurde ein double Spend Versuch erkannt.Von tx:","Error message:":"Fehlermeldung:","Error!":"Fehler!","Fee":"Gebühr","Fee Rate":"Gebührensatz","Final Balance":"Schlussbilanz","Finish Date":"Fertigstellung","Go to home":"Zur Startseite","Height":"Höhe","Included in Block":"Eingefügt in Block","Incoherence in levelDB detected:":"Es wurde eine Zusammenhangslosigkeit in der LevelDB festgestellt:","Info Errors":"Fehlerbeschreibung","Initial Block Chain Height":"Ursprüngliche Blockchain Höhe","Input":"Eingänge","Last Block":"Letzter Block","Last Block Hash (Komodod)":"Letzter Hash (Komodod)","Latest Blocks":"Letzte Blöcke","Latest Transactions":"Letzte Transaktionen","Loading Address Information":"Lade Adressinformationen","Loading Block Information":"Lade Blockinformation","Loading Selected Date...":"Lade gewähltes Datum...","Loading Transaction Details":"Lade Transaktionsdetails","Loading Transactions...":"Lade Transaktionen...","Loading chart...":"Lade Diagramm...","Loading...":"Lade...","Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.":"Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.","Marmara Stats\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>":"Marmara-Statistiken\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>","Marmara comes with a way of signing arbitrary messages.":"Marmara comes with a way of signing arbitrary messages.","Marmara node information":"Marmara-Knoteninformationen","Message":"Botschaft","Mined Time":"Block gefunden (Mining)","Mined by":"Gefunden von","Mining Difficulty":"Schwierigkeitgrad","Network":"Netzwerk","Next Block":"Nächster Block","No Inputs":"Keine Eingänge","No Inputs (Newly Generated Coins)":"Keine Eingänge (Neu generierte Coins)","No JoinSplits":"No JoinSplits","No Outputs":"Keine Ausgänge","No Shielded Spends and Outputs":"No Shielded Spends and Outputs","No blocks yet.":"Keine Blöcke bisher.","No matching records found!":"Keine passenden Einträge gefunden!","No. Transactions":"Anzahl Transaktionen","Number Of Transactions":"Anzahl der Transaktionen","Output":"Ausgänge","Powered by":"Unterstützt durch","Previous Block":"Letzter Block","Protocol version":"Protokollversion","Proxy setting":"Proxyeinstellung","Public input":"Public Eingabe","Public output":"Public ausgabe","Raw transaction data":"Rohe Transaktionsdaten","Raw transaction data must be a valid hexadecimal string.":"Rohe Transaktionsdaten müssen eine gültige hexadezimale Zeichenfolge sein.","Received Time":"Empfangene Zeit","Redirecting...":"Umleiten...","Search for block, transaction or address":"Suchen Sie nach Block, Transaktion oder Adresse","See all blocks":"Alle Blöcke anzeigen","Send transaction":"Transaktion senden","Show all":"Zeige alles","Show input":"Eingabe anzeigen","Show less":"Zeige weniger","Show more":"Zeig mehr","Signature":"Unterschrift","Size":"Größe","Size (bytes)":"Größe (bytes)","Skipped Blocks (previously synced)":"Verworfene Blöcke (bereits syncronisiert)","Start Date":"Startdatum","Status":"Status","Summary":"Zusammenfassung","Summary <small>confirmed</small>":"Zusammenfassung <small>bestätigt</small>","Sync Progress":"Fortschritt","Sync Status":"Syncronisation","Sync Type":"Art der Syncronisation","Synced Blocks":"Syncronisierte Blöcke","Synchronizing data...":"Daten synchronisieren...","The message failed to verify.":"Die Nachricht konnte nicht überprüft werden.","The message is verifiably from {{verification.address}}.":"Die Nachricht stammt nachweislich von  {{verification.address}}.","The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.":"The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.","There are no transactions involving this address.":"Es gibt keine Transaktionen zu dieser Adresse.","This form can be used to broadcast a raw transaction in hex format over\n        the Marmara network.":"Dieses Formular kann verwendet werden, um eine Rohtransaktion\n        im Hex-Format über das Marmara-Netzwerk zu senden.","This form can be used to verify that a message comes from\n        a specific Marmara address.":"Mit diesem Formular können Sie überprüfen,\n        ob eine Nachricht von einer bestimmten Marmara-Adresse stammt.","Time Offset":"Zeitoffset zu UTC","Timestamp":"Zeitstempel","Today":"Heute","Total Received":"Insgesamt empfangen","Total Sent":"Insgesamt gesendet","Transaction":"Transaktion","Transaction succesfully broadcast.<br>Transaction id: {{txid}}":"Transaktion erfolgreich gesendet.<br>Transaktion id: {{txid}}","Transactions":"Transaktionen","Type":"Typ","Unconfirmed":"Unbestätigt","Unconfirmed Transaction!":"Unbestätigte Transaktion!","Unconfirmed Txs Balance":"Unbestätigtes Guthaben","Value Out":"Wert","Verify":"Überprüfen","Verify signed message":"Überprüfen Sie die signierte Nachricht","Version":"Version","Waiting for blocks...":"Warte auf Blöcke...","Waiting for transactions...":"Warte auf Transaktionen...","What is Marmara Credit Loops?":"Was ist Marmara Credit Loops?","by date.":"Nach Datum.","first seen at":"zuerst gesehen am","mined":"gefunden","mined on:":"vom:"});
    gettextCatalog.setStrings('es', {"(Input unconfirmed)":"(Entrada sin confirmar)","404 Page not found :(":"404 Página no encontrada :(","<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> is the first and the only Decentralized Finance (DeFi) system in the World\n                    designed to run in real economy.":"<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a>  es el primer y único sistema de finanzas descentralizadas (DeFi) del\n                    mundo diseñado para funcionar en la economía real.","Address":"Dirección","Age":"Edad","An error occured in the verification process.":"Ocurrió un error en el proceso de verificación.","An error occured:<br>{{error}}":"Ocurrió un error:<br>{{error}}","Application Status":"Estado de la Aplicación","Block":"Bloque","Block Reward":"Bloque Recompensa","Blocks":"Bloques","Broadcast Raw Transaction":"Transmitir transacción sin procesar","Can't connect to Marmara to get live updates from the p2p network. (Tried connecting to komodod at {{host}}:{{port}} and failed.)":"No se pudo conectar a Marmara para obtener actualizaciones en vivo de la red p2p. (Se intentó conectar a komodod de {{host}}:{{port}} y falló.)","Can't connect to insight server. Attempting to reconnect...":"No se pudo conectar al servidor insight. Intentando re-conectar...","Can't connect to internet. Please, check your connection.":"No se pudo conectar a Internet. Por favor, verifique su conexión.","Charts":"Gráficos","Complete":"Completado","Confirmations":"Confirmaciones","Conn":"Con","Connections to other nodes":"Conexiones a otros nodos","Current Blockchain Tip (insight)":"Actual Blockchain Tip (insight)","Current Sync Status":"Actual Estado de Sincronización","Details":"Detalles","Difficulty":"Dificultad","Double spent attempt detected. From tx:":"Intento de doble gasto detectado. De la transacción:","Error message:":"Mensaje de error:","Error!":"¡Error!","Fee":"Tasa","Fee Rate":"Tasa de tarifa","Final Balance":"Balance Final","Finish Date":"Fecha Final","Go to home":"Volver al Inicio","Height":"Altura","Included in Block":"Incluido en el Bloque","Incoherence in levelDB detected:":"Detectada una incoherencia en levelDB:","Info Errors":"Errores de Información","Initial Block Chain Height":"Altura de la Cadena en Bloque Inicial","Input":"Entrada","Last Block":"Último Bloque","Last Block Hash (Komodod)":"Último Bloque Hash (Komodod)","Latest Blocks":"Últimos Bloques","Latest Transactions":"Últimas Transacciones","Loading Address Information":"Cargando Información de la Dirección","Loading Block Information":"Cargando Información del Bloque","Loading Selected Date...":"Cargando Fecha Seleccionada...","Loading Transaction Details":"Cargando Detalles de la Transacción","Loading Transactions...":"Cargando Transacciones...","Loading chart...":"Cargando gráficos...","Loading...":"Cargando...","Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.":"Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.","Marmara Stats\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>":"Estadísticas de Marmara\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>","Marmara comes with a way of signing arbitrary messages.":"Marmara comes with a way of signing arbitrary messages.","Marmara node information":"Información del nodo Marmara","Message":"Mensaje","Mined Time":"Hora de Minado","Mined by":"Minado por","Mining Difficulty":"Dificultad de Minado","Network":"Red","Next Block":"Próximo Bloque","No Inputs":"Sin Entradas","No Inputs (Newly Generated Coins)":"Sin Entradas (Monedas Recién Generadas)","No JoinSplits":"No JoinSplits","No Outputs":"Sin Salidas","No Shielded Spends and Outputs":"No Shielded Spends and Outputs","No blocks yet.":"No hay bloques aún.","No matching records found!":"¡No se encontraron registros coincidentes!","No. Transactions":"Nro. de Transacciones","Number Of Transactions":"Número de Transacciones","Output":"Salida","Powered by":"Funciona con","Previous Block":"Bloque Anterior","Protocol version":"Versión del protocolo","Proxy setting":"Opción de proxy","Public input":"Public input","Public output":"Public output","Raw transaction data":"Raw transaction data","Raw transaction data must be a valid hexadecimal string.":"Raw transaction data must be a valid hexadecimal string.","Received Time":"Hora de Recibido","Redirecting...":"Redireccionando...","Search for block, transaction or address":"Buscar bloques, transacciones o direcciones","See all blocks":"Ver todos los bloques","Send transaction":"Enviar transacción","Show all":"Mostrar todos","Show input":"Mostrar entrada","Show less":"Ver menos","Show more":"Ver más","Signature":"Firma","Size":"Tamaño","Size (bytes)":"Tamaño (bytes)","Skipped Blocks (previously synced)":"Bloques Saltados (previamente sincronizado)","Start Date":"Fecha de Inicio","Status":"Estado","Summary":"Resumen","Summary <small>confirmed</small>":"Resumen <small>confirmados</small>","Sync Progress":"Proceso de Sincronización","Sync Status":"Estado de Sincronización","Sync Type":"Tipo de Sincronización","Synced Blocks":"Bloques Sincornizados","Synchronizing data...":"Sincronizando datos...","The message failed to verify.":"El mensaje no se pudo verificar.","The message is verifiably from {{verification.address}}.":"El mensaje es verificable de {{verification.address}}.","The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.":"The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.","There are no transactions involving this address.":"No hay transacciones para esta dirección.","This form can be used to broadcast a raw transaction in hex format over\n        the Marmara network.":"Este formulario se puede utilizar para difundir una transacción sin\n         procesar en formato hexadecimal a través de la red Marmara.","This form can be used to verify that a message comes from\n        a specific Marmara address.":"Este formulario se puede utilizar para verificar que un mensaje\n        proviene de una dirección específica de Marmara.","Time Offset":"Desplazamiento de hora","Timestamp":"Fecha y hora","Today":"Hoy","Total Received":"Total Recibido","Total Sent":"Total Enviado","Transaction":"Transacción","Transaction succesfully broadcast.<br>Transaction id: {{txid}}":"Transacción transmitida con éxito.<br>Transacción id: {{txid}}","Transactions":"Transacciones","Type":"Tipo","Unconfirmed":"Sin confirmar","Unconfirmed Transaction!":"¡Transacción sin confirmar!","Unconfirmed Txs Balance":"Balance sin confirmar","Value Out":"Valor de Salida","Verify":"Verificar","Verify signed message":"Verificar mensaje firmado","Version":"Versión","Waiting for blocks...":"Esperando bloques...","Waiting for transactions...":"Esperando transacciones...","What is Marmara Credit Loops?":"Qué es Marmara Credit Loops?","by date.":"por fecha.","first seen at":"Visto a","mined":"minado","mined on:":"minado el:"});
    gettextCatalog.setStrings('ja', {"(Input unconfirmed)":"(入力は未検証です)","404 Page not found :(":"404 ページがみつかりません (´・ω・`)","<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> is the first and the only Decentralized Finance (DeFi) system in the World\n                    designed to run in real economy.":"<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> は、実体経済で実行するように設計された世界で最初で唯一\n                    の分散型ファイナンス（DeFi）システムです","Address":"アドレス","Age":"生成後経過時間","An error occured in the verification process.":"検証過程でエラーが発生しました。","An error occured:<br>{{error}}":"エラーが発生しました:<br>{{error}}","Application Status":"アプリケーションの状態","Block":"ブロック","Block Reward":"ブロック報酬","Blocks":"ブロック","Broadcast Raw Transaction":"生のトランザクションを配信","Can't connect to Marmara to get live updates from the p2p network. (Tried connecting to komodod at {{host}}:{{port}} and failed.)":"P2Pネットワークからライブ情報を取得するためにMarmaraへ接続することができませんでした。({{host}}:{{port}} への接続を試みましたが、失敗しました。)","Can't connect to insight server. Attempting to reconnect...":"insight サーバに接続できません。再接続しています..","Can't connect to internet. Please, check your connection.":"インターネットに接続できません。コネクションを確認してください。","Charts":"チャート","Complete":"完了","Confirmations":"検証数","Conn":"接続数","Connections to other nodes":"他ノードへの接続","Current Blockchain Tip (insight)":"現在のブロックチェインのTip (insight)","Current Sync Status":"現在の同期状況","Details":"詳細","Difficulty":"難易度","Double spent attempt detected. From tx:":"二重支払い攻撃をこのトランザクションから検知しました：","Error message:":"エラーメッセージ:","Error!":"エラー！","Fee":"手数料","Fee Rate":"料金レート","Final Balance":"最終残高","Finish Date":"終了日時","Go to home":"ホームへ","Height":"ブロック高","Included in Block":"取り込まれたブロック","Incoherence in levelDB detected:":"levelDBの破損を検知しました:","Info Errors":"エラー情報","Initial Block Chain Height":"起動時のブロック高","Input":"入力","Last Block":"直前のブロック","Last Block Hash (Komodod)":"直前のブロックのハッシュ値 (Komodod)","Latest Blocks":"最新のブロック","Latest Transactions":"最新のトランザクション","Loading Address Information":"アドレス情報を読み込んでいます","Loading Block Information":"ブロック情報を読み込んでいます","Loading Selected Date...":"選択されたデータを読み込んでいます...","Loading Transaction Details":"トランザクションの詳細を読み込んでいます","Loading Transactions...":"トランザクションを読み込んでいます...","Loading chart...":"チャートを読み込んでいます...","Loading...":"ロード中...","Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.":"Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.","Marmara Stats\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>":"Marmara 統計\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>","Marmara comes with a way of signing arbitrary messages.":"Marmaraには任意のメッセージを署名する昨日が備わっています。","Marmara node information":"Marmaraノード情報","Message":"メッセージ","Mined Time":"採掘時刻","Mined by":"採掘者","Mining Difficulty":"採掘難易度","Network":"通信網","Next Block":"次のブロック","No Inputs":"入力なし","No Inputs (Newly Generated Coins)":"入力なし (新しく生成されたコイン)","No JoinSplits":"No JoinSplits","No Outputs":"No Outputs","No Shielded Spends and Outputs":"No Shielded Spends and Outputs","No blocks yet.":"ブロックはありません。","No matching records found!":"一致するレコードはありません！","No. Transactions":"トランザクション数","Number Of Transactions":"トランザクション数","Output":"出力","Powered by":"Powered by","Previous Block":"前のブロック","Protocol version":"プロトコルバージョン","Proxy setting":"プロキシ設定","Public input":"Public input","Public output":"Public output","Raw transaction data":"トランザクションの生データ","Raw transaction data must be a valid hexadecimal string.":"生のトランザクションデータは有効な16進数でなければいけません。","Received Time":"受信時刻","Redirecting...":"リダイレクトしています...","Search for block, transaction or address":"ブロック、トランザクション、アドレスを検索","See all blocks":"すべてのブロックをみる","Send transaction":"トランザクションを送信","Show all":"すべて表示","Show input":"入力を表示","Show less":"隠す","Show more":"表示する","Signature":"署名","Size":"サイズ","Size (bytes)":"サイズ (バイト)","Skipped Blocks (previously synced)":"スキップされたブロック (同期済み)","Start Date":"開始日時","Status":"ステータス","Summary":"概要","Summary <small>confirmed</small>":"サマリ <small>検証済み</small>","Sync Progress":"同期の進捗状況","Sync Status":"同期ステータス","Sync Type":"同期タイプ","Synced Blocks":"同期されたブロック数","Synchronizing data...":"Synchronizing data...","The message failed to verify.":"メッセージの検証に失敗しました。","The message is verifiably from {{verification.address}}.":"メッセージは{{verification.address}}により検証されました。","The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.":"The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.","There are no transactions involving this address.":"このアドレスに対するトランザクションはありません。","This form can be used to broadcast a raw transaction in hex format over\n        the Marmara network.":"このフォームでは、16進数フォーマットの生のトランザクションをMarmaraネットワー\n        ク上に配信することができます。","This form can be used to verify that a message comes from\n        a specific Marmara address.":"このフォームでは、メッセージが特定のMarmaraアドレスから来たかどうかを検証する\n        ことができます。","Time Offset":"時間オフセット","Timestamp":"タイムスタンプ","Today":"今日","Total Received":"総入金額","Total Sent":"総送金額","Transaction":"トランザクション","Transaction succesfully broadcast.<br>Transaction id: {{txid}}":"トランザクションの配信に成功しました。<br>トランザクションID: {{txid}}","Transactions":"トランザクション","Type":"タイプ","Unconfirmed":"未検証","Unconfirmed Transaction!":"未検証のトランザクションです！","Unconfirmed Txs Balance":"未検証トランザクションの残高","Value Out":"出力値","Verify":"検証","Verify signed message":"署名済みメッセージを検証","Version":"バージョン","Waiting for blocks...":"ブロックを待っています...","Waiting for transactions...":"トランザクションを待っています...","What is Marmara Credit Loops?":"What is Marmara Credit Loops?","by date.":"日毎。","first seen at":"最初に発見された日時","mined":"採掘された","mined on:":"採掘日時:"});
    gettextCatalog.setStrings('ru', {"(Input unconfirmed)":"(неподтвержденный вход)","404 Page not found :(":"404 Страница не найдена :(","<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> is the first and the only Decentralized Finance (DeFi) system in the World\n                    designed to run in real economy.":"<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> is the first and the only Decentralized Finance (DeFi) system in the World\n                    designed to run in real economy.","Address":"Адрес","Age":"Время","An error occured in the verification process.":"Произошла ошибка в процессе проверки.","An error occured:<br>{{error}}":"Произошла ошибка:<br>{{error}}","Application Status":"Статус приложения","Block":"Блок","Block Reward":"Награда за блок","Blocks":"Блоки","Broadcast Raw Transaction":"Отправить raw-транзакцию в сеть","Can't connect to Marmara to get live updates from the p2p network. (Tried connecting to komodod at {{host}}:{{port}} and failed.)":"Can't connect to Marmara to get live updates from the p2p network. (Tried connecting to komodod at {{host}}:{{port}} and failed.)","Can't connect to insight server. Attempting to reconnect...":"Ошибка подклоючения к серверу insight. Повторная попытка...","Can't connect to internet. Please, check your connection.":"Ошибка подключения к интернет. Пожалуйста, проверьте соединение.","Charts":"Графики","Complete":"Завершено","Confirmations":"Подтверждений","Conn":"Узлы","Connections to other nodes":"Соединений с другими узлами","Current Blockchain Tip (insight)":"Текущая вершина блокчейна (insight)","Current Sync Status":"Текущий статус синхронизации","Details":"Подробная информация","Difficulty":"Сложность","Double spent attempt detected. From tx:":"Попытка двойной траты. Транзакция:","Error message:":"Описание ошибки:","Error!":"Ошибка!","Fee":"Комиссия","Fee Rate":"Размер комисии","Final Balance":"Итоговый баланс","Finish Date":"Время завершения","Go to home":"Домой","Height":"Высота","Included in Block":"Входит в блок","Incoherence in levelDB detected:":"Нарушение связности в LevelDB:","Info Errors":"Информация об ошибках","Initial Block Chain Height":"Начальная высота блокчейна","Input":"Вход","Last Block":"Последний блок","Last Block Hash (Komodod)":"Хеш последнего блока (komodod)","Latest Blocks":"Последние блоки","Latest Transactions":"Последние транзакции","Loading Address Information":"Загрузка информации об адресе","Loading Block Information":"Загрузка информации о блоке","Loading Selected Date...":"Загрузка выбранной даты...","Loading Transaction Details":"Загрузка деталей транзакции","Loading Transactions...":"Загрузка транзакций...","Loading chart...":"Загрузка графиков...","Loading...":"Загрузка...","Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.":"Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.","Marmara Stats\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>":"статистика Marmara\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>","Marmara comes with a way of signing arbitrary messages.":"Marmara comes with a way of signing arbitrary messages.","Marmara node information":"Информация об узле Marmara","Message":"Сообщение","Mined Time":"Время получения","Mined by":"Майнер","Mining Difficulty":"Сложность майнинга","Network":"Сеть","Next Block":"Следующий блок","No Inputs":"Нет входов","No Inputs (Newly Generated Coins)":"Нет входов (coinbase транзакция)","No JoinSplits":"Нет операций (sprout)","No Outputs":"Нет выходов","No Shielded Spends and Outputs":"Нет операций (sapling)","No blocks yet.":"Пока нет блоков.","No matching records found!":"Не найдено записей!","No. Transactions":"Всего транзакций","Number Of Transactions":"Количество транзакций","Output":"Выход","Powered by":"Powered by","Previous Block":"Предыдущий блок","Protocol version":"Версия протокола","Proxy setting":"Настройки proxy","Public input":"Публичный вход","Public output":"Публичный выход","Raw transaction data":"Raw данные транзакции","Raw transaction data must be a valid hexadecimal string.":"Raw данные транзакции должны быть правильной hex строкой.","Received Time":"Время получения","Redirecting...":"Перенаправление...","Search for block, transaction or address":"Поиск блока, транзакции или адреса","See all blocks":"Просмотр всех блоков","Send transaction":"Отправить транзакцию","Show all":"Показать все","Show input":"Показать вход","Show less":"Скрыть","Show more":"Показать","Signature":"Подпись","Size":"Размер","Size (bytes)":"Размер (байт)","Skipped Blocks (previously synced)":"Пропущенные блоки (ранее синхронизированные)","Start Date":"Время начала","Status":"Статус","Summary":"Итог","Summary <small>confirmed</small>":"Итог <small>подтвержденный</small>","Sync Progress":"Синхронизация","Sync Status":"Статус синхронизации","Sync Type":"Тип синхронизации","Synced Blocks":"Синхронизировано блоков","Synchronizing data...":"Синхронизация данных...","The message failed to verify.":"Проверка подписи сообщения не пройдена.","The message is verifiably from {{verification.address}}.":"Сообщение подписано отправителем {{verification.address}}.","The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.":"The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.","There are no transactions involving this address.":"Для этого адреса нет транзакций.","This form can be used to broadcast a raw transaction in hex format over\n        the Marmara network.":"Эта форма может быть использована для отправки raw транзакции в hex\n        формате через сеть.","This form can be used to verify that a message comes from\n        a specific Marmara address.":"Эта форма может быть использована для проверки\n        отправителя (адреса) сообщения.","Time Offset":"Смещение времени","Timestamp":"Дата / время","Today":"Сегодня","Total Received":"Всего получено","Total Sent":"Всего отправлено","Transaction":"Транзакция","Transaction succesfully broadcast.<br>Transaction id: {{txid}}":"Транзакция успешно отправлена.<br>TXID: {{txid}}","Transactions":"Транзакции","Type":"Тип","Unconfirmed":"Нет подтверждений","Unconfirmed Transaction!":"Неподтвержденная транзакция!","Unconfirmed Txs Balance":"Баланс неподтвержденных транзакций","Value Out":"Сумма","Verify":"Проверить","Verify signed message":"Проверить подпись сообщения","Version":"Версия","Waiting for blocks...":"Ожидание блоков...","Waiting for transactions...":"Ожидание транзакций...","What is Marmara Credit Loops?":"What is Marmara Credit Loops?","by date.":"по дате.","first seen at":"первое появление","mined":"дата","mined on:":"дата:"});
    gettextCatalog.setStrings('tr_TR', {"(Input unconfirmed)":"(Girdi onaylanmamış)","404 Page not found :(":"404 Sayfa Bulunamadı :(","<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Credit Loops\">Marmara\n                    Credit Loops (MCL)</a> is the first and the only Decentralized Finance (DeFi) system in the World\n                    designed to run in real economy.":"<a href=\"http://marmara.io\" target=\"_blank\" title=\"Marmara Kredi Döngüleri\">Marmara\n                    Kredi Döngüleri (MCL)</a> dünyada gerçek ekonomide çalışmak üzere tasarlanmış\n                     ilk ve tek Merkezi Olmayan Finans (DeFi) sistemidir.","<span>Historical stats</span>":"<span>Geçmiş İstatistikler</span>","Address":"Adres","Age":"Yaş","An error occured in the verification process.":"Doğrulama sürecinde bir hata oluştu.","An error occured:<br>{{error}}":"Bir hata oluştu:<br>{{error}}","Application Status":"Uygulama Durumu","Block":"Blok","Block Reward":"Blok Ödülü","Blocks":"Bloklar","Broadcast Raw Transaction":"Ham İşlemi Yayınlama","Can't connect to Marmara to get live updates from the p2p network. (Tried connecting to komodod at {{host}}:{{port}} and failed.)":"P2p ağından canlı güncellemeler almak için Marmara'ya bağlanılamıyor. (Komodod'a {{host}}:{{port}} üzerinden bağlanma denendi ve başarısız olundu.)","Can't connect to insight server. Attempting to reconnect...":"Insight sunucusuna bağlanılamıyor. Yeniden bağlanılmaya çalışılıyor...","Can't connect to internet. Please, check your connection.":"İnternete bağlanılamıyor. Lütfen bağlantınızı kontrol edin.","Charts":"Grafikler","Complete":"Tamamlandı","Confirmations":"Onaylar","Conn":"Bağlantı","Connections to other nodes":"Diğer düğümlere bağlantılar","Current Blockchain Tip (insight)":"Güncel Blokzincir Tip (insight)","Current Sync Status":"Güncel Senkron Durumu","Details":"Detaylar","Difficulty":"Zorluk","Double spent attempt detected. From tx:":"İlgili Tx'den çift harcama denemesi tespit edildi:","Error message:":"Hata Mesajı:","Error!":"Hata!","Fee":"Kesim Ücreti","Fee Rate":"Kesim Ücret Oranı","Final Balance":"Nihai Bakiye","Finish Date":"Bitiş Tarihi","Go to home":"Giriş Sayfasına Dön","Height":"Yükseklik","Included in Block":"Bloğa Dahil","Incoherence in levelDB detected:":"LevelDB'de tutarsızlık algılandı:","Info Errors":"Bilgi Hataları","Initial Block Chain Height":"İlk Blok Zincir Yüksekliği","Input":"Girdi","Last Block":"Son Blok","Last Block Hash (Komodod)":"Son Block Hash Verisi (Komodod)","Latest Blocks":"En son Çıkan Bloklar","Latest Transactions":"En Son Gerçekleşen İşlemler","Loading Address Information":"Adres Bilgisi Yükleniyor","Loading Block Information":"Blok Bilgisi Yükleniyor","Loading Selected Date...":"Seçilen Tarih Yükleniyor...","Loading Transaction Details":"İşlem Detayları Yükleniyor","Loading Transactions...":"İşlemler Yükleniyor...","Loading chart...":"Grafik yükleniyor...","Loading...":"Yükleniyor...","Marmara Chain is protected against 51% attacks by means of Komodo dPoW\n                    technologies which recycle the hash power of Bitcoin by backing up independent blockhains on the\n                    Bitcoin network. Staking could only be done when users lock their coins in one of the two funds,\n                    namely; \"Activated\" and \"Locked in Credit Loop\" (LCL) funds. When coins are locked in LCL funds,\n                    both issuer and holder(s) of credit have the chance for 3x staking. The system has a unique solution\n                    for coins locked in credit loops unlike other staking systems. Locking coins into credit loops for\n                    staking does not make them static. Instead, they can be circulated while they are locked and doing\n                    3x staking. The process of credit endorsement is designed to assure that it is only worth when\n                    shopping.":"Marmara Blokzinciri, bağımsız blokzincirlerini Bitcoin ağı üzerinde yedekleyerek\n                    Bitcoin'in hash gücünü geri dönüştüren Komodo dPoW teknolojileri\n                    ile %51 saldırılara karşı korunmaktadır. Stake etme işlemi, yalnızca kullanıcılar koinlerini\n                    iki fondan birine kilitlediklerinde yapılabilir, yani; \"Etkinleştirilmiş\" ve \n                    \"Kredi Döngüsünde Kilitli\" (LCL) fonları. Koinler Kredi Döngüsü (LCL) fonlarında kilitlendiğinde, hem keşideci\n                    hem de hamil 3x stake etme şansına sahiptir. Sistem, diğer stake etme sistemlerinden farklı olarak\n                    kredi döngülerinde kilitli paralar için benzersiz bir çözüme sahiptir. Paraları stake etmek için kredi\n                    döngülerine kilitlemek onları statik hale getirmez. Bunun yerine, kilitliyken ve 3x stake yaparken de\n                    dolaşabilirler. Kredi cirolama süreci, yalnızca alışveriş yaparken değeceğini garanti etmek için tasarlanmıştır.","Marmara Stats\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>":"Marmara İstatistikleri\n        <span class=\"t marmara-stats-sync\" tooltip=\"{{sync.lastBlockChecked}} / {{sync.chainTip}} synced.\" tooltip-placement=\"bottom\" data-ng-show=\"sync.status==='syncing'\">\n          <span class=\"glyphicon glyphicon-refresh icon-rotate\"></span>\n          {{sync.progress}}%\n        </span>","Marmara comes with a way of signing arbitrary messages.":"Marmara comes with a way of signing arbitrary messages.","Marmara node information":"Marmara Düğüm Bilgisi","Message":"Mesaj","Mined Time":"Madenin Çıkma Zamanı","Mined by":"Madeni Çıkaran","Mining Difficulty":"Madencilik Zorluğu","Network":"Ağ","Next Block":"Bir sonraki Blok","No Inputs":"Girdi Yok","No Inputs (Newly Generated Coins)":"Girdi Yok (Yeni Oluşturulan Koinler)","No JoinSplits":"No JoinSplits","No Outputs":"Çıktılar yok","No Shielded Spends and Outputs":"Korunmalı Harcama ve Çıktı Yok","No blocks yet.":"Henüz blok çıkmadı.","No matching records found!":"Hiçbir eşleşen kayıt bulunamadı!","No. Transactions":"İşlem numaraları","Number Of Transactions":"İşlem Sayısı","Output":"Çıktı","Powered by":"Tarafından desteklenmektedir","Previous Block":"Önceki Blok","Protocol version":"Protokol versiyonu","Proxy setting":"Proxy ayarı","Public input":"Publik Girdi","Public output":"Publik ÇIktı","Raw transaction data":"Ham İşlem Verisi","Raw transaction data must be a valid hexadecimal string.":"Ham işlem verisi, geçerli bir hex dizisi olmalıdır.","Received Time":"Alındığı Zaman","Redirecting...":"Yönlendiriliyor...","Search for block, transaction or address":"Blok, işlem veya adres arayın","See all blocks":"Bütün blokları görüntüle","Send transaction":"İşlem Gönder","Show all":"Hepsini göster","Show input":"Girdiyi göster","Show less":"Daha az göster","Show more":"Daha fazla göster","Signature":"İmza","Size":"Boyut","Size (bytes)":"Boyut (bayt)","Skipped Blocks (previously synced)":"Atlanan Bloklar (önceden senkronize edilen)","Start Date":"Başlangıç Tarihi","Status":"Durum","Summary":"Özet","Summary <small>confirmed</small>":"Özet <small>Teyit Edilen</small>","Sync Progress":"Senkronizasyon İlerleme Durumu","Sync Status":"Senkronizasyon Durumu","Sync Type":"Senkronizasyon Tİpi","Synced Blocks":"Senkronize olan Bloklar","Synchronizing data...":"Veriler senkronize ediliyor ...","The message failed to verify.":"Mesaj doğrulanamadı.","The message is verifiably from {{verification.address}}.":"Mesaj doğrulanabilir şekilde {{verification.address}} adresinden alınmıştır.","The system rewards buyers and sellers when shopping with credit loops\n                    instead of cash. It works as an independent smart chain with a 25% mineable and 75% stakeable coin\n                    integrated with two DeFi protocols. The system uses UTXO based Turing Complete Smart Contracting\n                    system powered by Komodo Platform.":"Sistem, alışveriş yaparken nakit yerine kredi döngüleri kullanan alıcıları ve satıcıları ödüllendirir.\n                    Sistem, İki DeFi protokolü ile entegre edilmiş %25 madencilik ve %75 hisseli kazanca (staking)\n                    sahip bağımsız bir smart zincir olarak çalışır. Sistemde Komodo Platformu tarafından\n                    desteklenen UTXO tabanlı Turing Bütünleşik Smart Sözleşme sistemi kullanılır.","There are no transactions involving this address.":"Bu adresle ilgili herhangi bir işlem yok.","This form can be used to broadcast a raw transaction in hex format over\n        the Marmara network.":"Bu form, ham bir işlemi hex formatta Marmara ağı\n        üzerinden yayınlamak için kullanılabilir.","This form can be used to verify that a message comes from\n        a specific Marmara address.":"Bu form, bir mesajın belirli bir Marmara adresinden geldiğini\n         doğrulamak için kullanılabilir.","Time Offset":"Zaman Farkı","Timestamp":"Zaman damgası","Today":"Bugün","Total Received":"Toplam Alınan","Total Sent":"Toplam Gönderilen","Transaction":"İşlem","Transaction succesfully broadcast.<br>Transaction id: {{txid}}":"İşlem başarıyla yayınlandı.<br>İşlem no: {{txid}}","Transactions":"İşlemler","Type":"Tip","Unconfirmed":"Onaylanmamış","Unconfirmed Transaction!":"Onaylanmamış İşlem!","Unconfirmed Txs Balance":"Onaylanmamış Txs Bakiye","Value Out":"Çıkan Değer","Verify":"Doğrulayın","Verify signed message":"İmzalanmış mesajı doğrulayın","Version":"Versiyon","Waiting for blocks...":"Blokların çıkması beklenmekte...","Waiting for transactions...":"İşlemler beklenmekte...","What is Marmara Credit Loops?":"Marmara Kredi Döngüleri Nedir?","by date.":"tarihe göre.","first seen at":"first seen at","mined":"madencilikle kazılan","mined on:":"kazılan:"});
/* jshint +W100 */
}]);