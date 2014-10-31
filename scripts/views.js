// VIEWS ------------------------------------------------------------------------

TheCount.frequencyView = Ember.View.extend({
  classNames: ['frequency', 'barchart'],
  didInsertElement: function() {
    console.log('didInsertElement frequency');
    createFrequencyGraph('frequency', this.get('kind'), this.get('content'));
  },
  updateChart: function updateChart() {
    console.log('updateChart frequency');
    createFrequencyGraph('frequency', this.get('kind'), this.get('content'));
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
    createHistogram(this.get('content'), this.get('kind'));
  }.observes('content.@each')
});

TheCount.pieView = Ember.View.extend({
  classNames: ['pie'],
  didInsertElement: function() {
    console.log('didInsertElement pie');
    createPieChart(this.get('content'));
  },
  updateChart: function updateChart() {
    console.log('updateChart pie');
    createPieChart(this.get('content'), this.get('kind'));
  }.observes('content.@each.value')
});

// HELPERS!

function addCommasToNumberString(inNumberString) {
  return ('' + inNumberString).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
}

function getDisplayName(nameDictionary) {
  if (nameDictionary['en-US']) {
    return nameDictionary['en-US'];
  } else {
    return nameDictionary[Object.keys(nameDictionary)[0]];
  }  
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

Ember.Handlebars.helper('appName', function(property, options) {
  return getDisplayName(property);
});

Ember.Handlebars.helper('premiumIcon', function(property, options) {
  if (property != 'free') {
    return new Handlebars.SafeString("<span class='glyphicon glyphicon-usd'> </span>");
  } else {
    return '';
  }
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
