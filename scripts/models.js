//MODELS

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
  last_updated: DS.attr(),
  reviewed: DS.attr(),
  app_type: DS.attr('string'),
  reviewed: DS.attr('string'),
  author: DS.attr('string'),
  is_packaged: DS.attr('boolean'),
  is_offline: DS.attr('boolean'),
  name: DS.attr(),
  device_types: DS.attr(),
  previews: DS.attr(),
  premium_type: DS.attr('string'),
  description: DS.attr(),
  appcache_manifest: DS.attr()
});

// should be in js/models/app.js
TheCount.Frequency = DS.Model.extend({
  total: DS.attr(),
  chartData: DS.attr()
});

TheCount.Distribution = DS.Model.extend({
  total: DS.attr(),
  values: DS.attr()
});

// TheCount.Table = DS.Model.extend({
// });
