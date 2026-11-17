function renderQ1NationalTrend(selectedYear = "All") {
    
    if (!q1Data || q1Data.length === 0) {
        console.error("Q1 data is empty");
        return;
    }

    const annotations = { 2012: "VIC/NSW Policy", 2017: "2017 Policy Adj.", 2020: "COVID-19 Dip" };
    
    const { svg, innerWidth, innerHeight } = createSvg("#chart-q1", 320, 40);

    const navy = "#0b2545";
    const orange = "#e65100";
    const cyan = "#00a8e8";

    const container = d3.select("#chart-q1");
    
    // clean container
    container.selectAll(".d3-tooltip").remove();
    
    //tooltip
    const tooltip = container.append("div")
        .attr("class", "d3-tooltip")
        .style("position", "fixed")
        .style("visibility", "hidden")
        .style("background", "rgba(15, 23, 42, 0.9)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)");

    const yearExtent = d3.extent(q1Data, d => d.year);

    const x = d3.scaleLinear()
        .domain([yearExtent[0] - 0.4, yearExtent[1] + 0.4]) 
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain([30000, d3.max(q1Data, (d) => d.cases) * 1.08 || 45000])
        .range([innerHeight, 0]);

    //render x-axis
    svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(11).tickFormat(d3.format("d")));

    //x-axis title
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 36)
        .attr("text-anchor", "middle")
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .attr("fill", PALETTE.darkText)
        .text("Year");

    //render y-axis
    svg.append("g").call(d3.axisLeft(y).ticks(5));
    
    //y-axis title
    svg.append("text")
        .attr("y", -15)
        .attr("x", 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .attr("fill", PALETTE.darkText)
        .text("Hospitalisations");


    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.cases));
    svg.append("path").datum(q1Data).attr("fill", "none").attr("stroke", PALETTE.navy).attr("stroke-width", 3).attr("d", line);

    //Hover event
    const dots = svg.selectAll(".dot")
        .data(q1Data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.cases))
        .attr("r", (d) => (String(d.year) === selectedYear || annotations[d.year] ? 6 : 4))
        .attr("fill", (d) => String(d.year) === selectedYear || annotations[d.year] ? PALETTE.orange : PALETTE.cyan)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // when mouse hover, dot will zoom bigger
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 8)

            // show tooltip
            let content = `<strong>Year: ${d.year}</strong><br/>Hospitalisations: <strong>${d.cases.toLocaleString()}</strong>`;
            if (annotations[d.year]) {
                content += `<br/><span style="color: #00a8e8;">📌 ${annotations[d.year]}</span>`;
            }

            tooltip.style("visibility", "visible").html(content);
        })
        .on("mousemove", (event) => {
            // Make the tooltip follow the mouse movement
            tooltip.style("top", (event.clientY - 15) + "px")
                   .style("left", (event.clientX + 15) + "px");
        })
        .on("mouseout", function(event, d) {
            // Restore to original state when the mouse moves away
            const isSpecial = String(d.year) === selectedYear || annotations[d.year];
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", isSpecial ? 6 : 4)
                .attr("fill", isSpecial ? PALETTE.orange : PALETTE.cyan);

            tooltip.style("visibility", "hidden");
        });

    svg.selectAll(".dot").data(q1Data).enter().append("circle")
        .attr("cx", (d) => x(d.year)).attr("cy", (d) => y(d.cases))
        .attr("r", (d) => (String(d.year) === selectedYear || annotations[d.year] ? 6 : 4))
        .attr("fill", (d) => String(d.year) === selectedYear || annotations[d.year] ? PALETTE.orange : PALETTE.cyan);

    svg.selectAll(".direct-label").data(q1Data.filter((d) => annotations[d.year] || d.year === 2011 || d.year === 2021 || String(d.year) === selectedYear))
        .enter()
        .append("text")
        .attr("x", (d) => x(d.year))
        .attr("y", (d) => {
            const isEvenYear = d.year % 2 === 0;
            return isEvenYear ? y(d.cases) + 20 : y(d.cases) - 12;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("fill", PALETTE.navy)
        .text((d) => `${d.cases.toLocaleString()}${annotations[d.year] ? ` (${annotations[d.year]})` : ""}`);
}