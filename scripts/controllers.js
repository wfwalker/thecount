// CONTROLLERS -------------------------------------------------

TheCount.ApplicationController = Ember.Controller.extend({
  formDirty: false,
  actions: {
    search: function() {
      console.log('ApplicationController search ' + this.get("searchText"));
      return this.transitionToRoute('apps', 'search', this.get("searchText"));
    }
  }
});

TheCount.MyTextField = Ember.TextField.extend({
  formDirtyBinding: 'TheCount.ApplicationController.formDirty',
  classNames: ['form-control'],
  attributeBindings: ['size'],
  controller: TheCount.ApplicationController,
  size: 10,
  value: '',
  valueChanged: function() {
    this.set('formDirty', !Ember.empty(this.value));
    console.log('MyTextField', 'valueChanged', this.value);
  }.observes('value')
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
  fullLaunchPath: function() {
  }.property('model.fullLaunchPath'),  
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
    pictureModal: function(argument) {
      console.log('picture Modal!', argument);
      $('#screenshot').attr('src', argument);
      $('#screenshot-modal').modal();
    },
    launch: function() {
      console.log('actions.launch ' + this.get('model.manifest_url'));
      var appRecordsByManifest = this.get('appRecordsByManifest');
      console.log('about to launch');
      appRecordsByManifest[this.get('model.manifest_url')].launch(); 
      console.log('launched');
    },
    launchInTab: function() {
      var parser = document.createElement('a');

      parser.href = this.get('model.manifest_url');
      if (this.get('model.manifest.launch_path')) {
        parser.pathname = this.get('model.manifest.launch_path');
      } else {
        parser.pathname = '';
      }

      window.open(
        decodeURIComponent(parser.href),
        'appname',
        'width=240,height=320');
    }
  }
});




