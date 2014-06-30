// hello d3Helpers

function get(prop) {
  return function(d) {
    return d[prop];
  };
}

function createDistributionGraph(inDivClass, chartData) {
	console.log('start createDistributionGraph');
	console.log(chartData);

    x = d3.scale.linear()
        .domain([0, d3.max(chartData, get('val'))])
        .range([0, 80]);

    d3.select('.' + inDivClass)
        .selectAll("div")
            .data(chartData)
        .enter().append("div")
            .attr('class', get('label'))
            .style("width", function(d) { 
                return x(d.val) + "%"; })
        .text(get('val'))
        .append('span')
            .attr('class', 'label')
            .text(get('label'));
}

function createFrequencyGraph(inDivClass, chartData) {
    x = d3.scale.linear()
        .domain([0, d3.max(chartData, get('val'))])
        .range([0, 80]);

    d3.select('.' + inDivClass)
        .selectAll("div")
            .data(chartData)
        .enter().append("div")
            .attr('class', get('label'))
            .style("width", function(d) { 
                return x(d.val) + "%"; })
        .text(get('val'))
        .append('span')
            .attr('class', 'label')
            .text(get('label'));

}

function createHistogram(values) {
    // A formatter for counts.
    var formatCount = d3.format(",.0f");

    var margin = {top: 10, right: 30, bottom: 30, left: 30},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain(d3.extent(values))
        .range([0, width]);
    console.log(d3.extent(values));

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
        .attr("height", function(d) { return height - y(d.y); });

    bar.append("text")
        .attr("dy", ".75em")
        .attr("y", 6)
        .attr("x", (x(data[0].x + data[0].dx) - x(data[0].x)) / 2)
        .attr("text-anchor", "middle")
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
    console.log(data);

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
      .text(function(d) { return d.data.label; });
}

