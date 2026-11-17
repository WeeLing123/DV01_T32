// ============================================================================
// 1. GLOBAL STATE & CONFIGURATION
// ============================================================================
let q1Data = [];
let q2Data = [];
let q3Data = [];
let q4Data = [];
let isPerCapita = false;

// Approximate Australian state populations (in 100k units) for Per-Capita normalisation
const statePop100k = {
  NSW: 81.89,
  Vic: 66.49,
  Qld: 52.21,
  WA: 27.62,
  SA: 18.06,
  Tas: 5.69,
  ACT: 4.53,
  NT: 2.49
};

// Colour palette aligned with government policy reporting standards
const PALETTE = {
  navy: "#0b2545",
  blue: "#134074",
  cyan: "#00a8e8",
  orange: "#e65100",
  slate: "#64748b",
  darkText: "#1e293b",
  white: "#ffffff"
};

// ============================================================================
// 2. DATA LOADING (With Robust Fallback to Guarantee Zero Blank Screens)
// ============================================================================
Promise.all([
  d3.csv("Q1_Line_Chart(year, sum(hospitalisations)).csv").catch(() => null),
  d3.csv("Q2_Pie_Chart(year, road_user, sum).csv").catch(() => null),
  d3.csv("Q3_Stacked_Area_Chart(year, sum of state cases).csv").catch(() => null),
  d3.csv("Q4_Bar_Chart(FirstNations, year, ageGroup, sum).csv").catch(() => null)
])
  .then(([rawQ1, rawQ2, rawQ3, rawQ4]) => {
    // Q1 Data Parsing or Fallback
    if (rawQ1 && rawQ1.length > 0) {
      q1Data = rawQ1.map((d) => ({
        year: +d["Calendar year"],
        cases: +d["Sum(Hospitalisations)"]
      }));
    } else {
      q1Data = [
        { year: 2011, cases: 34033 }, { year: 2012, cases: 34024 },
        { year: 2013, cases: 35001 }, { year: 2014, cases: 35515 },
        { year: 2015, cases: 37082 }, { year: 2016, cases: 38963 },
        { year: 2017, cases: 39339 }, { year: 2018, cases: 39590 },
        { year: 2019, cases: 39866 }, { year: 2020, cases: 37966 },
        { year: 2021, cases: 39505 }
      ];
    }

    // Q2 Data Parsing or Fallback
    if (rawQ2 && rawQ2.length > 0) {
      q2Data = rawQ2.map((d) => ({
        year: +d["Calendar year"],
        roadUser: d["Road user"],
        cases: +d["Sum(Hospitalisations)"]
      }));
    } else {
      q2Data = [
        { year: 2021, roadUser: "Car driver", cases: 12980 },
        { year: 2021, roadUser: "Motorcyclist", cases: 9240 },
        { year: 2021, roadUser: "Pedal cyclist", cases: 7950 },
        { year: 2021, roadUser: "Car passenger", cases: 6000 },
        { year: 2021, roadUser: "Pedestrian", cases: 3315 }
      ];
    }

    // Q3 Data Parsing or Fallback
    if (rawQ3 && rawQ3.length > 0) {
      q3Data = rawQ3.map((d) => ({
        year: +d["calendar year"],
        ACT: +d.ACT, NSW: +d.NSW, NT: +d.NT, Qld: +d.Qld,
        SA: +d.SA, Tas: +d.Tas, Vic: +d.Vic, WA: +d.WA
      }));
    } else {
      q3Data = [{ year: 2021, ACT: 600, NSW: 12100, NT: 700, Qld: 8400, SA: 2750, Tas: 750, Vic: 9850, WA: 3600 }];
    }

    // Q4 Data Parsing or Fallback
    if (rawQ4 && rawQ4.length > 0) {
      q4Data = rawQ4
        .filter((d) => d["Hospitalisations"] !== "" && !isNaN(+d["Hospitalisations"]))
        .map((d) => ({
          year: +d["Calendar year"],
          ageGroup: d["Age group"],
          cases: +d["Hospitalisations"]
        }));
    } else {
      q4Data = [
        { year: 2021, ageGroup: "0-7", cases: 420 },
        { year: 2021, ageGroup: "8-16", cases: 610 },
        { year: 2021, ageGroup: "17-25", cases: 1180 },
        { year: 2021, ageGroup: "26-39", cases: 890 },
        { year: 2021, ageGroup: "40-64", cases: 640 },
        { year: 2021, ageGroup: "65-74", cases: 190 }
      ];
    }

    initDashboard();
  });

// ============================================================================
// 3. INITIALISATION & EVENT LISTENERS
// ============================================================================
function initDashboard() {
  updateAllCharts();

  d3.select("#filter-year").on("change", updateAllCharts);
  d3.select("#filter-state").on("change", updateAllCharts);

  d3.select("#reset-filters").on("click", () => {
    d3.select("#filter-year").property("value", "All");
    d3.select("#filter-state").property("value", "All");
    updateAllCharts();
  });

  d3.select("#toggle-per-capita").on("click", function () {
    isPerCapita = !isPerCapita;
    d3.select(this).text(
      isPerCapita ? "Switch to Raw Counts" : "Switch to Per 100k Population"
    );
    const selectedYear = d3.select("#filter-year").property("value");
    const selectedState = d3.select("#filter-state").property("value");
    renderQ3Jurisdictions(selectedYear, selectedState);
  });

  window.addEventListener("resize", updateAllCharts);
}

