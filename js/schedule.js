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
        .defer(d3.json, "data/druginfo.json")
        .await(draw);

    function draw(error, dosageregimen, healthFile, druginfo) {
        if (error) {
            console.log(error);
        }



        var lastMod = 0;

        var previousLocations = [];

        setInterval(update, 1000);
        update();
        function update() {
            function schedule(locations) {
/////////////////////////////////////////
                // Sort and integrate dosage regimen   //
                /////////////////////////////////////////
                var topToBottomLocations = _.sortBy(locations, l => l.center[1]);
                for (var i = 0; i < topToBottomLocations.length; i++) {
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
                var bannerHeight = height / (locations.length + 1);

                var backgroundBanners = backgroundLayer.selectAll("rect.background-banner").data(topToBottomLocations, l => l.id);

                backgroundBanners.exit()
                    .attr("class", "exit")
                    .transition(t)
                    .style("fill-opacity", 1e-6)
                    .remove();

                backgroundBanners
                    .transition(t)
                    .attr("y", d => d.center[1] - bannerHeight / 2 + rectangleHeight / 2);

                backgroundBanners.enter().append("rect")
                    .attr("class", "background-banner")
                    .attr("x", 0)
                    .attr("y", d => d.center[1] - bannerHeight / 2 + rectangleHeight / 2)
                    .attr("width", width)
                    .attr("height", d => {
                        return d3.max([bannerHeight, d.radius]);
                    })
                    .style("fill", (d, i) => i % 2 === 0 ? "darkgrey" : "black");


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
                    var drx = dr.startIndex * columnWidth + (dr.weight * columnWidth) / 2;

                    // append the actual text
                    textGroup.append("text")
                        .each(function (d) {
                            for (var i = 0; i < d.info.length; i++) {
                                d3.select(this).append("tspan")
                                    .text(d.info[i][dr.key])
                                    .attr("y", rectangleHeight / 2)
                                    .attr("dy", i ? i * imageSize : 0)
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
                            var startX = drx - ((totalPills / 2) * (imageSize + padding));
                            for (i = 0; i < totalPills; i++) {
                                d3.select(this).append("svg:image")
                                    .attr("width", imageSize)
                                    .attr("height", imageSize)
                                    .attr("id", i)
                                    .attr("x", (startX + i * (imageSize + padding) ))
                                    .attr("y", -2 * imageSize + rectangleHeight / 2)
                                    .attr("xlink:href", d => {
                                        if (dr.showIcon !== undefined && d.icon !== undefined) {
                                            return "images/pills/" + d.icon + ".png";
                                        }
                                    });
                            }
                        });
                });
            }

            d3.json("data/ram/locations.json?nocache=" + (new Date()).getTime(), function (error, locations) {
                if (error) {
                    console.log(error);
                }

                if (locations[0].timestap <= lastMod) {
                    return;
                }

                var similar = true;
                for (var i = 0; i < locations.length && similar && previousLocations.length !== 0; i++) {
                    var loc = locations[i];
                    var prev = _.findWhere(previousLocations, {id: loc.id});
                    if (loc.center[0] > prev.center[0] + 20 || loc.center[0] < prev.center[0] - 20) {
                        similar = false;
                    }
                    if (loc.center[1] > prev.center[1] + 20 || loc.center[1] < prev.center[1] - 20) {
                        similar = false;
                    }
                }
                if(similar && previousLocations.length !== 0) {
                    return;
                }
                previousLocations = locations;

                if (error) {
                    console.log(error);
                }

                druginfo.forEach(info => {
                    _.extend(_.findWhere(locations, {id: info.id}), info);
                });
                schedule(locations);
            });
        }
    }
}(d3, d3.queue()));