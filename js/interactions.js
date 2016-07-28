"use strict";
// d3.select('body').append('text').text('Hi sucker!');

var width = window.innerWidth,
    height = window.innerHeight;

var padding = 5,
    topMargin = 20,
    rectangleWidth = 150,
    rectangleHeight = 40,
    radiusWidth = 20;

var t = d3.transition()
    .duration(500);

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

var auxLayer = svg.append('svg');
auxLayer
    .attr("class", "auxLayer")
    .attr('width', width)
    .attr('height', height);

function drawRectangle(data, titleText, startX, startY) {

    var rectangleGroup = rectangleLayer.append("g")
        .attr("transform", "translate(" + startX + ", " + startY + ")");

    rectangleGroup.append("text").text(titleText)
        .attr("y", -5)
        .attr("class", "rectangleText");

    var rectangle = rectangleGroup.selectAll('.rectangle')
        .data(data, d => {
            return d
        });

    rectangle.exit()
        .attr("class", "exit")
        .transition(t)
        .style("fill-opacity", 1e-6)
        .remove();

    var singleEpisodeGroup = rectangle.enter().append("g")
        .attr("transform", (d, i) => "translate(" + i * (rectangleWidth + padding) + ", 0)");

    singleEpisodeGroup.append("rect")
        .attr("class", "enter")
        .attr("width", rectangleWidth)
        .attr("height", rectangleHeight)
        // .attr("x", (d,i) => i*(rectangleWidth + padding))
        .attr("class", "rectangle")
        .text(function (d) {
            return d;
        })
        .transition(t)
        .style("fill-opacity", 1);

    singleEpisodeGroup.append("text").text(d => d.name).style("text-anchor", "middle")
        .attr("x", rectangleWidth / 2)
        .attr("y", rectangleHeight / 2)
        .attr("dy", 5)
        .attr("class", "rectangleText");
}


// Arc auxiliary functin
function innerArc(innerRadius, startAngle, endAngle) {
    return d3.arc()
        .startAngle(startAngle)
        .endAngle(endAngle)
        .innerRadius(innerRadius)
        .outerRadius(innerRadius + radiusWidth)
}

var arc = d3.arc()
    .innerRadius(180)
    .outerRadius(240)
    .endAngle(2 * Math.PI)
    .startAngle(0);


