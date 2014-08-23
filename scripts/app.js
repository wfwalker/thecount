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
  ratings: DS.attr(),
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

TheCount.frequencyView = Ember.View.extend({
  classNames: ['frequency', 'barchart'],
  didInsertElement: function() {
    console.log('did insert element ' + this.get('elementId'));
    console.log('data ' + this.get('content'));
    // createFrequencyGraph('frequency', 'category', [{"label":"games","val":1660},{"label":"entertainment","val":1070},{"label":"utilities","val":968},{"label":"education","val":524},{"label":"productivity","val":505},{"label":"lifestyle","val":405},{"label":"news-weather","val":384},{"label":"social","val":282},{"label":"travel","val":252},{"label":"business","val":231},{"label":"reference","val":196},{"label":"music","val":193},{"label":"health-fitness","val":183},{"label":"maps-navigation","val":162},{"label":"sports","val":144},{"label":"photo-video","val":119},{"label":"books","val":108},{"label":"shopping","val":80}]);
    createFrequencyGraph('frequency', 'category', this.get('content'));
  }
});

TheCount.distributionView = Ember.View.extend({
  classNames: ['histogram'],
  didInsertElement: function() {
    console.log('did insert element ' + this.get('elementId'));
    console.log('data ' + this.get('content'));
    createHistogram(this.get('content'));
  }
});


// HELPERS!

Handlebars.registerHelper('daysSince', function(property, options) {
  // for some reason I had to do this:
  // http://stackoverflow.com/questions/12366848/handlebar-helper-inside-each
  var dateString = Ember.get(options.data.view.content, property);
  return Math.round((Date.now() - Date.parse(dateString)) / (24*60*60*1000));
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




