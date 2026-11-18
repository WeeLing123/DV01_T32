function drawQ5boxplot(selectedYear = "All") {
    const containerId = "#chart-q5";
    const container = d3.select(containerId);
    container.selectAll("*").remove();
    container.html("");

    const width = Math.max(container.node().getBoundingClientRect().width || 600, 500);
    const height = 340;
    const margin = { top: 30, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("background-color", "#ffffff")
        .style("border-radius", "8px")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip
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

    // Filter Q5 data based on the provided year
    let data = q5Data || [];
    if (selectedYear !== "All") {
        data = data.filter(d => String(d.year) === String(selectedYear));
    }

    // Filter out rows where the number of bed-days is empty or non-numeric.
    data = data.filter(d => !isNaN(d.bedDays) && d.bedDays !== null && d.roadUser);

    const globalRoadUserOrder = [
        "Car Occupants",
        "Motorcyclists",
        "Pedal Cyclists",
        "Pedestrians",
        "Heavy Vehicles & Buses",
        "Others"
    ];

    // Group by 'Road User' category and calculate box plot statistics (Min, Q1, Median, Q3, Max)
    const groupedData = d3.rollup(
        data,
        v => {
            // Extract all bed-days and sort them in ascending order.
            const values = v.map(d => d.bedDays).sort(d3.ascending);
            if (values.length === 0) return null;

            const q1 = d3.quantile(values, 0.25);
            const median = d3.quantile(values, 0.5);
            const q3 = d3.quantile(values, 0.75);
            const iqr = q3 - q1;
            
            // The upper and lower whisker boundaries of a traditional box plot (typically limited to 1.5 * IQR, or otherwise set to the minimum/maximum values)
            const min = d3.min(values);
            const max = d3.max(values);

            return {
                count: values.length,
                min: min,
                q1: q1,
                median: median,
                q3: q3,
                max: max,
                values: values
            };
        },
        d => d.roadUser
    );

    // Convert to an array format for D3 binding
    const boxData = Array.from(groupedData, ([group, stats]) => ({
        group,
        ...stats
    })).filter(d => d !== null && d.count > 0);

    if (boxData.length === 0) {
        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight / 2)
            .attr("text-anchor", "middle")
            .style("fill", "#64748b")
            .text("No bed days data available for the selected filter.");
        return;
    }

    // Scale Settings
    const x = d3.scaleBand()
        .domain(globalRoadUserOrder)
        .range([0, innerWidth])
        .padding(0.4);

    const maxBedDays = d3.max(boxData, d => d.max) || 100;
    const y = d3.scaleLinear()
        .domain([0, maxBedDays * 1.1])
        .range([innerHeight, 0])
        .nice();

    // render x-axis
    svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-15)")
        .style("text-anchor", "end")
        .style("font-size", "11px");

    //x-axis title
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .attr("fill", PALETTE.darkText)
        .text("Road User");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(6));

    //y-axis title
    svg.append("text")
        .attr("y", -15)
        .attr("x", 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "11.5px")
        .attr("font-weight", "600")
        .attr("fill", PALETTE.darkText)
        .text("Bed Days (Excluding <30d deaths)");

    // Draw box plot elements
    const boxWidth = x.bandwidth();

    const gBoxes = svg.selectAll(".box-group")
        .data(boxData)
        .enter()
        .append("g")
        .attr("class", "box-group")
        .attr("transform", d => `translate(${x(d.group)}, 0)`);

    // Vertical whisker line (from min to max)
    gBoxes.append("line")
        .attr("x1", boxWidth / 2)
        .attr("x2", boxWidth / 2)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.max))
        .attr("stroke", "#0b2545")
        .attr("stroke-width", 1.5);

    // Transverse Filament Cap (Min cap)
    gBoxes.append("line")
        .attr("x1", boxWidth * 0.25)
        .attr("x2", boxWidth * 0.75)
        .attr("y1", d => y(d.min))
        .attr("y2", d => y(d.min))
        .attr("stroke", "#0b2545")
        .attr("stroke-width", 1.5);

    // Max cap
    gBoxes.append("line")
        .attr("x1", boxWidth * 0.25)
        .attr("x2", boxWidth * 0.75)
        .attr("y1", d => y(d.max))
        .attr("y2", d => y(d.max))
        .attr("stroke", "#0b2545")
        .attr("stroke-width", 1.5);

    // IQR box (rectangle from Q3 to Q1)
    gBoxes.append("rect")
        .attr("x", 0)
        .attr("y", d => y(d.q3))
        .attr("width", boxWidth)
        .attr("height", d => Math.abs(y(d.q1) - y(d.q3)))
        .attr("fill", "#00a8e8")
        .attr("fill-opacity", 0.75)
        .attr("stroke", "#0b2545")
        .attr("stroke-width", 1.5)
        .attr("rx", 3);

    // Median line inside the box
    gBoxes.append("line")
        .attr("x1", 0)
        .attr("x2", boxWidth)
        .attr("y1", d => y(d.median))
        .attr("y2", d => y(d.median))
        .attr("stroke", "#e65100")
        .attr("stroke-width", 2.5);

    // Add a transparent interactive hotspot (a hover-trigger area that ensures the tooltip is triggered reliably whenever the mouse is positioned over the entire box).
    gBoxes.append("rect")
        .attr("x", -5)
        .attr("y", d => y(d.max))
        .attr("width", boxWidth + 10)
        .attr("height", d => Math.abs(y(d.min) - y(d.max)))
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this.parentNode).select("rect")
                .attr("fill-opacity", 0.95)
                .attr("stroke", "#e65100");

            tooltip.style("visibility", "visible")
                .html(`
                    <strong>${d.group}</strong><br/>
                    Sample Count: ${d.count.toLocaleString()}<br/>
                    ------------------------<br/>
                    Max: ${d.max} days<br/>
                    Q3 (75%): ${d.q3.toFixed(1)} days<br/>
                    <strong>Median: ${d.median.toFixed(1)} days</strong><br/>
                    Q1 (25%): ${d.q1.toFixed(1)} days<br/>
                    Min: ${d.min} days
                `);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.clientY - 15) + "px")
                   .style("left", (event.clientX + 15) + "px");
        })
        .on("mouseout", function(event, d) {
            d3.select(this.parentNode).select("rect")
                .attr("fill-opacity", 0.75)
                .attr("stroke", "#0b2545");

            tooltip.style("visibility", "hidden");
        });
}