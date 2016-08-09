/*jshint esversion: 6 */
(function () {
    'use strict';

    var width = window.innerWidth,
        height = window.innerHeight;

    var padding = 5,
        topMargin = 20,
        rectangleWidth = 130,
        rectangleHeight = 40,
        radiusWidth = 20,
        imageSize = 40;

    var t = d3.transition()
        .duration(1000);

    var svg = d3.select('body').append('svg');
    svg.attr('width', width)
        .attr('height', height);

    var rectangleLayer = svg.append('svg');
    rectangleLayer
        .attr("class", "rectangleLayer")
        .attr('width', width)
        .attr('height', height);

    var medicationLayer = svg.append('svg');
    medicationLayer
        .attr("class", "medicationLayer")
        .attr('width', width)
        .attr('height', height);

    d3.json('data/janedoe.json', function (error, data) {
        var nbEpisodes = data.episodes.length;
        var episodeStartX = (width - rectangleWidth * nbEpisodes - (nbEpisodes - 1) * padding) / 2;
        drawRectangle(data.episodes, "Episodes", episodeStartX, topMargin, true);

        var nbAllergies = data.allergies.length;
        var allergyStartX = width - rectangleWidth * nbAllergies - (1 + nbAllergies) * padding;
        var allergyStartY = height - rectangleHeight - 2 * padding;
        drawRectangle(data.allergies, "Allergies", allergyStartX, allergyStartY, false);

        var personalStartX = 2 * padding;
        var personalStartY = allergyStartY;
        var personalData = [{name: data.personal.name, medications: ["cymbalta"]}, {name: data.personal.age, medications: []}, {name: data.personal.gender, medications: []}, {name: data.personal.weight, medications: []}];
        drawRectangle(personalData, "Personal", personalStartX, personalStartY, false);

        setInterval(update, 1000);
        update();
        function update() {
            d3.json('data/locations.json', function (error, locations) {
                //////////////////////////////////////
                // Interaction lines /////////////////
                //////////////////////////////////////

                var tempInteractions = [];
                locations.forEach(med1 => {
                   med1.interactions.forEach(interaction => {
                       locations.forEach(med2 => {
                           if(interaction.name === med2.name) {
                               tempInteractions.push({from: med1, to: med2, type: interaction.type});
                           }
                       });
                   });
                });
                // filter double interactions
                var interactions = [];
                tempInteractions.forEach(temp => {
                    if (interactions.findIndex(elem => elem.from == temp.to && elem.to == temp.from) < 0) {
                        interactions.push(temp);
                    }
                });

                var interactionLines = rectangleLayer.selectAll("line.interaction").data(interactions);

                interactionLines.exit()
                    // .attr("class", "linesExit")
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
                    .attr("stroke-width", 5)
                    .attr("stroke", d => d.type == "severe" ? "red" : "orange")
                    .attr("x1", d => d.from.center[0])
                    .attr("y1", d => d.from.center[1])
                    .attr("x2", d => d.to.center[0])
                    .attr("y2", d => d.to.center[1]);


                //////////////////////////////////////
                // Medication circles and others /////
                //////////////////////////////////////

                // JOIN new data with old elements.
                var myGroups = medicationLayer.selectAll('g.circleGroup').data(locations, med => med.id);

                // exit selection
                myGroups.exit()
                    .attr("class", "medicationExit")
                  .transition(t)
                    .style("fill-opacity", 1e-6)
                    .remove();

                // update selection -- this will also contain the newly appended elements
                myGroups
                  .transition(t)
                    .attr("transform", d => "translate(" + d.center[0] + "," + d.center[1] + ")");

                // enter selection
                var myGroupsEnter = myGroups
                  .enter().append("g")
                    .attr("class", "circleGroup")
                    .attr("id", d => d.name)
                    .attr("transform", d => "translate(" + d.center[0] + "," + d.center[1] + ")");

                myGroupsEnter.append("path")
                    .attr("class", "minutesArc");

                myGroups.select(".minutesArc")
                    .attr("d", d => innerArc(
                        d.radius,
                        0,
                        (Math.PI/30)* d.halfLife)(d)
                    );

                myGroups.selectAll(".minutesAux").data(d => {
                        var all = _.map(d3.range(0,60), num => {return {n: num, parentData: d};});
                        var result =  _.filter(all, e => e.n < d.halfLife);
                        return result;
                    })
                  .enter().append("path")
                    .attr("class", "minutesAux")
                    .attr("d", (d) => {return innerArc(
                        d.parentData.radius,
                        (Math.PI/30)* d.n,
                        (Math.PI/30)* (d.n+0.1))(d.n);
                    });


                myGroupsEnter.append("path")
                    .attr("class", "hoursArc");

                myGroups.select(".hoursArc")
                    .attr("d", d => innerArc(
                        d.radius + radiusWidth + padding,
                        0,
                        (Math.PI/12)*(Math.floor(d.halfLife/60)))(d)
                    );
                myGroups.selectAll(".hoursAux").data(d => {
                        var all = _.map(d3.range(0,24), num => {return {n: num, parentData: d};});
                        var result =  _.filter(all, e => e.n < Math.floor(d.halfLife/60));
                        return result;
                    })
                  .enter().append("path")
                    .attr("class", "hoursAux")
                    .attr("d", (d) => {return innerArc(
                        d.parentData.radius + radiusWidth + padding,
                        (Math.PI/12)* d.n,
                        (Math.PI/12)* (d.n+0.05))(d.n);
                    });

                myGroupsEnter.append("path")
                    .attr("class", "daysArc");

                myGroups.select(".daysArc")
                    .attr("d", d => innerArc(d.radius + 2*radiusWidth + 2*padding,0,(Math.PI/3.5)*(Math.floor((d.halfLife/60)/24)))(d));
                myGroups.selectAll(".daysAux").data(d => {
                    var all = _.map(d3.range(0,7), num => {return {n: num, parentData: d};});
                    var result =  _.filter(all, e => e.n < Math.floor((d.halfLife/60)/24));
                    return result;
                    })
                  .enter().append("path")
                    .attr("class", "daysAux")
                    .attr("d", (d) => {return innerArc(
                        d.parentData.radius + 2*radiusWidth + 2*padding,
                        (Math.PI/3.5)* d.n,
                        (Math.PI/3.5)* (d.n+0.02))(d.n);
                    });

                myGroupsEnter.append("path")
                    .attr("class", "weeksArc");

                myGroups.select(".weeksArc")
                    .attr("d", d => innerArc(d.radius + 3*radiusWidth + 3*padding,0,(Math.PI/25.5)*(Math.floor(((d.halfLife/60)/24)/7)))(d));
                myGroups.selectAll(".weeksAux").data(d => {
                    var all = _.map(d3.range(0,51), num => {return {n: num, parentData: d};});
                    var result =  _.filter(all, e => e.n < Math.floor(((d.halfLife/60)/24)/7));
                    return result;
                    })
                  .enter().append("path")
                    .attr("class", "weeksAux")
                    .attr("d", (d) => {return innerArc(
                        d.parentData.radius + 3*radiusWidth + 3*padding,
                        (Math.PI/25.5)* d.n,
                        (Math.PI/25.5)* (d.n+0.01))(d.n);
                    });

               var warningEnter = myGroups.selectAll("g.warnings")
                   .data(d => _.map(d.warnings, elem => {return {warning: elem, parentData: d};}))
                 .enter().append("g")
                   .attr("class","warnings");

                warningEnter.append("svg:image")
                    .attr('width', imageSize)
                    .attr('height', imageSize)
                    .attr("xlink:href",d => "images/warning/" + d.warning + ".png")
                    .attr('x',(d,i) => {
                        var nbCircles = numberOfCircles(d.parentData.halfLife);
                        return i*40 -imageSize -0.75 * (d.parentData.radius + nbCircles*radiusWidth + nbCircles*padding);
                    })
                    .attr('y',(d,i) => {
                        var nbCircles = numberOfCircles(d.parentData.halfLife);
                        return -i*20-imageSize -0.75 * (d.parentData.radius + nbCircles*radiusWidth + nbCircles*padding);
                    });

                warningEnter.append("line")
                    .attr("stroke-width", 5)
                    .attr("class", "warning")
                    .attr("x1", (d,i) => {
                        var nbCircles = numberOfCircles(d.parentData.halfLife);
                        return i*40 +imageSize/2 -1 * (d.parentData.radius + nbCircles*radiusWidth + nbCircles*padding);
                    })
                    .attr("y1", (d,i) => {
                        var nbCircles = numberOfCircles(d.parentData.halfLife);
                        return -i*20 + imageSize/2-1 * (d.parentData.radius + nbCircles*radiusWidth + nbCircles*padding);
                    })
                    .attr("x2", 0)
                    .attr("y2", 0);

                locations.forEach(l => {
                    rectangleLayer.selectAll("." + l.name + "-lines")
                      .transition()
                        .attr("x2", d => l.center[0] - d.parentLocation.x - d.parentLocation.index * (rectangleWidth + padding))
                        .attr("y2", d => l.center[1] - d.parentLocation.y);
                });
            });
        }
    });

    //////////////////////////////////////
    // Auxilary functions  ///////////////
    //////////////////////////////////////

    function drawRectangle(data, titleText, startX, startY, top) {

        var rectangleGroup = rectangleLayer.append("g")
            .attr("class", "rectangleGroup")
            .attr("transform", "translate(" + startX + ", " + startY + ")");

        rectangleGroup.append("text").text(titleText)
            .attr("y", -5)
            .attr("class", "rectangleText");

        var rectangle = rectangleGroup.selectAll('.rectangle')
            .data(data);

        rectangle.exit()
            .attr("class", "exit")
          .transition(t)
            .style("fill-opacity", 1e-6)
            .remove();

        var singleEpisodeGroup = rectangle.enter().append("g")
            .attr("class", "singleEpisodeGroup")
            .attr("transform", (d, i) => "translate(" + i * (rectangleWidth + padding) + ", 0)");

        singleEpisodeGroup.append("rect")
            .attr("width", rectangleWidth)
            .attr("height", rectangleHeight)
            .attr("class", "rectangle")
          .transition(t)
            .style("fill-opacity", 1);

        singleEpisodeGroup.append("text").text(d => d.name)
            .style("text-anchor", "middle")
            .attr("x", rectangleWidth / 2)
            .attr("y", rectangleHeight / 2)
            .attr("dy", 5)
            .attr("class", "rectangleText");

        singleEpisodeGroup.selectAll("line").data((d, i) => _.map(d.medications, elem => {return {medication: elem, parentLocation: {x: startX, y: startY, index: i, top: top}};}))
              .enter().append("line")
                .attr("class", d => d.medication + "-lines")
                .attr("stroke-width", 5)
                .attr("stroke", () => top ? "grey" : "orange")
                .attr("x1", rectangleWidth / 2)
                .attr("y1", () => top ? rectangleHeight : 0)
                .attr("x2", rectangleWidth / 2)
                .attr("y2", rectangleHeight);
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
        if (halfLife > 60)
            nbCircles++;
        if (halfLife > 60 * 24)
            nbCircles++;
        if (halfLife > 60 * 24 * 7)
            nbCircles++;
        return nbCircles;
    }
}());