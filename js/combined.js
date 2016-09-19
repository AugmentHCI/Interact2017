/*jshint esversion: 6 */

(function (d3, queue) {
    "use strict";

    ///////////////////////////////////////////
    var debug = false;
    var ModeEnum = Object.freeze({"init":1, "interactions":2, "schedule":3, "sideEffects": 4});
    ///////////////////////////////////////////

    var tickTime = 150;

    var xStart = 200,
        yStart = 70,
        xEnd = 1750,
        yEnd = 900;

    var padding = 5,
        topMargin = 20,
        rectangleWidth = 130,
        rectangleHeight = 40,
        radiusWidth = 20,
        negativeBuffer = -400,
        imageSize = 40,
        xValue = 300,
        yValue = 200,
        backgroundBannerHeight = 200;

    var camFieldWidth = xEnd - xStart,
        camFieldHeight = yEnd - yStart,
        wMul = window.innerWidth / camFieldWidth,
        hMul = window.innerHeight / camFieldHeight,
        width = window.innerWidth,
        height = window.innerHeight;

    var t = d3.transition()
        .duration(750);

    var importedNode,
        lastMod = 0,
        previousLocations = [],
        rectangleDrawn = false,
        previousMode = ModeEnum.init;

    var svg = d3.select("body").append("svg");
    svg.attr("width", width)
        .attr("height", height);

    var layer1 = svg.append("svg");
    layer1
        .attr("class", "background-layer")
        .attr("width", width)
        .attr("height", height);

    var layer2 = svg.append("svg");
    layer2
        .attr("class", "text-layer")
        .attr("width", width)
        .attr("height", height);

    var layer3 = svg.append("svg");
    layer3
        .attr("class", "icon-layer")
        .attr("width", width)
        .attr("height", height);

    //Import the plane
    d3.xml("images/icons/person.svg").mimeType("image/svg+xml").get(function(error, xml) {
        if (error) {console.log(error); return;}
        importedNode = document.importNode(xml.documentElement, true);
    });

    queue
        .defer(d3.json, "data/druginfo.json")
        .defer(d3.json, "data/janedoe.json")
        .defer(d3.json, "data/dosageregimen.json")
        .await(draw);

    function draw(error, drugInfo, healthFile, dosageRegimen) {
        if(error) {
            console.log(error);
        }

        var nbEpisodes = healthFile.episodes.length;
        var episodeStartX = (width - rectangleWidth * nbEpisodes - (nbEpisodes - 1) * padding) / 2;

        var nbAllergies = healthFile.allergies.length;
        var allergyStartX = width - rectangleWidth * nbAllergies - (1 + nbAllergies) * padding;
        var allergyStartY = height - rectangleHeight - 2 * padding;

        var personalStartX = 2 * padding;
        var personalStartY = allergyStartY;
        var personalData = [{name: healthFile.personal.name, medications: []}, {name: healthFile.personal.age, medications: []}, {name: healthFile.personal.gender, medications: []}, {name: healthFile.personal.weight, medications: []}];

        var totalWeight = _.reduce(dosageRegimen, function(memo, el){ return memo + el.weight; }, 0);
        var columnWidth = width / totalWeight;

        var tempIndex = 0;
        for(var i = 0; i < dosageRegimen.length; i++) {
            dosageRegimen[i].startIndex = tempIndex;
            tempIndex += dosageRegimen[i].weight;
        }

        setInterval(update, tickTime);
        update();
        function update() {
            d3.json("data/ram/locations.json?nocache=" + new Date().getTime(), function (errorUpdate, locations) {
                if (debug) {
                    debugDrawMedicationLocations(locations);
                }

                // log potential errors
                if (errorUpdate) {
                    console.log(errorUpdate);
                }

                // if no new data, do nothing
                if (locations[0].timestap <= lastMod || checkIfSimilar(locations, previousLocations)) {
                    return;
                }

                // extend the locations with the drug information
                drugInfo.forEach(info => {
                    _.extend(_.findWhere(locations, {id: info.id}), info);
                });

                locations.forEach(loc => {
                    loc.center[0] = (loc.center[0] - xStart) * wMul;
                    loc.center[1] = (loc.center[1]- yStart) * hMul;
                });

                var mode = setMode(locations, previousMode);

                /////////////////////////////////////////
                // Side effects mode                   //
                /////////////////////////////////////////
                if(mode === ModeEnum.schedule) {

                    // headers that show when medication should be taken
                    var headers = layer2.selectAll("text.header").data(dosageRegimen, d => d.name);

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

                    var auxLines = layer2.selectAll("line.aux-line").data(dosageRegimen, d => d.name);

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

                    var subAuxLines = layer2.selectAll("line.sub-line").data(dosageRegimen, d => d.name);

                    subAuxLines.exit()
                        .attr("class", "exit")
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    subAuxLines.enter().each(function(d) {
                        if(d.subdivision !== undefined) {
                            var nbLines = d.subdivision;
                            for (var i = 1; i < nbLines; i++) {
                                d3.select(this).append("line")
                                    .attr("class", "sub-line")
                                    .attr("x1", d.startIndex * columnWidth - 1 + i*columnWidth/nbLines)
                                    .attr("y1", (imageSize+padding) *2)
                                    .attr("x2", d.startIndex * columnWidth - 1 + i*columnWidth/nbLines)
                                    .attr("y2", height);
                            }
                        }
                    });

                    /////////////////////////////////////////
                    // Integrate dosage regimen   //
                    /////////////////////////////////////////
                    for (var i = 0; i < locations.length; i++) {
                        var loc = locations[i];
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

                    var horizontalBackgroundBanners = layer1.selectAll("rect.background-banner").data(locations, l => l.id);

                    horizontalBackgroundBanners.exit()
                        .attr("class", "exit")
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    horizontalBackgroundBanners
                        .transition(t)
                        .attr("y", d => d.center[1] - backgroundBannerHeight / 2 + rectangleHeight / 2);

                    horizontalBackgroundBanners.enter().append("rect")
                        .attr("class", "background-banner")
                        .attr("x", 0)
                        .attr("y", d => d.center[1] - backgroundBannerHeight / 2 + rectangleHeight / 2)
                        .attr("width", width)
                        .attr("height", d => {
                            return d3.max([backgroundBannerHeight, d.radius]);
                        });

                    /////////////////////////////////////////
                    // add the actual dosage regimen text  //
                    /////////////////////////////////////////
                    var scheduleTextGroups = layer2.selectAll("g.text-group").data(locations, loc => loc.name);

                    scheduleTextGroups.exit()
                        .attr("class", "exit")
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    scheduleTextGroups
                        .transition(t)
                        .attr("transform", d => "translate(0," + d.center[1] + ")");

                    var scheduleTextGroup = scheduleTextGroups.enter().append("g")
                        .attr("class", "text-group")
                        .attr("transform", d => "translate(0," + d.center[1] + ")");

                    dosageRegimen.forEach(dr => {
                        var drx = dr.startIndex * columnWidth + (dr.weight * columnWidth) / 2;

                        // append the actual text
                        scheduleTextGroup.append("text")
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
                        scheduleTextGroup
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

                /////////////////////////////////////////
                // Side effects mode                   //
                /////////////////////////////////////////
                } else if (mode === ModeEnum.sideEffects) {
                    var tempSE = [];
                    locations.forEach(loc => {
                        if (loc.sideEffects !== undefined) {
                            loc.sideEffects.forEach(se => {
                                tempSE.push(se.name);
                            });
                        }
                    });
                    var sideEffects = _.uniq(tempSE.sort(), true);

                    var rowHeight = height / (sideEffects.length + 1);

                    var rowTitles = layer2.selectAll("text.row-title").data(sideEffects, effect => effect.name);

                    rowTitles.exit()
                        .attr("class", "exit")
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    rowTitles.enter().append("text")
                        .attr("class", "row-title")
                        .attr("x", padding)
                        .attr("y", (d, i)=>(i + 1) * height / (sideEffects.length + 1))
                        .attr("dy", ".35em")
                        .text(d => d);


                    /////////////////////////////////////////
                    // grey banners to differentiate rows  //
                    /////////////////////////////////////////
                    var bannerWidth = width / (locations.length + 3);

                    var backgroundBanners = layer1.selectAll("rect.background-banner").data(locations, l => l.id);

                    backgroundBanners.exit()
                        .attr("class", "exit")
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    backgroundBanners
                        .transition(t)
                        .attr("x", d => d.center[0] - bannerWidth / 2 + rectangleWidth / 2);

                    backgroundBanners.enter().append("rect")
                        .attr("class", "background-banner")
                        .attr("x", d => d.center[0] - bannerWidth / 2 + rectangleWidth / 2)
                        .attr("y", 0)
                        .attr("width", d => {
                            return d3.max([bannerWidth, d.radius]);
                        })
                        .attr("height", height);

                    var auxLinesSE = layer1.selectAll("line.aux-line").data(sideEffects, function (d) {
                        return d;
                    });

                    auxLinesSE.exit()
                        .attr("class", "exit")
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    auxLinesSE.enter().append("line")
                        .attr("class", "aux-line")
                        .attr("x1", width / (locations.length + 1) + negativeBuffer)
                        .attr("y1", (d, i) => (i + 1) * rowHeight - rowHeight / 2 + padding)
                        .attr("x2", width)
                        .attr("y2", (d, i) => (i + 1) * rowHeight - rowHeight / 2 + padding);

                    var iconGroups = layer3.selectAll("g.icon-group").data(locations, loc => loc.name);

                    iconGroups.exit()
                        .attr("class", "exit")
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    iconGroups
                        .transition(t)
                        .attr("transform", d => "translate(" + (d.center[0] - bannerWidth / 2 + rectangleWidth / 2) + "," + (-rowHeight / 2 + padding) + ")");

                    var textGroup = iconGroups.enter().append("g")
                        .attr("class", "icon-group")
                        .attr("transform", d => "translate(" + (d.center[0] - bannerWidth / 2 + rectangleWidth / 2) + "," + (-rowHeight / 2 + padding) + ")");

                    for (var k = 0; k < sideEffects.length; k++) {
                        // append the images of pills if available
                        textGroup
                            .each(function (d) {
                                for (var j = 0; j < 100; j++) {
                                    var plane = this.appendChild(importedNode.cloneNode(true));
                                    var d3Object = d3.select(plane);

                                    d3Object
                                        .attr("height", 15)
                                        .attr("y", (k + 1) * rowHeight + 30 * Math.floor(j / 20) + rowHeight/3)
                                        .attr("x", ()=> j % 20 * 10)
                                        .style("fill", () => {
                                            var temp = _.findWhere(d.sideEffects, {name: sideEffects[k]});
                                            if (temp !== undefined && temp.risk !== undefined && j < temp.risk * 100) {
                                                return "steelblue";
                                            } else {
                                                return "grey";
                                            }
                                        });
                                }
                            });
                    }
                } else if (mode === ModeEnum.interactions) {
                    if(!rectangleDrawn) {
                        drawRectangle(layer1, healthFile.episodes, "Aandoeningen", episodeStartX, topMargin, true);
                        drawRectangle(layer1, healthFile.allergies, "Allergieën", allergyStartX, allergyStartY, false);
                        drawRectangle(layer1, personalData, "Persoonlijke informatie", personalStartX, personalStartY, false);
                        rectangleDrawn = true;
                    }
                    //////////////////////////////////////
                    // Interaction lines /////////////////
                    //////////////////////////////////////t
                    var tempInteractions = [];
                    locations.forEach(med1 => {
                        med1.interactions.forEach(interaction => {
                            locations.forEach(med2 => {
                                if (interaction.name === med2.name) {
                                    tempInteractions.push({from: med1, to: med2, type: interaction.type, id: med1 + med2});
                                }
                            });
                        });
                    });
                    // filter double interactions
                    var interactions = [];
                    tempInteractions.forEach(temp => {
                        if (interactions.findIndex(elem => elem.from === temp.to && elem.to === temp.from) < 0) {
                            interactions.push(temp);
                        }
                    });

                    var interactionLines = layer1.selectAll("line.interaction").data(interactions, interaction => interaction.id);

                    interactionLines.exit()
                      .transition(t)
                            .style("fill-opacity", 1e-6)
                            .remove();

                    interactionLines
                      .transition(t)
                        .attr("x1", d => d.from.center[0])
                        .attr("y1", d => d.from.center[1])
                        .attr("x2", d => d.to.center[0])
                        .attr("y2", d => d.to.center[1]);

                    interactionLines
                      .enter().append("line")
                        .attr("class", "interaction")
                        .attr("x1", d => d.from.center[0])
                        .attr("y1", d => d.from.center[1])
                        .attr("x2", d => d.to.center[0])
                        .attr("y2", d => d.to.center[1])
                      .transition(t)
                        .attr("stroke-width", 5)
                        .attr("stroke", d => d.type === "severe" ? "red" : "orange");


                    //////////////////////////////////////
                    // Medication circles and others /////
                    //////////////////////////////////////

                    // JOIN new data with old elements.
                    var myGroups = layer2.selectAll("g.circle-group").data(locations, med => med.id);

                    // exit selection
                    myGroups.exit()
                        .transition(t)
                        .style("fill-opacity", 1e-6)
                        .remove();

                    myGroups
                        .transition(t)
                        .attr("transform", d => "translate(" + d.center[0] + "," + d.center[1] + ")");

                    // enter selection
                    var myGroupsEnter = myGroups
                        .enter().append("g")
                        .attr("class", "circle-group")
                        .attr("id", d => d.name)
                        .attr("transform", d => "translate(" + d.center[0] + "," + d.center[1] + ")");

                    myGroupsEnter.append("path")
                        .attr("class", "minutes-arc");

                    myGroupsEnter.select(".minutes-arc")
                        .attr("d", d => innerArc(
                            d.radius,
                            0,
                            (Math.PI / 30) * d.halfLife)(d)
                        );

                    myGroupsEnter.selectAll(".minutes-aux").data(d => {
                        var all = _.map(d3.range(0, 60), num => {
                            return {n: num, parentData: d};
                        });
                        return _.filter(all, e => e.n < d.halfLife);
                    })
                        .enter().append("path")
                        .attr("class", "minutes-aux")
                        .attr("d", (d) => {
                            return innerArc(
                                d.parentData.radius,
                                (Math.PI / 30) * d.n,
                                (Math.PI / 30) * (d.n + 0.1))(d.n);
                        });

                    myGroupsEnter.append("path")
                        .attr("class", "hours-arc");

                    myGroupsEnter.select(".hours-arc")
                        .attr("d", d => innerArc(
                            d.radius + radiusWidth + padding,
                            0,
                            (Math.PI / 12) * (Math.floor(d.halfLife / 60)))(d)
                        );
                    myGroupsEnter.selectAll(".hours-aux").data(d => {
                        var all = _.map(d3.range(0, 24), num => {
                            return {n: num, parentData: d};
                        });
                        return _.filter(all, e => e.n < Math.floor(d.halfLife / 60));
                    })
                        .enter().append("path")
                        .attr("class", "hours-aux")
                        .attr("d", (d) => {
                            return innerArc(
                                d.parentData.radius + radiusWidth + padding,
                                (Math.PI / 12) * d.n,
                                (Math.PI / 12) * (d.n + 0.05))(d.n);
                        });

                    myGroupsEnter.append("path")
                        .attr("class", "days-arc");

                    myGroupsEnter.select(".days-arc")
                        .attr("d", d => innerArc(d.radius + 2 * radiusWidth + 2 * padding, 0, (Math.PI / 3.5) * (Math.floor((d.halfLife / 60) / 24)))(d));
                    myGroupsEnter.selectAll(".days-aux").data(d => {
                        var all = _.map(d3.range(0, 7), num => {
                            return {n: num, parentData: d};
                        });
                        return _.filter(all, e => e.n < Math.floor((d.halfLife / 60) / 24));
                    })
                        .enter().append("path")
                        .attr("class", "days-aux")
                        .attr("d", (d) => {
                            return innerArc(
                                d.parentData.radius + 2 * radiusWidth + 2 * padding,
                                (Math.PI / 3.5) * d.n,
                                (Math.PI / 3.5) * (d.n + 0.02))(d.n);
                        });

                    myGroupsEnter.append("path")
                        .attr("class", "weeks-arc");

                    myGroupsEnter.select(".weeks-arc")
                        .attr("d", d => innerArc(d.radius + 3 * radiusWidth + 3 * padding, 0, (Math.PI / 25.5) * (Math.floor(((d.halfLife / 60) / 24) / 7)))(d));
                    myGroupsEnter.selectAll(".weeks-aux").data(d => {
                        var all = _.map(d3.range(0, 51), num => {
                            return {n: num, parentData: d};
                        });
                        return _.filter(all, e => e.n < Math.floor(((d.halfLife / 60) / 24) / 7));
                    })
                        .enter().append("path")
                        .attr("class", "weeks-aux")
                        .attr("d", (d) => {
                            return innerArc(
                                d.parentData.radius + 3 * radiusWidth + 3 * padding,
                                (Math.PI / 25.5) * d.n,
                                (Math.PI / 25.5) * (d.n + 0.01))(d.n);
                        });

                    var warningEnter = myGroups.selectAll("g.warnings")
                        .data(d => _.map(d.warnings, elem => {
                            return {warning: elem, parentData: d};
                        }))
                        .enter().append("g")
                        .attr("class", "warnings");

                    warningEnter.append("svg:image")
                        .attr("width", imageSize)
                        .attr("height", imageSize)
                        .attr("xlink:href", d => "images/warning/" + d.warning + ".png")
                        .attr("x", (d, i) => {
                            var nbCircles = numberOfCircles(d.parentData.halfLife);
                            return i * 40 - imageSize - 0.75 * (d.parentData.radius + nbCircles * radiusWidth + nbCircles * padding);
                        })
                        .attr("y", (d, i) => {
                            var nbCircles = numberOfCircles(d.parentData.halfLife);
                            return -i * 20 - imageSize - 0.75 * (d.parentData.radius + nbCircles * radiusWidth + nbCircles * padding);
                        });

                    warningEnter.append("line")
                        .attr("stroke-width", 5)
                        .attr("class", "warning")
                        .attr("x1", (d, i) => {
                            var nbCircles = numberOfCircles(d.parentData.halfLife);
                            return i * 40 + imageSize / 2 - 1 * (d.parentData.radius + nbCircles * radiusWidth + nbCircles * padding);
                        })
                        .attr("y1", (d, i) => {
                            var nbCircles = numberOfCircles(d.parentData.halfLife);
                            return -i * 20 + imageSize / 2 - 1 * (d.parentData.radius + nbCircles * radiusWidth + nbCircles * padding);
                        })
                        .attr("x2", 0)
                        .attr("y2", 0);

                    drugInfo.forEach(info => {
                        layer1.selectAll("." + info.name + "-lines").attr("visibility", "hidden");
                    });

                    locations.forEach(l => {
                        layer1.selectAll("." + l.name + "-lines")
                            .attr("visibility", "visible")
                            .transition()
                            .attr("x2", d => l.center[0] - d.parentLocation.x - d.parentLocation.index * (rectangleWidth + padding))
                            .attr("y2", d => l.center[1] - d.parentLocation.y);
                    });
                }
            });
        }
    }

    //////////////////////////////////////
    // Auxilary functions  ///////////////
    //////////////////////////////////////

    function drawRectangle(rectangleLayer,data, titleText, startX, startY, top) {

        var rectangleGroup = rectangleLayer.append("g")
            .attr("class", "rectangle-group")
            .attr("transform", "translate(" + startX + ", " + startY + ")");

        rectangleGroup.append("text").text(titleText)
            .attr("y", -5)
            .attr("class", "rectangle-text");

        var rectangle = rectangleGroup.selectAll(".rectangle")
            .data(data);

        rectangle.exit()
            .transition(t)
            .style("fill-opacity", 1e-6)
            .remove();

        var singleEpisodeGroup = rectangle.enter().append("g")
            .attr("class", "single-episode-group")
            .attr("transform", (d, i) => "translate(" + i * (rectangleWidth + padding) + ", 0)");

        singleEpisodeGroup.append("rect")
            .attr("width", rectangleWidth)
            .attr("height", rectangleHeight)
            .attr("class", "rectangle")
            .transition(t)
            .style("fill-opacity", 1);

        singleEpisodeGroup.append("text")
            .style("text-anchor", "middle")
            .attr("x", rectangleWidth / 2)
            .attr("y", rectangleHeight / 2)
            .attr("dy", 5)
            .attr("class", "rectangle-text")
            .text(d => d.name);

        var episodeLines = singleEpisodeGroup.selectAll("line").data((d, i) => _.map(d.medications, elem => {return {medication: elem.name, parentLocation: {x: startX, y: startY, index: i, top: top}};}))
            .enter().append("line")
            .attr("class", d => d.medication + "-lines")
            .attr("stroke-width", 5)
            .attr("stroke", () => top ? "grey" : "orange")
            .attr("x1", rectangleWidth / 2)
            .attr("y1", () => top ? rectangleHeight : 0)
            .attr("x2", rectangleWidth / 2)
            .attr("y2", rectangleHeight);

        episodeLines.exit().remove();
    }

    function innerArc(innerRadius, startAngle, endAngle) {
        return d3.arc()
            .startAngle(startAngle)
            .endAngle(endAngle)
            .innerRadius(innerRadius)
            .outerRadius(innerRadius + radiusWidth);
    }

    function numberOfCircles(halfLife) {
        var nbCircles = 1;
        if (halfLife > 60){
            nbCircles++;
        }
        if (halfLife > 60 * 24){
            nbCircles++;
        }
        if (halfLife > 60 * 24 * 7){
            nbCircles++;
        }
        return nbCircles;
    }

    function debugDrawMedicationLocations(locations) {
        var medBoxes = layer1.selectAll("rect.med-box").data(locations, l => l.id);

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
    }

    function setMode(locations) {
        var mode = ModeEnum.init;
        var smallX = 0; // booleans don't work well with only removing all elements when change
        var smallY = 0; // booleans don't work well with only removing all elements when change
        locations.forEach(loc => {
            smallX += xValue > +loc.center[0] ? 1 : 0;
            smallY += yValue > +loc.center[1] ? 1 : 0;
        });

        if (smallX === locations.length) {
            mode = ModeEnum.schedule;
        } else if (smallY === locations.length) {
            mode = ModeEnum.sideEffects;
        } else {
            mode = ModeEnum.interactions;
        }
        if ((previousMode !== mode && previousMode !== ModeEnum.init)) {
            layer1.selectAll("*").remove();
            layer2.selectAll("*").remove();
            layer3.selectAll("*").remove();
            rectangleDrawn = false;
        }
        previousMode = mode;
        return mode;
    }

    function checkIfSimilar(locations) {
        if (previousLocations.length === 0) {
            return false;
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
        previousLocations = locations;
        return similar;
    }
}(d3, d3.queue()));