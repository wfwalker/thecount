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

// PARSE CATALOG metadata

var marketplaceCatalog = {};

try {
    console.log('About to Parse Catalog');

    // parse the giant apps.json created by thecount.js command-line tool
    var marketplaceCatalog = require('./apps.json');
    console.log('loaded ' + Object.keys(marketplaceCatalog).length + ' apps');
    console.log('parsed catalog'); 
}
catch (e) {
    console.log('error parsing catalog');
    console.log(e);
}

// Set the view engine to use Jade templates
app.set('view engine', 'jade');

// Set the directory that contains the Jade views
app.set('views', __dirname + '/views');

// ROUTING PARAMETERS

// deal with an app_id parameter in a REST route by retrieving an app by its numeric ID

app.param('app_id', function(req, resp, next, id) {
	var appID = parseInt(req.param('app_id'));
	console.log('app_id ' + appID);
	req.appData = marketplaceCatalog[appID];
	next();
});

// deal with an author parameter in a REST route by retrieving all the apps whose author is the given string

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

// deal with an num_ratings parameter by retrieving all the apps that have at least that many user ratings

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

// deal with a library parameter by retrieving all the apps that use the given JS/CSS library (i. e., jQuery)

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

// deal with a days_old parameter by retrieving all the apps that were published within that many days

app.param('days_old', function(req, resp, next, id) {
    var days_old = req.param('days_old')
    console.log('days_old ' + days_old);
    var apps = [];

    for (index in marketplaceCatalog) {
        var app = marketplaceCatalog[index];
        if (statistics.getDaysOld(app) < days_old) {
            apps.push(app);
        }
    }

    req.days_old = days_old;
    req.apps = apps;
    next();
});

// This data structure defines all the routes for analytics in TheCount, their paths, their getter functions

var graphs = [
    { kind: 'distribution', routeFragment: 'rating_count', title: 'num ratings', getter: statistics.getRatingCount },
    { kind: 'distribution', routeFragment: 'rating', title: 'avg rating', getter: statistics.getAverageRating },
    { kind: 'distribution', routeFragment: 'package_size', title: 'package size', getter: statistics.getPackageSize },
    { kind: 'frequency', routeFragment: 'icon_sizes', title: 'icon sizes', getter: statistics.getIconSizes },
    { kind: 'frequency', routeFragment: 'library', title: 'library', getter: statistics.getLibraryNames },
    { kind: 'frequency', routeFragment: 'category', title: 'category', getter: statistics.getCategoryStrings },
    { kind: 'frequency', routeFragment: 'author', title: 'author', getter: statistics.getAuthor },
    { kind: 'frequency', routeFragment: 'locale', title: 'locale', getter: statistics.getSupportedLocales },
    { kind: 'frequency', routeFragment: 'region', title: 'region', getter: statistics.getSupportedRegions },
    { kind: 'frequency', routeFragment: 'permission', title: 'permission', getter: statistics.getPermissionKeys },
    { kind: 'frequency', routeFragment: 'activity', title: 'activity', getter: statistics.getActivityKeys },
    { kind: 'pie', routeFragment: 'installs_allowed_from', title: 'installs allowed from', getter: statistics.getInstallsAllowedFrom }
]

// route requests to retrieve a single app by ID

app.get('/app/:app_id', function(req, resp, next) {
    resp.render('appdetail',
        { graphsMenu: graphs, title : req.appData.author, appData: req.appData }
    );
});

// route requests to retrieve apps by author

app.get('/listing/author/:author', function(req, resp, next) {
    resp.render('applisting',
        { apps: req.apps, graphsMenu: graphs, title: 'author ' + req.author }
    );
});

// route requests to retrieve apps by number of user ratings

app.get('/listing/num_ratings/:num_ratings', function(req, resp, next) {
    resp.render('applisting',
        { apps: req.apps, graphsMenu: graphs, title: 'num_ratings ' + req.num_ratings }
    );
});

// route requests to retrieve apps by which library they use

app.get('/listing/library/:library', function(req, resp, next) {
    resp.render('applisting',
        { apps: req.apps, graphsMenu: graphs, title: 'library ' + req.library }
    );
});

// route requests to retrieve apps by how old they are

app.get('/listing/days_old/:days_old', function(req, resp, next) {
    resp.render('applisting',
        { apps: req.apps, graphsMenu: graphs, title: 'days_old ' + req.days_old }
    );
});

// route requests to get the homepage (TODO: make this work for '/')

app.get('/home', function(req, resp, next) {
    resp.render('home',
        { graphsMenu: graphs, title: 'home' }
    );
});

// helper functions to add GET route for the given entry in the data structure

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

// read through the list of routes and add them to the router using the above helper functions

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


