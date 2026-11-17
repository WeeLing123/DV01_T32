function renderQ4FirstNations(selectedYear = "All") {
    const ageOrder = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
    const filtered = selectedYear === "All" ? q4Data : q4Data.filter((d) => String(d.year) === selectedYear);
    const groupedMap = d3.rollup(filtered, (v) => d3.sum(v, (d) => d.cases), (d) => d.ageGroup);

    const ageSummary = ageOrder.filter((age) => groupedMap.has(age)).map((age) => ({
        age, count: Math.round(groupedMap.get(age))
    }));

    const { svg, innerWidth, innerHeight } = createSvg("#chart-q4", 300, 65);

    const container = d3.select("#chart-q4");
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

    const x = d3.scaleBand().domain(ageSummary.map((d) => d.age)).range([0, innerWidth]).padding(0.32);
    const y = d3.scaleLinear().domain([0, d3.max(ageSummary, (d) => d.count) * 1.15 || 100]).range([innerHeight, 0]);

    //render x-axis
    svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));

    //x-axis title
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 36)
        .attr("text-anchor", "middle")
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .attr("fill", PALETTE.darkText)
        .text("Age Group");

    //render y-axis
    svg.append("g").call(d3.axisLeft(y).ticks(5));

    //y-axis title
    svg.append("text")
        .attr("y", -15)
        .attr("x", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .attr("fill", PALETTE.darkText)
        .text("Hospitalisations");


    svg.selectAll(".fn-bar").data(ageSummary).enter().append("rect")
        .attr("x", (d) => x(d.age)).attr("width", x.bandwidth())
        .attr("y", (d) => y(d.count)).attr("height", (d) => innerHeight - y(d.count))
        .attr("fill", (d) => (d.age === "17-25" ? PALETTE.orange : PALETTE.slate))
        .attr("rx", 3)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // On hover: The bar color highlights to a bright cyan-blue or a dark shade, with a subtle change in transparency.
            d3.select(this)
                .transition()
                .duration(150)
                .attr("fill", PALETTE.cyan);

            // show tooltip
            let content = `<strong>Age Group: ${d.age}</strong><br/>Hospitalisations: <strong>${d.count.toLocaleString()}</strong>`;
            if (d.age === "17-25") {
                content += `<br/><span style="color: #e65100;">🔥 Peak Youth Vulnerability</span>`;
            }

            tooltip.style("visibility", "visible").html(content);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.clientY - 15) + "px")
                   .style("left", (event.clientX + 15) + "px");
        })
        .on("mouseout", function(event, d) {
            // Revert to original state when the mouse moves away: remain a striking orange for ages 17–25, and slate for all others.
            d3.select(this)
                .transition()
                .duration(150)
                .attr("fill", d.age === "17-25" ? PALETTE.orange : PALETTE.slate);

            tooltip.style("visibility", "hidden");
        });

    svg.selectAll(".fn-label").data(ageSummary).enter().append("text")
        .attr("x", (d) => x(d.age) + x.bandwidth() / 2).attr("y", (d) => y(d.count) - 6)
        .attr("text-anchor", "middle").attr("font-size", "11px").attr("font-weight", "bold")
        .attr("fill", PALETTE.darkText).text((d) => d.count.toLocaleString());
}