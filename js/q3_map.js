function drawQ3Map() {
    const container = d3.select("#chart-container");
    container.html(""); //clear container

    const filterSelect = d3.select("#jurisdiction-filter");
    filterSelect.html(""); //clear filter select

    const width = 800;
    const height = 500;

    // create svg container
    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("background-color", "#f8fafc")
        .style("border-radius", "8px");

    // Tooltip
    const tooltip = container.append("div")
        .style("position", "fixed")
        .style("visibility", "hidden")
        .style("background", "rgba(15, 23, 42, 0.9)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    // Mapping of state names to CSV column names
    const stateNameToCode = {
        "Australian Capital Territory": "ACT",
        "New South Wales": "NSW",
        "Northern Territory": "NT",
        "Queensland": "Qld",
        "South Australia": "SA",
        "Tasmania": "Tas",
        "Victoria": "Vic",
        "Western Australia": "WA"
    };

    // Simultaneously load CSV data and stable Australian planar GeoJSON data
    Promise.all([
        d3.csv("data/Q3_Stacked_Area_Chart(year, sum of state cases).csv"),
        d3.json("https://raw.githubusercontent.com/anthwri/GeoJson-Data/master/australian-states.json")
    ]).then(([csvData, geojson]) => {
        
        //get year
        const years = csvData.map(d => d["calendar year"]);
        
        filterSelect.append("option").attr("value", "ALL").text("All Years (2011-2021 Total)");
        years.forEach(y => {
            filterSelect.append("option").attr("value", y).text(y);
        });


        // Use a standard 2D planar projection
        const projection = d3.geoMercator().fitSize([width - 80, height - 60], geojson);
        const pathGenerator = d3.geoPath().projection(projection);

        // Blue gradient color scale
        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateBlues);

        const mapGroup = svg.append("g");
        const labelGroup = svg.append("g");

        drawLegend(svg, width, height);
        const legendGroup = svg.select(".map-legend");

        function updateMap(selectedFilter) {
            let stateCases = {};
            let displayTitle = "";

            if(selectedFilter === "ALL"){
                displayTitle = "All Years (2011-2021)";

                csvData.forEach(row => {
                    Object.keys(row).forEach(k => {
                        if(k !== "calendar year"){
                            stateCases[k] = (stateCases[k] || 0) + (+row[k]);
                        }
                    });
                });
            }else{
                displayTitle = `Year: ${selectedFilter}`;
                const rowData = csvData.find(d => d["calendar year"] === selectedFilter);
                if(!rowData) return;
                Object.keys(rowData).forEach(k => {
                    if(k !== "calendar year"){
                        stateCases[k] = +rowData[k];
                    }
                });
            }
            
            //calculate min and max
            const values = Object.values(stateCases);
            const minVal = d3.min(values);
            const maxVal = d3.max(values);
            colorScale.domain([minVal, maxVal]);

            //update legend values
            legendGroup.select(".legend-low")
                .text(minVal.toLocaleString());
            
            legendGroup.select(".legend-high")
                .text(maxVal.toLocaleString());

            //find current filter maximum state and highlight
            let maxStateCode = Object.keys(stateCases).reduce((a, b) => stateCases[a] > stateCases[b] ? a : b, "");

            mapGroup.selectAll("path")
                .data(geojson.features)
                .join("path")
                .attr("d", pathGenerator)
                .attr("fill", d => {
                    const props = d.properties;
                    const fullName = props.STATE_NAME || props.state_name || props.NAME || props.name || "";
                    const code = stateNameToCode[fullName] || fullName;
                    const cases = stateCases[code] || 0;
                    return colorScale(cases);
                })
                .attr("stroke", d => {
                    const props = d.properties;
                    const fullName = props.STATE_NAME || props.state_name || props.NAME || props.name || "";
                    const code = stateNameToCode[fullName] || fullName;
                    return code === maxStateCode ? "#ef4444" : "#475569";
                })
                .attr("stroke-width", d => {
                    const props = d.properties;
                    const fullName = props.STATE_NAME || props.state_name || props.NAME || props.name || "";
                    const code = stateNameToCode[fullName] || fullName;
                    return code === maxStateCode ? 3 : 1;
                })
                .on("mouseover", function(event, d){
                    const props = d.properties;
                    const fullName = props.STATE_NAME || props.state_name || props.NAME || props.name || "";
                    const code = stateNameToCode[fullName] || fullName;
                    const cases = stateCases[code] !== undefined ? stateCases[code].toLocaleString() : "N/A";

                    tooltip.style("visibility", "visible")
                        .html(`<strong>${fullName} (${code})</strong><br>${displayTitle}<br>Cases: <strong>${cases}</strong>`);
                })
                .on("mousemove", (event) => {
                    tooltip.style("top", (event.clientY -15) + "px")
                        .style("left", (event.clientX + 15) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("visibility", "hidden");
                });

            labelGroup.selectAll("text")
                .data(geojson.features)
                .join("text")
                .attr("transform", d => {
                    const centroid = pathGenerator.centroid(d);
                    return `translate(${centroid[0]}, ${centroid[1]})`;
                })
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(d => {
                    const props = d.properties;
                    const fullName = props.STATE_NAME || props.state_name || props.NAME || props.name || "";
                    const code = stateNameToCode[fullName] || fullName;
                    return code;
                })
                .style("font-size", "11px")
                .style("font-weight", "600")
                .style("fill", "#0f172a")
                .style("pointer-events", "none")
            }

        // Render all data by default
        updateMap("ALL");

        // Dynamically update map colors when switching the dropdown menu selection
        filterSelect.on("change", function() {
            updateMap(this.value);
        });

    }).catch(error => {
        console.error("Error loading map data:", error);
        container.append("p")
            .style("color", "red")
            .text("Failed to load map data: " + error.message);
    });

    //legend
    function drawLegend(svg, width, height){
        const legendWidth = 140;
        const legendHeight = 12;
        const legendX = width - 170;
        const legendY = height - 40;

        const legendGroup = svg.append("g")
            .attr("class", "map-legend")
            .attr("transform", `translate(${legendX}, ${legendY})`);

        legendGroup.append("rect")
            .attr("width", legendWidth + 30)
            .attr("height", 45)
            .attr("x", -15)
            .attr("y", -20)
            .attr("rx", 6)
            .attr("fill", "#ffffff")
            .attr("stroke", "#cbd5e1")

        legendGroup.append("text")
            .attr("x", 0)
            .attr("y", -6)
            .style("font-size", "10px")
            .style("font-weight", "600")
            .style("fill", "#475569")
            .text("Injury Case Density");

        //Gradient Bar Definition
        const defs = svg.append("defs");

        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("y1", "0%")
            .attr("y2", "100%")

        linearGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", d3.interpolateBlues(0.1));

        linearGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d3.interpolateBlues(1.0));

        legendGroup.append("rect")
            .attr("class", "legend-bar")
            .attr("width", legendWidth)
            .attr("height",legendHeight)
            .attr("x", 0)
            .attr("y", 2)
            .attr("rx", 2)
            .attr("fill", "url(#legend-gradient)")

        legendGroup.append("text")
            .attr("class", "legend-low")
            .attr("x", 0)
            .attr("y", 26)
            .style("font-size", "9px")
            .style("fill", "#64748b")
            .text("Low");

        legendGroup.append("text")
            .attr("class", "legend-high")
            .attr("x", legendWidth)
            .attr("y", 26)
            .style("text-anchor", "end")
            .style("font-size", "9px")
            .style("fill", "#64748b")
            .text("High");
    }
}