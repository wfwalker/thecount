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