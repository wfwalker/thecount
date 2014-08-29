$(document).ready(function() {
    // http://stackoverflow.com/a/979995/571420
    var QueryString = function () {
      // This function is anonymous, is executed immediately and 
      // the return value is assigned to QueryString!
      var query_string = {};
      var query = window.location.search.substring(1);
      var vars = query.split("&");
      for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
          // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
          query_string[pair[0]] = pair[1];
          // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
          var arr = [ query_string[pair[0]], pair[1] ];
          query_string[pair[0]] = arr;
          // If third or later entry with this name
        } else {
          query_string[pair[0]].push(pair[1]);
        }
      } 
        return query_string;
    } ();

    $('.datepicker').each(function(index, element) {
        $el = $(element);
        $el.datepicker();
        $el.val(QueryString[$el[0].name]);
    });
});

// EMBER STUFF

window.TheCount = Ember.Application.create({
  LOG_TRANSITIONS: true
});

// should be in js/models/app.js
TheCount.App = DS.Model.extend({
  icons: DS.attr(),
  tags: DS.attr(),
  manifest: DS.attr(),
  manifest_url: DS.attr(),
  miniManifest: DS.attr(),
  categories: DS.attr(),
  slug: DS.attr(),
  ratings: DS.attr(),
  created: DS.attr(),
  reviewed: DS.attr(),
  app_type: DS.attr('string'),
  reviewed: DS.attr('string'),
  author: DS.attr('string'),
  is_packaged: DS.attr('boolean'),
  is_offline: DS.attr('boolean'),
  name: DS.attr(),
  device_types: DS.attr(),
  previews: DS.attr(),
  description: DS.attr(),
  appcache_manifest: DS.attr()
});

// should be in js/models/app.js
TheCount.Frequency = DS.Model.extend({
  total: DS.attr(),
  chartData: DS.attr()
});

// VIEWS ------------------------------------------------------------------------

TheCount.frequencyView = Ember.View.extend({
  classNames: ['frequency', 'barchart'],
  didInsertElement: function() {
    console.log('didInsertElement frequency');
    createFrequencyGraph('frequency', 'category', this.get('content'));
  },
  updateChart: function updateChart() {
    console.log('updateChart frequency');
    createFrequencyGraph('frequency', 'category', this.get('content'));
  }.observes('content.@each.value')
});

TheCount.distributionView = Ember.View.extend({
  classNames: ['histogram'],
  didInsertElement: function() {
    console.log('didInsertElement distribution');
    createHistogram(this.get('content'));
  },
  updateChart: function updateChart() {
    console.log('updateChart distribution');
    createHistogram(this.get('content'));
  }.observes('content.@each')
});

// HELPERS!

function addCommasToNumberString(inNumberString) {
  return ('' + inNumberString).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
}

Ember.Handlebars.helper('daysSince', function(property, options) {
  return Math.round((Date.now() - Date.parse(property)) / (24*60*60*1000));
});

Ember.Handlebars.helper('formatNumber', function(property, options) {
  return addCommasToNumberString(property);
});

Ember.Handlebars.helper('json', function(property, options) {
  return JSON.stringify(property, null, 2);
});

Ember.Handlebars.helper('stars', function(property, options) {
  var stars = [];

  for (var index = 5; index > 0; index--) {
    if (property >= index)
      stars.push("<span class='glyphicon glyphicon-star'> </span>");
    else
      stars.push("<span class='glyphicon glyphicon-star-empty' style='color: lightgray'> </span>");    
  }

  return new Handlebars.SafeString(stars.join(''));
});

Ember.Handlebars.helper('appSize', function(app, options) {
  if (app.is_packaged && app.miniManifest && app.miniManifest.size) {
    return addCommasToNumberString(app.miniManifest.size);
  }
  if (app.appcache_entry_sizes) {
    return addCommasToNumberString(app.appcache_size);  
  }
  return 0;
});

// should be in js/router.js
TheCount.Router.map(function() {
  this.resource('apps', { path: '/listing/:listing_kind/:listing_param' });
  this.resource('app', { path: '/app/:app_id'});
  this.resource('frequency', { path: '/frequency/:frequency_kind' });
  this.resource('distribution', { path: '/distribution/:distribution_kind' });
});

TheCount.AppsRoute = Ember.Route.extend({
  model: function(params) {
    return Ember.$.getJSON('/listing/' + params.listing_kind + '/' + params.listing_param);
  }
});

TheCount.AppRoute = Ember.Route.extend({
  setupController: function(controller, app) {
    controller.set('model', app);

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
  }
});

TheCount.FrequencyRoute = Ember.Route.extend({
  model: function(params) {
    return Ember.$.getJSON('/frequency/' + params.frequency_kind);
  }
});

TheCount.DistributionRoute = Ember.Route.extend({
  model: function(params) {
    return Ember.$.getJSON('/distribution/' + params.distribution_kind);
  }
});

TheCount.ApplicationController = Ember.Controller.extend({
  search: function() {
    console.log('ApplicationController search ' + this.get("searchText"));
    this.transitionToRoute('apps', 'search', this.get("searchText"));
  },
});

TheCount.AppController = Ember.ObjectController.extend({
  marketplaceLink: function() {
    return 'http://marketplace.firefox.com/app/' + this.get('model.slug');
  }.property('model.marketplaceLink'),
  actions: {
    install: function() {
      console.log(this.get('model.manifest_url'));

      if (this.get('model.is_packaged')) {
        var request = navigator.mozApps.installPackage(this.get('model.manifest_url'));
        request.onsuccess = installSuccess;
        request.onerror = installFail;
      } else {
        var request = navigator.mozApps.install(this.get('model.manifest_url'));
        request.onsuccess = installSuccess;
        request.onerror = installFail;
      }
    },
    launch: function() {
      console.log('actions.launch ' + this.get('model.manifest_url'));
      var appRecordsByManifest = this.get('appRecordsByManifest');
      console.log('about to launch');
      appRecordsByManifest[this.get('model.manifest_url')].launch(); 
      console.log('launched');
    }
  }
});




