// server.js

/**
 * Module dependencies.
 */

// INITIALIZE

var express = require('express');
var url = require('url');
var http = require('http');
var https = require('https');
var jade = require('jade');

var app = express();

var statistics = require('./statistics.js');

// CONFIGURE SERVER

// statically serve up some assets
app.use("/images", express.static('images'));
app.use("/scripts", express.static('scripts'));
app.use("/stylesheets", express.static('stylesheets'));

// LAUNCH SERVER

var myPort = process.env.PORT || 8080;
var mHost = process.env.VCAP_APP_HOST || "127.0.0.1";

app.listen(myPort);

console.log("running " + mHost + " " + myPort);

// PARSE CATALOG

var marketplaceCatalog = {};

try {
    console.log('About to Parse Catalog');
    var marketplaceCatalog = require('./apps.json');
    console.log('loaded ' + Object.keys(marketplaceCatalog).length + ' apps');
    console.log('parsed catalog'); 
}
catch (e) {
    console.log('error parsing catalog');
    console.log(e);
}

// Set the view engine
app.set('view engine', 'jade');

// Set the directory that contains the views
app.set('views', __dirname + '/views');

app.param('app_id', function(req, resp, next, id) {
	var appID = parseInt(req.param('app_id'));
	console.log('app_id ' + appID);
	req.appData = marketplaceCatalog[appID];
	next();
});

app.param('author', function(req, resp, next, id) {
    var author = req.param('author')
    console.log('author ' + author);
    var apps = [];

    for (index in marketplaceCatalog) {
        var app = marketplaceCatalog[index];
        if (app.author == author) {
            apps.push(app);
        }
    }

    req.author = author;
    req.apps = apps;
    next();
});

app.param('num_ratings', function(req, resp, next, id) {
    var num_ratings = req.param('num_ratings')
    console.log('num_ratings ' + num_ratings);
    var apps = [];

    for (index in marketplaceCatalog) {
        var app = marketplaceCatalog[index];
        if (app.ratings && app.ratings.count > num_ratings) {
            apps.push(app);
        }
    }

    req.num_ratings = num_ratings;
    req.apps = apps;
    next();
});

app.param('library', function(req, resp, next, id) {
    var library = req.param('library')
    console.log('library ' + library);
    var apps = [];

    for (index in marketplaceCatalog) {
        var app = marketplaceCatalog[index];
        if (statistics.getLibraryNames(app).indexOf(library) >= 0) {
            apps.push(app);
        }
    }

    req.library = library;
    req.apps = apps;
    next();
});


// addTwoDeeTable(theScope, getTypeAndRating, 'twodee');

var graphs = [
    { kind: 'distribution', routeFragment: 'rating_count', title: 'num ratings', getter: statistics.getRatingCount },
    { kind: 'distribution', routeFragment: 'rating', title: 'avg rating', getter: statistics.getAverageRating },
    { kind: 'distribution', routeFragment: 'package_size', title: 'package size', getter: statistics.getPackageSize },
    { kind: 'frequency', routeFragment: 'library', title: 'library', getter: statistics.getLibraryNames },
    { kind: 'frequency', routeFragment: 'category', title: 'category', getter: statistics.getCategoryStrings },
    { kind: 'frequency', routeFragment: 'author', title: 'author', getter: statistics.getAuthor },
    { kind: 'frequency', routeFragment: 'locale', title: 'locale', getter: statistics.getSupportedLocales },
    { kind: 'frequency', routeFragment: 'region', title: 'region', getter: statistics.getSupportedRegions },
    { kind: 'frequency', routeFragment: 'permission', title: 'permission', getter: statistics.getPermissionKeys },
    { kind: 'frequency', routeFragment: 'activity', title: 'activity', getter: statistics.getActivityKeys },
    { kind: 'pie', routeFragment: 'installs_allowed_from', title: 'installs allowed from', getter: statistics.getInstallsAllowedFrom }
]

app.get('/app/:app_id', function(req, resp, next) {
    resp.render('appdetail',
        { graphsMenu: graphs, title : req.appData.author, appData: req.appData }
    );
});

app.get('/listing/author/:author', function(req, resp, next) {
    resp.render('applisting',
        { apps: req.apps, graphsMenu: graphs, title: 'author ' + req.author }
    );
});

app.get('/listing/num_ratings/:num_ratings', function(req, resp, next) {
    resp.render('applisting',
        { apps: req.apps, graphsMenu: graphs, title: 'num_ratings ' + req.num_ratings }
    );
});

app.get('/listing/library/:library', function(req, resp, next) {
    resp.render('applisting',
        { apps: req.apps, graphsMenu: graphs, title: 'library ' + req.library }
    );
});


app.get('/home', function(req, resp, next) {
    resp.render('home',
        { graphsMenu: graphs, title: 'home' }
    );
});

function privateAddDistributionRoute(aGraph) {
    app.get('/distribution/' + aGraph.routeFragment, function(req, resp, next) {
        resp.render('distribution',
            { graphsMenu: graphs, title: aGraph.title, values: statistics.getValues(marketplaceCatalog, aGraph.getter) }
        );
    });
}

function privateAddFrequencyRoute(aGraph) {
    app.get('/frequency/' + aGraph.routeFragment, function(req, resp, next) {
        resp.render('frequency',
            { graphsMenu: graphs, title: aGraph.title, chartData: statistics.getFrequency(marketplaceCatalog, aGraph.getter, 20) }
        );
    });
}

function privateAddPieRoute(aGraph) {
    app.get('/pie/' + aGraph.routeFragment, function(req, resp, next) {
        resp.render('pie',
            { graphsMenu: graphs, title: aGraph.title, chartData: statistics.getFrequency(marketplaceCatalog, aGraph.getter, 20) }
        );
    });
}

// read through the list of graphs and add them to the menu
for(var graphIndex = 0; graphIndex < graphs.length; graphIndex++) {
    var aGraph = graphs[graphIndex];

    if (aGraph.kind == 'distribution') {
        privateAddDistributionRoute(aGraph);
    } else if (aGraph.kind == 'pie') {
        privateAddPieRoute(aGraph);
    } else {
        privateAddFrequencyRoute(aGraph);
    }
}

