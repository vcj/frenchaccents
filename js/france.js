//Mapping with a French Accent, GEOG575 Lab 2
(function(){

    //items to map from csv utf-8 for special characters
    var attrArray = ["Â (a circonflexe)","À (a grave)","Ç (cedille)","É (e aigu)","Ê (e circonflexe)","È (e grave)","Ë (e trema)","Î (i circonflexe)","Ï (i trema)","the letter K","Ô (o circonflexe)","Œ (oe ligature)","Û (u circonflexe)","Ü (u trema)","the letter W","Ÿ (y trema)"]; 
    var expressed = attrArray[0]; 

    //set chart w/h
    var chartWidth = window.innerWidth * 0.45,
        chartHeight = 473;

    //range and domain for the chart (needs work)
    var yScale = d3.scaleLinear()
            .range([0, (chartHeight-10)])
            .domain([0, 150]);
    
    //make the map when the window loads
    window.onload = setMap();
    
    //set map
    function setMap(){
        //map frame dimensions to match chart
        var width = window.innerWidth * 0.45,
            height = 473;

        //map container
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //Albers projection, showing France and surrounding countries
        var projection = d3.geoAlbers()
            .center([0, 46.2])
            .rotate([-2, 0, 0])
            .parallels([43, 62])
            .scale(2500)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
        .projection(projection);

        // promises, which I do not totally understand but it works so, uh.
        var promises = [d3.csv("data/unitsData.csv"),
                        d3.json("data/EuropeCountries.json"),
                        d3.json("data/FranceRegions.json")
                    ];
        Promise.all(promises).then(callback);

        function callback(data){
            csvData = data[0];
            europe = data[1];
            france = data[2];

            //lat long lines
            setGraticule(map, path);

            //TopoJSON time
            var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
                franceRegions = topojson.feature(france, france.objects.FranceRegions).features;

            //Europe
            var countries = map.append("path")
                .datum(europeCountries)
                .attr("class", "countries")
                .attr("d", path);

            //join csv data to json
            franceRegions = joinData(franceRegions, csvData);

            //make color scale for csv data
            var colorScale = makeColorScale(csvData);

            //enumeration units
            setEnumerationUnits(franceRegions, map, path, colorScale);

            //chart with same color scale
            setChart(csvData, colorScale);

            //create dropdown with the attributes from csv
            createDropdown(csvData);
            
            //add atlas background info
            createTextBox();
        };
    }; //end of setMap() 

    //grid lines
    function setGraticule(map, path){
        //every 5 degrees
        var graticule = d3.geoGraticule()
        .step([5, 5]); 

        //graticule background (will appear as ocean on map)
        var gratBackground = map.append("path")
            .datum(graticule.outline()) 
            .attr("class", "gratBackground")
            .attr("d", path)

        //draw grid lines
        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter() 
            .append("path") 
            .attr("class", "gratLines") 
            .attr("d", path); 


        var gratLines = map.selectAll(".gratLines") 
    };

    //use key to match csv to json
    function joinData(franceRegions, csvData){
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; 
            var csvKey = csvRegion.adm1_code; 

            //loop 
            for (var a=0; a<franceRegions.length; a++){

                var geojsonProps = franceRegions[a].properties; 
                var geojsonKey = geojsonProps.adm1_code; 

                //if it matches...
                if (geojsonKey == csvKey){

                    //fill in values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); 
                        geojsonProps[attr] = val; 
                    });
                };
            };
        };
    
        return franceRegions;
    };

    //Add France regions to map
    function setEnumerationUnits(franceRegions, map, path, colorScale){
        var regions = map.selectAll(".regions")
        .data(franceRegions)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.adm1_code;
        })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(value);
            } else {
            	return "dimgray";
            }
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

        var desc = regions.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
    };

    //function to create color scale generator
    function makeColorScale(data){
        //Create color scale (colors from colorbrewer)
        var colorClasses = [
            "#efedf5",
            "#dadaeb",
            "#bcbddc",
            "#9e9ac8",
            "#807dba"
        ];
    
        //create color scale classes for the range
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);
    
        //array to contain values of expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
    
        //clusters for natural breaks 
        var clusters = ss.ckmeans(domainArray, 5);
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        domainArray.shift();
        colorScale.domain(domainArray);
        //apply color scale
        return colorScale;
    };

    //make the chart
    function setChart(csvData, colorScale){
        //separate element to match map
        var chartWidth = window.innerWidth * 0.48,
        chartHeight = 473,
        leftPadding = -25,
        rightPadding = -2,
        topBottomPadding = -5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
        
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
        
        //chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        
//          //create a scale to size bars proportionally to frame and for axis
//        var yScale = d3.scaleLinear()
//            .range([40003, 0])
//            .domain([0, 600]);


        //bars for each region, make them responsive to mouse action
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.adm1_code;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
        
        // stroke on mouseover
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "1px"}');

        //numbers on the bars
        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.adm1_code;
            })
            .attr("text-anchor", "middle")
            .attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
            })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight);

//        var desc2 = numbers.append("desc")
//            .text('{"stroke": "none", "stroke-width": "0px"}');

        //chart title
        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Occurrences of the selected character in place names by region")

        updateChart(bars, numbers, csvData.length, colorScale);
    };

    //character selection dropdown menu
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //dropdown header
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Character");

        //selected characters
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //choose from the dropdown menu
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;

        //apply color scale to chosen character
        var colorScale = makeColorScale(csvData);

        //color regions
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if(value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
        });

        //arrange bars
        var bars = d3.selectAll(".bars")
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() 
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);
        //arrange numbers 
        var numbers = d3.selectAll(".numbers")
            //re-sort numbers
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() 
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        updateChart(bars, numbers, csvData.length, colorScale)
    };

    //update the chart to match 
    function updateChart(bars, numbers, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
            return i * (chartWidth / n);
        })
        .attr("height", function(d, i){
            return yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        //color bars
        .style("fill", function(d){
            var value = d[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return dimgrey;
            }
        });

        //update bars with numbers
        numbers.attr("x", function(d, i){
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
            .text(function(d){
                return d[expressed];
        });
    };

    //highlight regions
    function highlight(props){
        //change stroke. not sure how to make this higher level?
        var selected = d3.selectAll("." + props.adm1_code)
            .style("stroke", "ghostwhite")
            .style("stroke-width", "2");

        setLabel(props);
    };

    //un highlight once the mouse goes elsewhere
    function dehighlight(props){
        d3.select(".infolabel")
            .remove();
        var selected = d3.selectAll("." + props.adm1_code)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
    };

    //dynamic label with action
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create infolabel 
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.adm1_code + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };

    //label accompanies mouse
    function moveLabel(){
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //where the mouse goes, the label goes
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 5,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;
    
        //popup coordinates
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        var y = d3.event.clientY < 75 ? y2 : y1; 
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
     //section for text at the bottom
    function createTextBox(){
        //add text
        $('body').append('<div id="textbottom">The regions of France have their own distinct culture, and that extends through the place names in each one. One way you can see this how frequently certain characters are used in toponyms. Flip through the dropdown menu to see how these letters are distributed across the country by region.\
        <h5>Data Source: <a href="https://geonames.nga.mil/geonames/GNSHome/welcome.html">Geographic Names Server</a></h5></div>');
    };
    
    
    
})(); 

