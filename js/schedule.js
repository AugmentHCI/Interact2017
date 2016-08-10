/*jshint esversion: 6 */

(function (d3,queue) {
    "use strict";

    var width = window.innerWidth,
        height = window.innerHeight;

    var topMargin = 20,
        rectangleWidth = 130,
        rectangleHeight = 40,
        imageSize = 30;

    var t = d3.transition()
        .duration(1000);

    var svg = d3.select("body").append("svg");
    svg.attr("width", width)
        .attr("height", height);

    var backgroundLayer = svg.append("svg");
    backgroundLayer
        .attr("class", "backgroundLayer")
        .attr("width", width)
        .attr("height", height);

    var textLayer = svg.append("svg");
    textLayer
        .attr("class", "textLayer")
        .attr("width", width)
        .attr("height", height);

    queue
        .defer(d3.json, "data/dosageregimen.json")
        .defer(d3.json, "data/janedoe.json") // geojson points
        .await(draw);

    function draw(error, dosageregimen, healthFile) {    // d3.json("data/dosageregimen.json", function (error, data) {
        if (error) {
            console.log(error);
        }

        var totalWeight = _.reduce(dosageregimen, function(memo, el){ return memo + el.weight; }, 0);
        var columnWidth = width / totalWeight;

        var tempIndex = 0;
        for(var i = 0; i < dosageregimen.length; i++) {
            dosageregimen[i].startIndex = tempIndex;
            tempIndex += dosageregimen[i].weight;
        }

        var headers = textLayer.selectAll("text.headers").data(dosageregimen, d => d.name);

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
            .attr("width", imageSize)
            .attr("height", imageSize)
            .attr("x", -imageSize/2)
            .attr("y", imageSize/2)
            .attr("xlink:href",d => {
                if (d.icon !== undefined) {
                    return "images/periods/" + d.key + ".png";
                } // no image available.
            });

        var auxLines = textLayer.selectAll("line.auxLine").data(dosageregimen, d => d.name);

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
            d3.json("data/locations.json", function (error, locations) {
                if (error) {
                    console.log(error);
                }

                var bannerHeight = height/(locations.length+1);

                /////////////////////////////////////////
                // Sort and integrate dosage regimen   //
                /////////////////////////////////////////
                var topToBottomLocations = _.sortBy(locations, l => l.center[1]);
                for(var i = 0; i < topToBottomLocations.length; i++) {
                    var loc = topToBottomLocations[i];
                    loc.info = [];
                    healthFile.episodes.forEach(episode => {
                        episode.medications.forEach(med => {
                            if (loc.name === med.name) {
                                loc.info.push(med);
                            }
                        });
                    });
                }

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
                    .style("fill", (d,i) => i % 2 === 0 ? "darkgrey" : "black");


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
                    .style("fill", "white");


                /////////////////////////////////////////
                // add the actual dosage regimen text  //
                /////////////////////////////////////////
                var textGroups = textLayer.selectAll("g.textGroup").data(topToBottomLocations, loc => loc.name);

                textGroups.exit()
                    .attr("class", "exit")
                  .transition(t)
                    .style("fill-opacity", 1e-6)
                    .remove();

                textGroups
                  .transition(t)
                    .attr("transform", d => "translate(0," + d.center[1] + ")");

                var textGroup = textGroups.enter()
                    .append("g")
                    .attr("class", "textGroup")
                    .attr("transform", d => "translate(0," + d.center[1] + ")");

                dosageregimen.forEach(dr => {
                    var drx = dr.startIndex * columnWidth + (dr.weight *  columnWidth)/2;
                    textGroup.append("text")
                        .each(function (d) {
                            var arr = d.info;
                            for (i = 0; i < arr.length; i++) {
                                d3.select(this).append("tspan")
                                    .text(arr[i][dr.key])
                                    .attr("dy", i ? "1.2em" : 0)
                                    .attr("x", drx)
                                    .style("text-anchor", "middle")
                                    .style("fill", "white")
                                    .attr("class", "tspan" + i);
                            }
                        });

                    textGroup.append("svg:image")
                        .attr("width", imageSize)
                        .attr("height", imageSize)
                        .attr("x",drx)
                        .attr("y", -2*imageSize)
                        .attr("xlink:href",d => {
                            if (dr.showIcon !== undefined && d.icon !== undefined) {
                                var totalPills = _.reduce(d.info, function(memo, el){
                                    if (el[dr.key] !== undefined) {
                                        return memo + el[dr.key];
                                    } else {
                                        return memo;
                                    }
                                }, 0);
                                if (totalPills > 0) {
                                    return "images/pills/" + d.icon + ".png";
                                }
                            } // no image available.
                        });
                });
            });
        }
    }

}(d3, d3.queue()));