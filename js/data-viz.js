(function ($) {
    $.CreateViz = function (p) {
        var dataviz = {
            aidData: null,
            config: {
                yearMin: 0,
                yearMax: 0
            },
            init: function () {
                dataviz.config.yearMax = Math.max.apply(Math, poverty_data.map(function (o) { return o.Year; }));
                dataviz.config.yearMin = Math.min.apply(Math, poverty_data.map(function (o) { return o.Year; }));
                var $this = this;
                $this.countryDlEvent();
                $this.cbEvent();
                $this.onload();
                $this.sliderEvent();
                $this.generateMap();
                $this.aidAgencyEvent();
            },
            onload: function () {
                var options = '';
                current_stat.sort((a, b) => a.Country < b.Country ? -1 : (a.Country > b.Country ? 1 : 0))
                $.each(current_stat, function (key, value) {
                    options += `<option value="${value.Country}">${value.Country}</option>`;
                });
                $("#ddCountries").html(options).trigger("change");
                $("[name='cbGender']").first().trigger("change");
            },
            countryDlEvent: function () {
                let $this = this;
                $("#ddCountries").off('change').on("change", function () {
                    var thisval = $(this).val()
                    var statDetails = current_stat.find(x => x.Country === thisval);
                    $('[data-attr="country"]').text(`${statDetails.Country}'s Poverty Profile`);
                    $('[data-attr="income-group"]').text(statDetails["Income group"]);
                    $('[data-attr="moderately-poor"]').text(`${statDetails["Moderately poor"]} %`);
                    $('[data-attr="near-poor"]').text(`${statDetails["Near poor"]} %`);
                    let donutData = { "Extremely poor": statDetails["Extremely poor"], "Not Extremely": (100 - statDetails["Extremely poor"]) }
                    $this.generateDonut(donutData);
                    $this.aidData = myAID.filter(x => x["Year"] >= $this.config.yearMin && x["Year"] <= $this.config.yearMax && x["Country Name"] === thisval);
                    $this.generateBarPlot($this.aidData);
                    $this.getPovertyData(thisval, $this.config.yearMin, $this.config.yearMax);
                });
            },
            cbEvent: function () {
                var $this = this;
                $("[name='cbGender']").off("change").on("change", function () {
                    var country = $("#ddCountries").val();
                    $this.getPovertyData(country, dataviz.config.yearMin, dataviz.config.yearMax);
                });
            },
            sliderEvent: function () {
                var $this = this;
                $("#slider-range").slider({
                    range: true,
                    min: 2010,
                    max: 2021,
                    values: [2010, 2021],
                    slide: function (event, ui) {
                        $("#startYear").text(ui.values[0]);
                        $("#endYear").text(ui.values[1])
                    },
                    stop: function (event, ui) {
                        //myAID
                        var min = ui.values[0], max = ui.values[1];
                        $this.config.yearMin = min, $this.config.yearMax = max;
                        var aid_data = myAID.filter(x => x["Year"] >= min && x["Year"] <= max && x["Country Name"] === $("#ddCountries").val());
                        dataviz.aidData = aid_data;
                        $this.generateBarPlot(dataviz.aidData);
                        $this.getPovertyData($("#ddCountries").val(), dataviz.config.yearMin, dataviz.config.yearMax);
                    }
                });
                $("#startYear").text($("#slider-range").slider("values", 0));
                $("#endYear").text($("#slider-range").slider("values", 1))
            },
            aidAgencyEvent: function () {
                let $this = this;
                $("#ddAIDAgency").off("change").on("change", function () {
                    $this.generateBarPlot(dataviz.aidData);
                });
            },
            getPovertyData: function (country, min, max) {
                var $this = this;
                var gender = $("input:checkbox[name=cbGender]:checked").map(function () { return $(this).val() }).get();
                var povertyData = poverty_data.filter(x => x["Year"] >= min && x["Year"] <= max && x["Country Name"] === country && (gender.includes(x["Sex"].toLowerCase())))
                $this.generateLineChart(povertyData);
            },
            generateDonut: function (data) {
                const width = 150, height = 150, margin = 40;
                const radius = Math.min(width, height) / 2 - margin
                d3.select("#donoutChart>svg").remove();
                const svg = d3.select("#donoutChart").append("svg").attr("width", width).attr("height", height).append("g").attr("transform", `translate(${width / 2},${height / 2})`);
                const color = d3.scaleOrdinal().range(["#e15759", "#bab0ac"])
                const pie = d3.pie().value(d => d[1])
                const data_ready = pie(Object.entries(data))

                // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
                svg.selectAll('whatever').data(data_ready).join('path').attr('d', d3.arc().innerRadius(50)
                    .outerRadius(radius)).attr('fill', d => color(d.data[0])).style("opacity", 0.7);

                svg.append("text").attr("text-anchor", "middle").attr("class", "fw-bolder").text(`${data["Extremely poor"]}%`);
            },
            generateSVG: function (target, x) {
                d3.select(`${target}>svg`).remove();
                var margin = { top: 30, right: 30, bottom: 70, left: 60 },
                    width = 600 - margin.left - margin.right,
                    height = 500 - margin.top - margin.bottom;
                var svg = d3.select(target).append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                return { "svg": svg, "width": width, "height": height };
            },
            genearteX: function (svg, width, height, data) {
                var x = d3.scaleBand().range([0, width]).domain(data.map(function (d) { return d.Year; })).padding(0.2);
                svg.append("g").attr("transform", "translate(0," + height + ")").call(d3.axisBottom(x)).selectAll("text").attr("transform", "translate(-10,0)rotate(-45)").style("text-anchor", "end");
                return x;
            },
            generateBarPlot: function (data) {
                var aidAgency = $("#ddAIDAgency").val();
                var obj = dataviz.generateSVG("#barPlot");
                var svg = obj.svg, width = obj.width, height = obj.height;
                var x = dataviz.genearteX(svg, width, height, data);
                // Add Y axis
                var highestVal = Math.max.apply(Math, data.map(function (o) { return o[aidAgency]; }))
                var y = d3.scaleLinear().domain([0, highestVal]).range([height, 0]);
                svg.append("g").call(d3.axisLeft(y).tickFormat(
                    function (d) {
                        var array = ['', 'k', 'M', 'G', 'T', 'P'];
                        var i = 0;
                        while (d > 1000) {
                            i++;
                            d = d / 1000;
                        }
                        d = d + ' ' + array[i];
                        return d;
                    }
                ));
                // Bars
                svg.selectAll("mybar").data(data).enter().append("rect")
                    .attr("x", function (d) { return x(d.Year); })
                    .attr("y", function (d) { return y(d[aidAgency]); })
                    .attr("width", x.bandwidth())
                    .attr("height", function (d) { return height - y(d[aidAgency]); })
                    .attr("fill", "#4e79a7")
                    .attr("y_value", function (d) { return d[aidAgency] })
                    .attr("x_value", function (d) { return d["Year"] })

                dataviz.toolTip($("#barPlot").find("rect"), "bar");
            },
            generateLineChart: function (data) {
                let colors = { "Female": "#0000d6", "Male": "#008b00", "Total": "#e54304" };
                var obj = dataviz.generateSVG("#lineGraph");
                var svg = obj.svg, width = obj.width, height = obj.height;

                var res = Array.from(d3.group(data, d => d.Sex), ([key, value]) => ({ key, value }));
                var x = dataviz.genearteX(svg, width, height, res[0].value);


                var y = d3.scaleLinear().domain([0, d3.max(data, function (d) { return +d["Poverty Rate"]; })]).range([height, 0]); svg.append("g").call(d3.axisLeft(y));

                // Draw the line
                svg.selectAll(".line").data(res).enter().append("path")
                    .attr("fill", "none")
                    .attr("stroke", function (d) { return colors[d.key]; })
                    .attr("stroke-width", 1.5)
                    .attr("d", function (d) {
                        return d3.line()
                            .x(function (d) { return x(d.Year); })
                            .y(function (d) { return y(+d["Poverty Rate"]); })
                            (d.value)
                    })

                svg.selectAll("myCircles")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("fill", function (d) { return colors[d.Sex] })
                    .attr("stroke", "none")
                    .attr("cx", function (d) { return x(d.Year); })
                    .attr("cy", function (d) { return y(+d["Poverty Rate"]) })
                    .attr("r", 3)
                    .attr("x", function (d) { return d.Year })
                    .attr("y", function (d) { return d["Poverty Rate"] })

                dataviz.toolTip($("#lineGraph").find("circle"), "line");
            },
            generateMap: function () {
                var svg = d3.select("svg#map"),
                    width = +svg.attr("width"),
                    height = +svg.attr("height");

                // Map and projection
                var projection = d3.geoMercator()
                    .scale(70)
                    .center([0, 20])
                    .translate([width / 2, height / 2]);

                // Data and color scale
                var colorScale = d3.scaleThreshold()
                    .domain([0, 25, 50])
                    .range(d3.schemeOrRd[3]);
                var g = svg.append("g");

                // Load external data and boot
                d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
                    .then((data) => {
                        g.selectAll("path")
                            .data(data.features)
                            .enter()
                            .append("path")
                            // draw each country
                            .attr("d", d3.geoPath().projection(projection))
                            // set the color of each country
                            .attr("fill", function (d) {
                                var current = current_stat.find(x => x["Country Code"] === d.id);
                                var comp_color = current ? colorScale(current["Extremely poor"]) : "#e9ecef";
                                return comp_color;
                            }).attr("data-details", function (d) {
                                return JSON.stringify(current_stat.find(x => x["Country Code"] === d.id));
                            });
                        dataviz.toolTip($("#map").find("path"), "map");
                    });
            },
            toolTip: function ($target, type) {
                $target.off("mousemove").on("mousemove", function (e) {
                    var $thisObj = $(this);
                    var text = "";
                    var opacity = 1;
                    switch (type) {
                        case "bar":
                            text = dataviz.getBarDetails($thisObj);
                            break;
                        case "line":
                            text = dataviz.getLineGraphDetails($thisObj);
                            break;
                        case "map":
                            text = dataviz.getMapDetails($thisObj);
                            if (text === null)
                                opacity = 0;
                            break;
                    }

                    $("#tooltip").css({ "top": e.pageY + 10, "left": e.pageX + 10, "opacity": opacity }).html(text)
                });
                $target.off("mouseout").on("mouseout", function (e) {
                    $("#tooltip").css({ "opacity": 0 });
                });
            },
            getMapDetails: function ($target) {
                var details = $target.attr("data-details");
                if (details !== undefined) {
                    details = JSON.parse(details)
                    return `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${details.Country}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${details["Income group"]}</h6>
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item">Extremely Poor: <span class="fw-bold">${details["Extremely poor"]} %</span></li>
                                <li class="list-group-item">Moderately Poor: <span class="fw-bold">${details["Moderately poor"]} %</span></li>
                                <li class="list-group-item">Near Poor: <span class="fw-bold">${details["Near poor"]} %</span></li>
                            </ul>
                        </div>
                    </div>`;
                }
                return null;
            },
            getBarDetails: function ($target) {
                var formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                var aidAgency = $("#ddAIDAgency>option:selected").text().trim();
                var agencyText = aidAgency === "Total" ? "AID from doner countires." : `as AID from ${aidAgency}.`;
                var countryName = $("#ddCountries").val();
                return `<div class="card">
                <div class="card-body">
                <p class="card-text">In ${$target.attr("x_value")} ${countryName} received ${formatter.format($target.attr("y_value"))} ${agencyText}</p>    
                </div>
            </div>`;
            },
            getLineGraphDetails: function ($target) {
                return ` <div class="card">
                <div class="card-body">
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item">Year: <span class="fw-bold">${$target.attr("x")}</span></li>
                        <li class="list-group-item">Extreme Poverty Rate: <span class="fw-bold">${$target.attr("y")} %</span></li>
                    </ul>
                </div>
            </div>`
            }
        };
        dataviz.init();
    };
    $.fn.CallViz = function (p) {
        $.CreateViz(p);
    };
})(jQuery);