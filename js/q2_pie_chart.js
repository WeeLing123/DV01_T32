function renderQ2RoadUsers(selectedYear = "All") {
    const filtered = selectedYear === "All" ? q2Data : q2Data.filter((d) => String(d.year) === selectedYear);
    const grouped = Array.from(
        d3.rollup(filtered, (v) => d3.sum(v, (d) => d.cases), (d) => d.roadUser),
        ([group, total]) => ({ group, total })
    ).sort((a, b) => b.total - a.total);

    const grandTotal = d3.sum(grouped, (d) => d.total);
    const topGroups = grouped.slice(0, 7).map((d) => ({
        group: d.group, total: d.total,
        pct: grandTotal > 0 ? ((d.total / grandTotal) * 100).toFixed(2) : "0.00"
    }));

    //calculate percentage
    grouped.forEach(d => {
        d.pct = grandTotal > 0 ? (d.total / grandTotal) * 100 : 0;
    });

    const container = d3.select("#chart-q2");
    container.selectAll("*").remove();

    const width = container.node().getBoundingClientRect().width || 650;
    const height = 360;

    const svg = container
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

    //tooltip
    const tooltip = container.append("div")
        .style("position", "fixed")
        .style("visibility", "hidden")
        .style("background", "rgba(15, 23, 42, 0.9)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    const pieCenterX = width * 0.32;
    const pieCenterY = height / 2;
    const radius = Math.min(height * 0.38, 130);

    const chartGroup = svg
        .append("g")
        .attr("transform", `translate(${pieCenterX}, ${pieCenterY})`);

    // Define colour palette
    const colors = [
        PALETTE.orange,
        PALETTE.navy,
        PALETTE.cyan,
        "#64748b",
        "#94a3b8",
        "#eab308",
        "#0f766e"
    ];

    const color = d3.scaleOrdinal()
        .domain(grouped.map(d => d.group))
        .range(colors);

    // Create pie layout
    const pie = d3.pie()
        .value(d => d.total)
        .sort(null);

    const data_ready = pie(grouped);

    // Create arc generator
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius + 10);

    const arcHover = d3.arc()
        .innerRadius(0)
        .outerRadius(radius + 10);

    const labelArc = d3.arc()
        .innerRadius(radius * 0.65)
        .outerRadius(radius * 0.65);

    chartGroup.selectAll("path")
        .data(data_ready)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.group))
        .attr("stroke", PALETTE.white)
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("d", arcHover);

            tooltip.style("visibility", "visible")
                .html(`
                    <strong>${d.data.group}</strong><br/>
                    Cases: <strong>${d.data.total.toLocaleString()}</strong><br/>
                    Share: <strong>${d.data.pct.toFixed(2)}%</strong>
                `);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.clientY - 15) + "px")
                   .style("left", (event.clientX + 15) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("d", arc);

            tooltip.style("visibility", "hidden");
        });

    // Add percentage labels
    chartGroup.selectAll(".percentage-label")
        .data(data_ready)
        .enter()
        .append("text")
        .attr("transform", d =>
            `translate(${labelArc.centroid(d)})`
        )
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("fill", PALETTE.white)
        .text(d =>
            d.data.pct >= 5
                ? `${d.data.pct.toFixed(1)}%` : ""
        );

    const legendX = width * 0.58;
    const legendY = 30;

    // Create legend
    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    const legendItems = legend.selectAll(".legend-item")
        .data(grouped)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) =>
            `translate(0, ${i * 26})`
        );

    legendItems.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", d => color(d.group));

    legendItems.append("text")
        .attr("x", 19)
        .attr("y", 10)
        .attr("font-size", "11px")
        .attr("fill", PALETTE.darkText)
        .text(d =>
            `${d.group}: ${d.total.toLocaleString()} (${d.pct.toFixed(2)}%)`
        );
}
