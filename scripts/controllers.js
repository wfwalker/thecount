// CONTROLLERS -------------------------------------------------

TheCount.ApplicationController = Ember.Controller.extend({
  search: function() {
    console.log('ApplicationController search ' + this.get("searchText"));
    this.transitionToRoute('apps', 'search', this.get("searchText"));
  }
});

TheCount.AppsController = Ember.ArrayController.extend({
  actions: {
    resort: function(columnName) {
      // do stuff with your data here
      console.log("I AM SORTING NNN" + columnName);
      var listings = this.get('model');
      console.log(listings);
      var resorted = listings.sort(function(a, b) { return a.ratings.count - b.ratings.count });
      this.set('model', resorted);
    }     
  }
});

TheCount.AppController = Ember.ObjectController.extend({
  marketplaceLink: function() {
    return 'http://marketplace.firefox.com/app/' + this.get('model.slug');
  }.property('model.marketplaceLink'),
  isPaidApp: function() {
    return this.get('model.premium_type') == 'premium';
  }.property('model.isPaidApp'),
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
    },
  }
});