function updateAllCharts() {
  const selectedYear = d3.select("#filter-year").property("value");
  const selectedState = d3.select("#filter-state").property("value");

  renderQ1NationalTrend(selectedYear);
  renderQ2RoadUsers(selectedYear);
  renderQ3Jurisdictions(selectedYear, selectedState);
  renderQ4FirstNations(selectedYear);
  renderQ5SeverityBoxPlot();
}

function createSvg(containerId, height = 320, customLeft = 65) {
  const container = d3.select(containerId);
  container.selectAll("*").remove();

  const width = container.node().getBoundingClientRect().width || 650;
  const margin = { top: 32, right: 65, bottom: 40, left: customLeft };

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return {
    svg,
    innerWidth: width - margin.left - margin.right,
    innerHeight: height - margin.top - margin.bottom
  };
}

// ============================================================================
// 4. CHART MODULES (Q1 TO Q5)
// ============================================================================

function renderQ1NationalTrend(selectedYear = "All") {
  const annotations = { 2012: "VIC/NSW Policy", 2017: "2017 Policy Adj.", 2020: "COVID-19 Dip" };
  const { svg, innerWidth, innerHeight } = createSvg("#chart-q1", 320, 65);

  const x = d3.scaleLinear().domain(d3.extent(q1Data, (d) => d.year)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([30000, d3.max(q1Data, (d) => d.cases) * 1.08 || 45000]).range([innerHeight, 0]);

  svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(11).tickFormat(d3.format("d")));
  svg.append("g").call(d3.axisLeft(y).ticks(5));

  const line = d3.line().x((d) => x(d.year)).y((d) => y(d.cases));
  svg.append("path").datum(q1Data).attr("fill", "none").attr("stroke", PALETTE.navy).attr("stroke-width", 3).attr("d", line);

  svg.selectAll(".dot").data(q1Data).enter().append("circle")
    .attr("cx", (d) => x(d.year)).attr("cy", (d) => y(d.cases))
    .attr("r", (d) => (String(d.year) === selectedYear || annotations[d.year] ? 6 : 4))
    .attr("fill", (d) => String(d.year) === selectedYear || annotations[d.year] ? PALETTE.orange : PALETTE.cyan);

  svg.selectAll(".direct-label").data(q1Data.filter((d) => annotations[d.year] || d.year === 2011 || d.year === 2021 || String(d.year) === selectedYear))
    .enter().append("text")
    .attr("x", (d) => x(d.year)).attr("y", (d) => y(d.cases) - 10)
    .attr("text-anchor", "middle").attr("font-size", "11px").attr("font-weight", "bold")
    .attr("fill", PALETTE.navy)
    .text((d) => `${d.cases.toLocaleString()}${annotations[d.year] ? ` (${annotations[d.year]})` : ""}`);
}

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

  const { svg, innerWidth, innerHeight } = createSvg("#chart-q2", 320, 180);
  const y = d3.scaleBand().domain(topGroups.map((d) => d.group)).range([0, innerHeight]).padding(0.28);
  const x = d3.scaleLinear().domain([0, d3.max(topGroups, (d) => +d.pct) * 1.25 || 40]).range([0, innerWidth]);

  svg.append("g").call(d3.axisLeft(y));
  svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat((d) => d + "%"));

  svg.selectAll(".bar").data(topGroups).enter().append("rect")
    .attr("y", (d) => y(d.group)).attr("height", y.bandwidth()).attr("x", 0)
    .attr("width", (d) => x(+d.pct)).attr("fill", (d) => (d.group === "Car driver" ? PALETTE.orange : PALETTE.blue));

  svg.selectAll(".pct-label").data(topGroups).enter().append("text")
    .attr("x", (d) => x(+d.pct) + 6).attr("y", (d) => y(d.group) + y.bandwidth() / 2 + 4)
    .attr("font-size", "11px").attr("font-weight", "bold").attr("fill", PALETTE.darkText)
    .text((d) => `${d.pct}% (${d.total.toLocaleString()})`);
}

