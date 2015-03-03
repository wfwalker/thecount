// retrieve values from form to use with middleware on server

function middlewareQueryParams() {
  var sinceVal = $('#since').val();
  if (sinceVal == null) { sinceVal = ''; }
  
  var untilVal = $('#until').val();
  if (untilVal == null) { untilVal = ''; }

  var minRatingsVal = $('#min_ratings').val();
  if (minRatingsVal == null) { minRatingsVal = ''; }

  console.log('middleware', sinceVal, untilVal, minRatingsVal);

  return '?since=' + sinceVal +
    '&until=' + untilVal +
    '&min_ratings=' + minRatingsVal;
}

function insertAlert(inText) {
  var newAlert = jQuery('<div/>', {
    class: 'alert alert-warning alert-dismissible',
    role: 'alert',
    text: inText
  });

  jQuery('<button/>', {
    type: 'button',
    class: 'close',
    'data-dismiss': 'alert',
    'aria-label': 'Close',
    text:'X'
  }).appendTo(newAlert);

  newAlert.appendTo('#alertContainer');
}


// ROUTES -------------------------------------------------

TheCount.Router.map(function() {
  this.resource('apps', { path: '/listing/:listing_kind/:listing_param' });
  this.resource('app', { path: '/app/:app_id'});
  this.resource('frequency', { path: '/frequency/:frequency_kind' });
  this.resource('table', { path: '/table' });
  this.resource('distribution', { path: '/distribution/:distribution_kind' });
  this.resource('pie', { path: '/pie/:pie_kind' });
  this.route('bad_url', { path: '/*badurl' });
});

TheCount.IndexRoute = Ember.Route.extend({
  setupController: function(controller, data) {
    controller.set('model', data);
    console.log('IndexRoute.setupController');
    document.title = 'TheCount | home';
    $('.loading').hide();
  },
  model: function(params) {
    $('.loading').show();

    console.log('fetching /globalstatistics');
    return Ember.$.getJSON('/globalstatistics');
  }
});

TheCount.AppsRoute = Ember.Route.extend({
  setupController: function(controller, data) {
    controller.set('model', data);
    controller.set('count', data.length);  
    controller.set('listingKind', this.get('listingKind'));
    controller.set('listingParam', this.get('listingParam'));
    $('.loading').hide();
    document.title = 'TheCount | listing';
  },
  model: function(params) {
    this.set('listingKind', params.listing_kind);
    this.set('listingParam', params.listing_param);
    $('.loading').show();
    return Ember.$.getJSON('/listing/' + params.listing_kind + '/' + params.listing_param + middlewareQueryParams());
  },
  actions: {
    error: function(error, transition) {
      console.log('error in apps route');
      insertAlert('Cannot get listing');
      console.log(error);
      $('.loading').hide();
    }
  }
});

TheCount.AppRoute = Ember.Route.extend({
  setupController: function(controller, app) {
    controller.set('model', app);
    $('.loading').hide();
    document.title = 'TheCount | ' + getEnglishOrOther(controller.get('model.name'));

    // Either retrieve the manifest URL's of all installed apps or disable all install buttons
    var installedManifestURLs = [];
    var appRecordsByManifest = {};

    if (window.navigator.mozApps && window.navigator.mozApps.getInstalled) {
      controller.set('enableInstallButtons', true);

      console.log('getting list of installed apps');

      var installListRequest = window.navigator.mozApps.getInstalled();
      installListRequest.onerror = function(e) {
        alert("Error calling getInstalled: " + installListRequest.error.name);

        controller.set('installedManifestURLs', installedManifestURLs);
        controller.set('appRecordsByManifest', appRecordsByManifest);
        controller.set('alreadyInstalled', false);
      };

      installListRequest.onsuccess = function(e) {
        for (var installListIndex = 0; installListIndex < installListRequest.result.length; installListIndex++) {
          var manifestURL = installListRequest.result[installListIndex].manifestURL;
          installedManifestURLs.push(manifestURL);
          appRecordsByManifest[manifestURL] = installListRequest.result[installListIndex];
        }

        // TODO this after we try to read it in the helper
        controller.set('installedManifestURLs', installedManifestURLs);
        controller.set('appRecordsByManifest', appRecordsByManifest);
        controller.set('alreadyInstalled', appRecordsByManifest[controller.get('model.manifest_url')]);
      };
    } else {
      controller.set('enableInstallButtons', false);
    }    
  },
  model: function(params) {
    return this.store.find('app', params.app_id);
  },
  actions: {
    error: function(error, transition) {
      console.log('error in app route');
      insertAlert('Cannot fetch app details');
      console.log(error);
      $('.loading').hide();
    }
  }
});

TheCount.FrequencyRoute = Ember.Route.extend({
  setupController: function(controller, data) {
    controller.set('model', data);  
    controller.set('frequencyKind', this.get('frequencyKind'));
    $('.loading').hide();
    document.title = 'TheCount | freq | ' + this.get('frequencyKind');
  },
  model: function(params) {
    this.set('frequencyKind', params.frequency_kind);
    $('.loading').show();

    return Ember.$.getJSON('/frequency/' + params.frequency_kind + middlewareQueryParams());
  },
  actions: {
    error: function(error, transition) {
      console.log('error in frequency route');
      insertAlert('Cannot fetch frequency data');
      console.log(error);
      $('.loading').hide();
    }
  }
});

TheCount.DistributionRoute = Ember.Route.extend({
  setupController: function(controller, data) {
    controller.set('model', data);  
    controller.set('distributionKind', this.get('distributionKind'));
    $('.loading').hide();
    document.title = 'TheCount | dist | ' + this.get('distributionKind');
  },
  model: function(params) {
    this.set('distributionKind', params.distribution_kind);
    $('.loading').show();
    return Ember.$.getJSON('/distribution/' + params.distribution_kind + middlewareQueryParams());
  },
  actions: {
    error: function(error, transition) {
      console.log('error in distribution route');
      insertAlert('Cannot fetch distribution data');
      console.log(error);
      $('.loading').hide();
    }
  }
});

TheCount.PieRoute = Ember.Route.extend({
  setupController: function(controller, data) {
    controller.set('model', data);  
    controller.set('pieKind', this.get('pieKind'));
    $('.loading').hide();
    document.title = 'TheCount | pie | ' + this.get('pieKind');
  },
  model: function(params) {
    this.set('pieKind', params.pie_kind);
    $('.loading').show();
    return Ember.$.getJSON('/pie/' + params.pie_kind + middlewareQueryParams());
  },
  actions: {
    error: function(error, transition) {
      console.log('error in pie route');
      insertAlert('Cannot find pie chart data');
      console.log(error);
      $('.loading').hide();
    }
  }
});

TheCount.TableRoute = Ember.Route.extend({
  setupController: function(controller, data) {
    controller.set('model', data);  
    $('.loading').hide();
    document.title = 'TheCount | packaged by category';
  },
  model: function(params) {
    $('.loading').show();
    return Ember.$.getJSON('/packaged_by_category' + middlewareQueryParams());
  },
  actions: {
    error: function(error, transition) {
      console.log('error in table route');
      insertAlert('Cannot fetch table data');
      console.log(error);
      $('.loading').hide();
    }
  }
});

