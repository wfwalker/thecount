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
  app_type: DS.attr('string'),
  author: DS.attr('string')
});

// should be in js/router.js -- THIS WORKS
TheCount.Router.map(function() {
  this.resource('apps');
  this.resource('app', { path: '/app/:app_id'});
});

TheCount.AppsRoute = Ember.Route.extend({
  model: function() {
    return this.store.find('app');
  }
});

TheCount.AppRoute = Ember.Route.extend({
  model: function(params) {
    return this.store.find('app', params.app_id);
  }
});



