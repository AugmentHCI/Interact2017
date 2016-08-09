/*jshint esversion: 6 */

(function () {
    'use strict';

    var width = window.innerWidth,
        height = window.innerHeight;

    var topMargin = 20,
        rectangleWidth = 130,
        rectangleHeight = 40,
        imageSize = 30;

    var t = d3.transition()
        .duration(1000);

    var svg = d3.select('body').append('svg');
    svg.attr('width', width)
        .attr('height', height);

    var backgroundLayer = svg.append('svg');
    backgroundLayer
        .attr("class", "backgroundLayer")
        .attr('width', width)
        .attr('height', height);

    var textLayer = svg.append('svg');
    textLayer
        .attr("class", "textLayer")
        .attr('width', width)
        .attr('height', height);

    d3.json('data/dosageregimen.json', function (error, data) {

        var totalWeight = _.reduce(data, function(memo, el){ return memo + el.weight; }, 0);
        var columnWidth = width / totalWeight;

        var tempIndex = 0;
        for(var i = 0; i < data.length; i++) {
            data[i].startIndex = tempIndex;
            tempIndex += data[i].weight;
        }

        var headers = textLayer.selectAll("text.headers").data(data, d => d.name);

        headers.exit()
            .attr("class", "exit")
          .transition(t)
            .style("fill-opacity", 1e-6)
            .remove();

        var headerGroup = headers.enter().append("g")
            .attr("class", "headerGroup")
            .attr("transform", d =>
                "translate(" + (d.startIndex * columnWidth + (d.weight *  columnWidth)/2) + "," + topMargin + ")");

        headerGroup.append("text")
            .attr("class", "headers")
            .attr("dy", ".35em")
            .style("fill-opacity", 1e-6)
            .style("text-anchor", "middle")
            .text(d => d.value)
          .transition(t)
            .style("fill-opacity", 1);

        headerGroup.append("svg:image")
            .attr('width', imageSize)
            .attr('height', imageSize)
            .attr("x", -imageSize/2)
            .attr("y", imageSize/2)
            .attr("xlink:href",d => {
                if (d.icon !== undefined) {
                    return "images/periods/" + d.key + ".png";
                } // no image available.
            });

        var auxLines = textLayer.selectAll("line.auxLine").data(data, d => d.name);

        auxLines.exit()
            .attr("class", "exit")
          .transition(t)
            .style("fill-opacity", 1e-6)
            .remove();

        auxLines.enter().append("line")
            .attr("class", "auxLine")
            .attr("stroke-width", 2)
            .attr("stroke", "grey")
            .attr("x1", d => d.startIndex * columnWidth - 1)
            .attr("y1", 0)
            .attr("x2", d => d.startIndex * columnWidth - 1)
            .attr("y2", height);

        setInterval(update, 1000);
        update();
        function update() {
            d3.json('data/locations.json', function (error, locations) {

                var bannerHeight = height/(locations.length+1);

                // order medication boxes from top to bottom
                var topToBottomLocations = _.sortBy(locations, l => l.center[1]);


                /////////////////////////////////////////
                // grey banners to differentiate rows  //
                /////////////////////////////////////////
                var backgroundBanners = backgroundLayer.selectAll("rect.backgroundBanners").data(topToBottomLocations, l => l.id);

                backgroundBanners.exit()
                    .attr("class", "exit")
                  .transition(t)
                    .style("fill-opacity", 1e-6)
                    .remove();

                backgroundBanners
                  .transition(t)
                    .attr("y", d => d.center[1] - bannerHeight/2);

                backgroundBanners.enter().append("rect")
                    .attr("class", "backgroundBanners")
                    .attr("x", 0)
                    .attr("y", d => d.center[1] - bannerHeight/2)
                    .attr("width", width)
                    .attr("height", d => {
                        return d3.max([bannerHeight, d.radius]);
                    })
                    .style('fill', (d,i) => i % 2 === 0 ? "darkgrey" : "black");


                /////////////////////////////////////////
                // aux box to see location medication  //
                /////////////////////////////////////////
                var medBoxes = backgroundLayer.selectAll("rect.medBoxes").data(topToBottomLocations, l => l.id);

                medBoxes.exit()
                    .attr("class", "exit")
                  .transition(t)
                    .style("fill-opacity", 1e-6)
                    .remove();

                medBoxes
                  .transition(t)
                    .attr("x", d => d.center[0])
                    .attr("y", d => d.center[1]);

                medBoxes.enter().append("rect")
                    .attr("class", "medBoxes")
                    .attr("x", d => d.center[0])
                    .attr("y", d => d.center[1])
                    .attr("width", rectangleWidth)
                    .attr("height", rectangleHeight)
                    .style('fill', "white");
            });

        }
    });
}());