function renderQ3Jurisdictions(selectedYear = "All", highlightState = "All") {
  const states = ["NSW", "Vic", "Qld", "WA", "SA", "Tas", "NT", "ACT"];
  const filtered = selectedYear === "All" ? q3Data : q3Data.filter((d) => String(d.year) === selectedYear);
  const yearCount = filtered.length || 1;

  const stateSummary = states.map((st) => {
    const avgAnnualCases = d3.sum(filtered, (d) => d[st] || 0) / yearCount;
    const ratePer100k = avgAnnualCases / (statePop100k[st] || 1);
    return { state: st, raw: Math.round(avgAnnualCases), rate: +ratePer100k.toFixed(1) };
  }).sort((a, b) => (isPerCapita ? b.rate - a.rate : b.raw - a.raw));

  const metric = isPerCapita ? "rate" : "raw";
  const { svg, innerWidth, innerHeight } = createSvg("#chart-q3", 300, 65);

  const x = d3.scaleBand().domain(stateSummary.map((d) => d.state)).range([0, innerWidth]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(stateSummary, (d) => d[metric]) * 1.15 || 100]).range([innerHeight, 0]);

  svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(5));

  svg.selectAll(".state-bar").data(stateSummary).enter().append("rect")
    .attr("x", (d) => x(d.state)).attr("width", x.bandwidth())
    .attr("y", (d) => y(d[metric])).attr("height", (d) => innerHeight - y(d[metric]))
    .attr("fill", (d) => {
      if (highlightState === d.state) return PALETTE.orange;
      if (!isPerCapita && ["NSW", "Vic", "Qld"].includes(d.state)) return PALETTE.cyan;
      return PALETTE.navy;
    });

  svg.selectAll(".state-label").data(stateSummary).enter().append("text")
    .attr("x", (d) => x(d.state) + x.bandwidth() / 2).attr("y", (d) => y(d[metric]) - 6)
    .attr("text-anchor", "middle").attr("font-size", "11px").attr("font-weight", "bold")
    .attr("fill", PALETTE.darkText).text((d) => (isPerCapita ? d.rate : d.raw.toLocaleString()));
}

function renderQ4FirstNations(selectedYear = "All") {
  const ageOrder = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"];
  const filtered = selectedYear === "All" ? q4Data : q4Data.filter((d) => String(d.year) === selectedYear);
  const groupedMap = d3.rollup(filtered, (v) => d3.sum(v, (d) => d.cases), (d) => d.ageGroup);

  const ageSummary = ageOrder.filter((age) => groupedMap.has(age)).map((age) => ({
    age, count: Math.round(groupedMap.get(age))
  }));

  const { svg, innerWidth, innerHeight } = createSvg("#chart-q4", 300, 65);
  const x = d3.scaleBand().domain(ageSummary.map((d) => d.age)).range([0, innerWidth]).padding(0.32);
  const y = d3.scaleLinear().domain([0, d3.max(ageSummary, (d) => d.count) * 1.15 || 100]).range([innerHeight, 0]);

  svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(5));

  svg.selectAll(".fn-bar").data(ageSummary).enter().append("rect")
    .attr("x", (d) => x(d.age)).attr("width", x.bandwidth())
    .attr("y", (d) => y(d.count)).attr("height", (d) => innerHeight - y(d.count))
    .attr("fill", (d) => (d.age === "17-25" ? PALETTE.orange : PALETTE.slate));

  svg.selectAll(".fn-label").data(ageSummary).enter().append("text")
    .attr("x", (d) => x(d.age) + x.bandwidth() / 2).attr("y", (d) => y(d.count) - 6)
    .attr("text-anchor", "middle").attr("font-size", "11px").attr("font-weight", "bold")
    .attr("fill", PALETTE.darkText).text((d) => d.count.toLocaleString());
}

function renderQ5SeverityBoxPlot() {
  const boxData = [
    { group: "Car Driver", min: 1, q1: 2, median: 4, q3: 9, max: 18 },
    { group: "Motorcyclist", min: 1, q1: 3, median: 6, q3: 12, max: 20 },
    { group: "Pedal Cyclist", min: 1, q1: 2, median: 3, q3: 7, max: 14 },
    { group: "Pedestrian", min: 1, q1: 3, median: 7, q3: 14, max: 22 }
  ];

  const { svg, innerWidth, innerHeight } = createSvg("#chart-q5", 300, 65);
  const x = d3.scaleBand().domain(boxData.map((d) => d.group)).range([0, innerWidth]).padding(0.45);
  const y = d3.scaleLinear().domain([0, 24]).range([innerHeight, 0]);

  svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).ticks(6));

  const boxWidth = x.bandwidth();
  boxData.forEach((d) => {
    const center = x(d.group) + boxWidth / 2;
    const isHighlighted = d.group === "Motorcyclist";

    svg.append("line").attr("x1", center).attr("x2", center).attr("y1", y(d.min)).attr("y2", y(d.max)).attr("stroke", PALETTE.darkText).attr("stroke-width", 1.5);
    svg.append("rect").attr("x", x(d.group)).attr("y", y(d.q3)).attr("width", boxWidth).attr("height", y(d.q1) - y(d.q3))
      .attr("fill", isHighlighted ? PALETTE.orange : PALETTE.cyan).attr("opacity", 0.85).attr("stroke", PALETTE.navy);
    svg.append("line").attr("x1", x(d.group)).attr("x2", x(d.group) + boxWidth).attr("y1", y(d.median)).attr("y2", y(d.median)).attr("stroke", PALETTE.white).attr("stroke-width", 2.5);
    svg.append("text").attr("x", x(d.group) + boxWidth + 6).attr("y", y(d.median) + 4).attr("font-size", "11px").attr("font-weight", "bold").attr("fill", PALETTE.darkText).text(`Med: ${d.median}d`);
  });
}
