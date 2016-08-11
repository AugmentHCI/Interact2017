/*jshint esversion: 6 */

(function (d3,queue) {
    "use strict";

    var width = window.innerWidth,
        height = window.innerHeight;

    var padding = 5,
        topMargin = 20,
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
        .attr("class", "background-layer")
        .attr("width", width)
        .attr("height", height);

    var textLayer = svg.append("svg");
    textLayer
        .attr("class", "text-layer")
        .attr("width", width)
        .attr("height", height);

    queue
        .defer(d3.json, "data/dosageregimen.json")
        .defer(d3.json, "data/janedoe.json")
        .await(draw);

    function draw(error, dosageregimen, healthFile) {
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

        var headers = textLayer.selectAll("text.header").data(dosageregimen, d => d.name);

        headers.exit()
            .attr("class", "exit")
          .transition(t)
            .style("fill-opacity", 1e-6)
            .remove();

        var headerGroup = headers.enter().append("g")
            .attr("class", "header-group")
            .attr("transform", d =>
                "translate(" + (d.startIndex * columnWidth + (d.weight *  columnWidth)/2) + "," + topMargin + ")");

        headerGroup.append("text")
            .attr("class", "header")
            .attr("dy", ".35em")
            .text(d => d.value);

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

        var auxLines = textLayer.selectAll("line.aux-line").data(dosageregimen, d => d.name);

        auxLines.exit()
            .attr("class", "exit")
          .transition(t)
            .style("fill-opacity", 1e-6)
            .remove();

        auxLines.enter().append("line")
            .attr("class", "aux-line")
            .attr("x1", d => d.startIndex * columnWidth - 1)
            .attr("y1", 0)
            .attr("x2", d => d.startIndex * columnWidth - 1)
            .attr("y2", height);

        var subLines = textLayer.selectAll("line.sub-line").data(dosageregimen, d => d.name);

        subLines.exit()
            .attr("class", "exit")
            .transition(t)
            .style("fill-opacity", 1e-6)
            .remove();

        subLines.enter().each(function(d) {
            if(d.subdivision !== undefined) {
                var nbLines = d.subdivision;
                console.log(d.subdivision);
                for (var i = 1; i < d.subdivision; i++) {
                    d3.select(this).append("line")
                        .attr("class", "sub-line")
                        .attr("x1", d.startIndex * columnWidth - 1 + i*columnWidth/nbLines)
                        .attr("y1", (imageSize+padding) *2)
                        .attr("x2", d.startIndex * columnWidth - 1 + i*columnWidth/nbLines)
                        .attr("y2", height);
                }
            }
        });

        setInterval(update, 1000);
        update();
        function update() {
            d3.json("data/locations.json", function (error, locations) {
                if (error) {
                    console.log(error);
                }

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
                var bannerHeight = height/(locations.length+1);

                var backgroundBanners = backgroundLayer.selectAll("rect.background-banner").data(topToBottomLocations, l => l.id);

                backgroundBanners.exit()
                    .attr("class", "exit")
                  .transition(t)
                    .style("fill-opacity", 1e-6)
                    .remove();

                backgroundBanners
                  .transition(t)
                    .attr("y", d => d.center[1] - bannerHeight/2 + rectangleHeight/2);

                backgroundBanners.enter().append("rect")
                    .attr("class", "background-banner")
                    .attr("x", 0)
                    .attr("y", d => d.center[1] - bannerHeight/2 + rectangleHeight/2)
                    .attr("width", width)
                    .attr("height", d => {
                        return d3.max([bannerHeight, d.radius]);
                    })
                    .style("fill", (d,i) => i % 2 === 0 ? "darkgrey" : "black");


                /////////////////////////////////////////
                // aux box to see location medication  //
                /////////////////////////////////////////
                var medBoxes = backgroundLayer.selectAll("rect.med-box").data(topToBottomLocations, l => l.id);

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
                    .attr("class", "med-box")
                    .attr("x", d => d.center[0])
                    .attr("y", d => d.center[1])
                    .attr("width", rectangleWidth)
                    .attr("height", rectangleHeight);

                /////////////////////////////////////////
                // add the actual dosage regimen text  //
                /////////////////////////////////////////
                var textGroups = textLayer.selectAll("g.text-group").data(topToBottomLocations, loc => loc.name);

                textGroups.exit()
                    .attr("class", "exit")
                  .transition(t)
                    .style("fill-opacity", 1e-6)
                    .remove();

                textGroups
                  .transition(t)
                    .attr("transform", d => "translate(0," + d.center[1] + ")");

                var textGroup = textGroups.enter().append("g")
                    .attr("class", "text-group")
                    .attr("transform", d => "translate(0," + d.center[1] + ")");

                dosageregimen.forEach(dr => {
                    var drx = dr.startIndex * columnWidth + (dr.weight *  columnWidth)/2;

                    // append the actual text
                    textGroup.append("text")
                        .each(function (d) {
                            for (i = 0; i < d.info.length; i++) {
                                d3.select(this).append("tspan")
                                    .text(d.info[i][dr.key])
                                    .attr("y", rectangleHeight/2)
                                    .attr("dy", i ? i*imageSize : 0)
                                    .attr("x", drx)
                                    .attr("class", "dosage-text");
                            }
                        });

                    // append the images of pills if available
                    textGroup
                        .each(function (d) {
                            var totalPills = _.reduce(d.info, function (memo, el) {
                                if (el[dr.key] !== undefined) {
                                    return memo + el[dr.key];
                                } else {
                                    return memo;
                                }
                            }, 0);
                            var startX = drx - ((totalPills/2)*(imageSize+padding));
                            for (i = 0; i < totalPills; i++) {
                                d3.select(this).append("svg:image")
                                    .attr("width", imageSize)
                                    .attr("height", imageSize)
                                    .attr("id", i)
                                    .attr("x", (startX + i * (imageSize + padding) ))
                                    .attr("y",  -2*imageSize + rectangleHeight/2)
                                    .attr("xlink:href",  d => {
                                        if (dr.showIcon !== undefined && d.icon !== undefined) {
                                            return "images/pills/" + d.icon + ".png";
                                        }
                                    });
                            }
                        });
                });
            });
        }
    }
}(d3, d3.queue()));