function numberOfCircles(halfLife) {
    var nbCircles = 1;
    if (halfLife > 60) nbCircles++;
    if (halfLife > 60 * 24) nbCircles++;
    if (halfLife > 60 * 24 * 7) nbCircles++;
    return nbCircles;
}
d3.json('data/janedoe.json', function (error, data) {
    var nbEpisodes = data.episodes.length;
    var episodeStartX = (width - rectangleWidth * nbEpisodes - (nbEpisodes - 1) * padding) / 2;
    drawRectangle(data.episodes, "Episodes", episodeStartX, topMargin);


    var nbAllergies = data.allergies.length;
    var allergyStartX = width - rectangleWidth * nbAllergies - (1 + nbAllergies) * padding;
    var allergyStartY = height - rectangleHeight - 2 * padding;
    drawRectangle(data.allergies, "Allergies", allergyStartX, allergyStartY);

    var personalStartX = 2 * padding;
    var personalStartY = allergyStartY;
    var personalData = [{name: data.personal.name}, {name: data.personal.age}, {name: data.personal.gender}, {name: data.personal.weight}];
    drawRectangle(personalData, "Personal", personalStartX, personalStartY);

    setInterval(update, 1000);
    update();
    function update() {
        d3.json('data/locations.json', function (error, locations) {
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

            var interactionLines = medicationLayer.selectAll("line").data(interactions);

            interactionLines.exit()
                .attr("class", "linesExit")
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
                .enter()
                .append("line")
                .attr("stroke-width", 5)
                .attr("stroke", d => {
                    if (d.type == "severe") {
                        return "red";
                    } else {
                        return "orange";
                    }
                })
                .attr("x1", d => d.from.center[0])
                .attr("y1", d => d.from.center[1])
                .attr("x2", d => d.to.center[0])
                .attr("y2", d => d.to.center[1]);


            // JOIN new data with old elements.
            var myGroups = medicationLayer.selectAll('g.circleGroup').data(locations);

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
                .attr("transform", d => "translate(" + d.center[0] + "," + d.center[1] + ")");
            //
            // var warningCircles = myGroupsEnter.append("circle")
            //     .attr("class", "warning")
            //     .attr("cx", d => -(d.radius + 3 * padding + 3* radiusWidth))
            //     .attr("cy", d => -(d.radius + 3 * padding + 3* radiusWidth))
            //     .attr("r", 30);


            var warningImages = myGroupsEnter.selectAll(".warnings").data(d =>
                _.map(d.warnings, elem => {return {warning: elem, parentData: d}})
            )

            var imageSize = 40;
            warningImages
              .enter().append("svg:image")
                .attr('x',(d,i) => {
                    var nbCircles = numberOfCircles(d.parentData.halfLife);
                    return i*40 -imageSize -0.75 * (d.parentData.radius + nbCircles*radiusWidth + nbCircles*padding)
                })
                .attr('y',(d,i) => {
                    var nbCircles = numberOfCircles(d.parentData.halfLife);
                    return -i*20-imageSize -0.75 * (d.parentData.radius + nbCircles*radiusWidth + nbCircles*padding)
                })
                .attr('width', imageSize)
                .attr('height', imageSize)
                .attr("xlink:href",d => "images/warning/" + d.warning + ".png")

            // var warningImages = myGroupsEnter.append("svg:image")
            //     .attr('x',-9)
            //     .attr('y',-12)
            //     .attr('width', 50)
            //     .attr('height', 50)
            //     .attr("xlink:href",d => "images/warning/" + d.warnings[0] + ".png")

            var minutesG = myGroupsEnter.append("g");
            var minutes = minutesG.append("path")
                .attr("class", "minutesArc")
                .attr("d", d => innerArc(
                    d.radius,
                    0,
                    (Math.PI/30)* d.halfLife)(d)
                );
            minutesG.selectAll(".minutesAux").data(d => {
                    var all = _.map(d3.range(0,60), num => {return {n: num, parentData: d}});
                    var result =  _.filter(all, e => e.n < d.halfLife);
                    return result;
                })
              .enter().append("path")
                .attr("class", "minutesAux")
                .attr("d", (d) => {return innerArc(
                    d.parentData.radius,
                    (Math.PI/30)* d.n,
                    (Math.PI/30)* (d.n+0.1))(d.n)
                });


            var hoursG = myGroupsEnter.append("g");
            hoursG.append("path")
                .attr("class", "hoursArc")
                .attr("d", d => innerArc(
                    d.radius + radiusWidth + padding,
                    0,
                    (Math.PI/12)*(Math.floor(d.halfLife/60)))(d)
                );
            hoursG.selectAll(".hoursAux").data(d => {
                    var all = _.map(d3.range(0,24), num => {return {n: num, parentData: d}});
                    var result =  _.filter(all, e => e.n < d.halfLife/60);
                    return result;
                })
              .enter().append("path")
                .attr("class", "hoursAux")
                .attr("d", (d) => {return innerArc(
                    d.parentData.radius + radiusWidth + padding,
                    (Math.PI/12)* d.n,
                    (Math.PI/12)* (d.n+0.05))(d.n)
                });

            var daysG = myGroupsEnter.append("g");
            daysG.append("path")
                .attr("class", "daysArc")
                .attr("d", d => innerArc(d.radius + 2*radiusWidth + 2*padding,0,(Math.PI/3.5)*(Math.floor((d.halfLife/60)/24)))(d));
            daysG.selectAll(".daysAux").data(d => {
                var all = _.map(d3.range(0,7), num => {return {n: num, parentData: d}});
                var result =  _.filter(all, e => e.n < Math.floor((d.halfLife/60)/24));
                return result;
                })
              .enter().append("path")
                .attr("class", "daysAux")
                .attr("d", (d) => {return innerArc(
                    d.parentData.radius + 2*radiusWidth + 2*padding,
                    (Math.PI/3.5)* d.n,
                    (Math.PI/3.5)* (d.n+0.02))(d.n)
                });

            var weeksG = myGroupsEnter.append("g");
            weeksG.append("path")
                .attr("class", "weeksArc")
                .attr("d", d => innerArc(d.radius + 3*radiusWidth + 3*padding,0,(Math.PI/25.5)*(Math.floor(((d.halfLife/60)/24)/7)))(d));
            weeksG.selectAll(".weeksAux").data(d => {
                var all = _.map(d3.range(0,51), num => {return {n: num, parentData: d}});
                var result =  _.filter(all, e => e.n < Math.floor(((d.halfLife/60)/24)/7));
                return result;
                })
              .enter().append("path")
                .attr("class", "weeksAux")
                .attr("d", (d) => {return innerArc(
                    d.parentData.radius + 3*radiusWidth + 3*padding,
                    (Math.PI/25.5)* d.n,
                    (Math.PI/25.5)* (d.n+0.01))(d.n)
                });

        });
    }


});