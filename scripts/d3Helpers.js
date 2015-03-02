// hello d3Helpers

function get(prop) {
  return function(d) {
    return d[prop];
  };
}

function createFrequencyGraph(inDivClass, inListingKind, data) {
    console.log('frequency kind ' + inListingKind);

    var width = 900,
        outsideLabelThreshold = 200,
        barHeight = 25, 
        formatCount = d3.format(",.0f");

    var x = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.val; })])
        .range([0, width]);

    // nuke the old one
    d3.select("." + inDivClass + " svg").remove();

    var chart = d3.select("." + inDivClass).append("svg")
        .attr("width", width)
        .attr("height", barHeight * data.length);

    var bar = chart.selectAll("g")
        .data(data)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d, i) { return "translate(0," + i * barHeight + ")"; });

    bar.append("rect")
        .attr("width", function(d) { return x(d.val); })
        .attr("height", barHeight - 1)
        .on("mouseover", function(d) {
            d3.select(this).classed('active', true);
        })
        .on("mouseout", function(d) {
            d3.select(this).classed('active', false);
        });

    bar.append('svg:a')
        .attr('xlink:href', function(d) { return '/#/listing/' + inListingKind + '/' + d.label })
    .append("text")
        .attr("x", function(d) { return x(d.val) - 3; })
        .attr("y", barHeight / 2)
        .attr("dx", function(d) { return x(d.val) < outsideLabelThreshold ? "0.7em" : "-0.3em"; })
        .attr("dy", "0.3em")
        .attr("text-anchor", function(d) { return x(d.val) < outsideLabelThreshold ? "start" : "end"; })
        .attr("class", function(d) { return x(d.val) < outsideLabelThreshold ? "label outside-label" : "label"; })
        .text(function(d) { return d.label + " (" + formatCount(d.val) + ")"  });
}

function createHistogram(values, useDateRange) {
    console.log('createHistogram ' + useDateRange);

    var outsideLabelThreshold = 400;

    // A formatter for counts.
    var formatCount = d3.format(",.0f");

    var margin = {top: 10, right: 30, bottom: 30, left: 30},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var extent = d3.extent(values);

    // don't include 0 in xRange if we're doing dates
    if (! useDateRange) {      
        extent[0] = 0;
    }

    var x = d3.scale.linear()
        .domain(extent)
        .range([0, width]);

    console.log(extent);

    // Generate a histogram using twenty uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(20))
        (values);

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    // use date formatting for dates
    if (useDateRange) {
        xAxis.tickFormat(function(d) { var tmp = new Date(d); return (1+ tmp.getMonth()) + "/" + (1900+tmp.getYear()); });
    }

    // nuke the old one
    d3.select(".histogram svg").remove();

    var svg = d3.select(".histogram").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
        .data(data)
      .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].x + data[0].dx) - x(data[0].x) - 1)
        .attr("height", function(d) { return height - y(d.y); })
        .on("mouseover", function(d) {
            d3.select(this).classed('active', true);
        })
        .on("mouseout", function(d) {
            d3.select(this).classed('active', false);
        });

    bar.append("text")
        .attr("x", (x(data[0].x + data[0].dx) - x(data[0].x)) / 2)
        .attr("y", 6)
        .attr("dy", function(d) { return y(d.y) > outsideLabelThreshold? "-1em" : "1em"; })
        .attr("text-anchor", "middle")
        .attr("class", function(d) { return y(d.y) > outsideLabelThreshold? "outside-label label" : "label"; })
        .text(function(d) { return formatCount(d.y); });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
}

// TODO: try bubble chart?
//http://www-958.ibm.com/software/data/cognos/manyeyes/page/Bubble_Chart.html

function createPieChart(data) {
    console.log('create pie');

    // nuke the old one
    d3.select(".pie svg").remove();

    var width = 960,
        height = 500,
        radius = Math.min(width, height) / 2;

    var color = d3.scale.ordinal()
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { return d.val; });

    var svg = d3.select(".pie").append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    data.forEach(function(d) {
        d.val = +d.val;
    });

    var g = svg.selectAll(".arc")
      .data(pie(data))
    .enter().append("g")
      .attr("class", "arc");

    g.append("path")
      .attr("d", arc)
      .style("fill", function(d) { return color(d.data.label); });

    g.append("text")
      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .attr("class", "label")
      .text(function(d) { return d.data.label; });
}

