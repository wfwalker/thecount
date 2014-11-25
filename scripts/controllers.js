// CONTROLLERS -------------------------------------------------

TheCount.ApplicationController = Ember.Controller.extend({
  search: function() {
    console.log('ApplicationController search ' + this.get("searchText"));
    this.transitionToRoute('apps', 'search', this.get("searchText"));
  }
});

TheCount.AppsController = Ember.ArrayController.extend({
  model: [],
  sortProperties: ['name.en-US'],
  sortAscending: true,
  actions: {
    resort: function(fieldName) {
      // do stuff with your data here
      console.log("I AM SORTING " + fieldName);
      this.set('sortProperties', [fieldName]);
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




