/*jshint esversion: 6 */

(function (d3,queue) {
    "use strict";

    var width = window.innerWidth,
        height = window.innerHeight;

    var padding = 5,
        negativeBuffer = -40,
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

    var iconLayer = svg.append("svg");
    iconLayer
        .attr("class", "icon-layer")
        .attr("width", width)
        .attr("height", height);

    var importedNode;
    //Import the plane
    d3.xml("images/icons/person.svg").mimeType("image/svg+xml").get(function(error, xml) {
        if (error) {console.log(error); return;}
        importedNode = document.importNode(xml.documentElement, true);
    });


    //
    //     var svgNode = documentFragment
    //         .getElementsByTagName("svg")[0];
    //
    //     // svgNode.attr("x",200);
    //     //use plain Javascript to extract the node
    //
    //     iconLayer.node().appendChild(svgNode);
    //     //d3's selection.node() returns the DOM node, so we
    //     //can use plain Javascript to append content
    //
    //     var person =  d3.select("#Layer_1");

        // for (var i = 0 ; i < 10 ; i++) {
        //     iconLayer.append(person);
        // }
        // var innerSVG = iconLayer.select("svg");
        //
        // innerSVG.style("fill", "white");
        //
        // d3.select("#path9011_8_").style("fill","steelblue").attr("y",400);
        // d3.select("#path9007_8_").style("fill","steelblue");
    // });

    setInterval(update, 1000);
    update();
    function update() {
        d3.json("data/locations.json?nocache=" + (new Date()).getTime(), function (error, locations) {
            if (error) {
                console.log(error);
            }

            /////////////////////////////////////////
            // Sort locations from left to right   //
            /////////////////////////////////////////
            var leftToRightLocations = _.sortBy(locations, l => l.center[0]);

            var tempSE = [];
            locations.forEach(loc => {
                if (loc.sideEffects !== undefined) {
                    loc.sideEffects.forEach(se => {
                        tempSE.push(se.name);
                    });
                }
            });

            /////////////////////////////////////////
            // add titles to each row              //
            /////////////////////////////////////////
            var tempSor = tempSE.sort();
            var sideEffects = _.uniq(tempSor, true);
            var nbSideEffects = sideEffects.length;

            var rowHeight = height/(nbSideEffects + 1);


            //todo for each side effect search occurences

            var sideEffectOccurences = [];
            sideEffects.forEach(effect => {
                locations.forEach(med => {
                    var temp = _.findWhere(med.sideEffects, {name: effect});
                    if(temp !== undefined) {
                        sideEffectOccurences.push({name: effect, drug: med.name, risk: temp.risk});
                    } else {
                        sideEffectOccurences.push({name: effect, drug: med.name, risk: undefined});
                    }
                });
            });


            var rowTitles = textLayer.selectAll("text.row-title").data(sideEffects);

            rowTitles.exit()
                .attr("class", "exit")
              .transition(t)
                .style("fill-opacity", 1e-6)
                .remove();

            rowTitles.enter().append("text")
                .attr("class", "row-title")
                .attr("x", padding)
                .attr("y", (d,i)=>(i+1) * height/(nbSideEffects+1))
                .attr("dy", ".35em")
                .text(d => d);


            /////////////////////////////////////////
            // grey banners to differentiate rows  //
            /////////////////////////////////////////
            var bannerWidth = width/(locations.length+1);

            var backgroundBanners = backgroundLayer.selectAll("rect.background-banner").data(leftToRightLocations, l => l.id);

            backgroundBanners.exit()
                .attr("class", "exit")
              .transition(t)
                .style("fill-opacity", 1e-6)
                .remove();

            backgroundBanners
              .transition(t)
                .attr("x", d => d.center[0] - bannerWidth/2 + rectangleWidth/2);

            backgroundBanners.enter().append("rect")
                .attr("class", "background-banner")
                .attr("x", d => d.center[0] - bannerWidth/2 + rectangleWidth/2)
                .attr("y", 0)
                .attr("width", d => {
                    return d3.max([bannerWidth, d.radius]);
                })
                .attr("height", height)
                .style("fill", (d,i) => i % 2 === 0 ? "darkgrey" : "black");

            var auxLines = backgroundLayer.selectAll("line.aux-line").data(sideEffects,  function(d){return d;});

            auxLines.exit()
                .attr("class", "exit")
              .transition(t)
                .style("fill-opacity", 1e-6)
                .remove();

            auxLines.enter().append("line")
                .attr("class", "aux-line")
                .attr("x1", width/(locations.length+1)+negativeBuffer)
                .attr("y1", (d,i) => (i+1) * rowHeight - rowHeight/2)
                .attr("x2", width)
                .attr("y2", (d,i) => (i+1) * rowHeight - rowHeight/2);

            /////////////////////////////////////////
            // aux box to see location medication  //
            /////////////////////////////////////////
            var medBoxes = backgroundLayer.selectAll("rect.med-box").data(leftToRightLocations, l => l.id);

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

            var iconGroups = iconLayer.selectAll("g.icon-group").data(leftToRightLocations, loc => loc.name);

            iconGroups.exit()
                .attr("class", "exit")
                .transition(t)
                .style("fill-opacity", 1e-6)
                .remove();

            iconGroups
                .transition(t)
                .attr("transform", d => "translate(" + (d.center[0] - bannerWidth/2 + rectangleWidth/2) + "," + (-rowHeight/2 + padding) + ")");

            var textGroup = iconGroups.enter().append("g")
                .attr("class", "icon-group")
                .attr("transform", d => "translate(" + (d.center[0] - bannerWidth/2 + rectangleWidth/2) + "," + (-rowHeight/2 + padding) + ")");

            for (var k = 0; k < sideEffects.length; k++) {
                // sideEffects.forEach(dr => {
                // var drx = dr.startIndex * he + (dr.weight *  columnWidth)/2;

                // append the images of pills if available
                textGroup
                    .each(function (d,i) {
                        for (var j = 0; j < 100; j++) {
                            var plane = this.appendChild(importedNode.cloneNode(true));
                            var d3Object = d3.select(plane);

                            d3Object
                            // .attr("width", 20)
                                .attr("height", 15)
                                .attr("y",(k+1) * rowHeight + 30 * Math.floor(j/20))
                                .attr("x", ()=>   j%20 * 10)
                                .style("fill",() => {
                                    var temp = _.findWhere(sideEffectOccurences, {name: sideEffects[k], drug: d.name});
                                    if (temp.risk !== undefined && j < temp.risk*100) {
                                        return "steelblue";
                                    } else {
                                        return "grey";
                                    }
                                });
                        }
                    });
            }



            // iconLayer.each(function(d, i) {
            //     for (var j = 0; j < 10; j++) {
            //         var plane = this.appendChild(importedNode.cloneNode(true));
            //         var d3Object = d3.select(plane);
            //
            //
            //         d3Object
            //             // .attr("width", 20)
            //             .attr("height", 40)
            //
            //             .attr("x", ()=> j * 50)
            //             .style("fill",() => {
            //                 if (j < 5) {
            //                     return "steelblue";
            //                 } else {
            //                     return "grey";
            //                 }
            //             });
            //     }
            // });




            });
    }
}(d3, d3.queue()));