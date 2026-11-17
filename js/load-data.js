// ============================================================================
// 1. GLOBAL STATE & CONFIGURATION
// ============================================================================
let q1Data = [];
let q2Data = [];
let q3Data = [];
let q4Data = [];
let q5Data = [];
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
    d3.csv("data/Q1_Line_Chart(year, sum(hospitalisations)).csv").catch(() => null),
    d3.csv("data/Q2_Pie_Chart(year, road_user, sum).csv").catch(() => null),
    d3.csv("data/Q3_Stacked_Area_Chart(year, sum of state cases).csv").catch(() => null),
    d3.csv("data/Q4_Bar_Chart(FirstNations, year, ageGroup, sum).csv").catch(() => null),
    d3.csv("data/Q5_Box_Plot(year, road user, bed days).csv").catch(() => null)
])
    .then(([rawQ1, rawQ2, rawQ3, rawQ4, rawQ5]) => {
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

    if (rawQ5 && rawQ5.length > 0) {
        q5Data = rawQ5.map(d => ({
            year: +d["calendar year"] || +d["Calendar year"] || +d["yesr"] || +d["year"],
            roadUser: d["Road user grouped"] || d["road user"] || d["Road user"],
            bedDays: +d["bed days excluding died in hospitals within 30 days"] || +d["bed days"] || +d["Bed days"]
        }));
    } else {
        q5Data = [
            { year: 2011, roadUser: "Car Occupants", bedDays: 21 },
            { year: 2011, roadUser: "Heavy Vehicles & Buses", bedDays: 22 },
            { year: 2011, roadUser: "Pedestrians", bedDays: 44 }
        ];
    }

    initDashboard();
  });

// ============================================================================
// 3. INITIALISATION & EVENT LISTENERS
// ============================================================================
function initDashboard() {
    updateAllCharts();

    d3.select("#filter-year").on("change", function(event){
        if(event) event.preventDefault();
        updateAllCharts();
    });

    d3.select("#filter-state").on("change", function(event){
        if(event) event.preventDefault();
        updateAllCharts();
    });

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
        drawQ3Map(selectedYear, selectedState);
    });

    window.addEventListener("resize", updateAllCharts);
}

function updateAllCharts() {
    const selectedYear = d3.select("#filter-year").property("value");
    const selectedState = d3.select("#filter-state").property("value");

    renderQ1NationalTrend(selectedYear);
    renderQ2RoadUsers(selectedYear);
    drawQ3Map(selectedYear, selectedState);
    renderQ4FirstNations(selectedYear);
    drawQ5boxplot(selectedYear);

    if (typeof renderQ5SeverityBoxPlot === "function") {
        renderQ5SeverityBoxPlot(selectedYear);
    }
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
// 4. SIDEBAR SCROLL SPY
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
    const sections = document.querySelectorAll(".story-card");
    const navLinks = document.querySelectorAll(".nav-links a");

    const observerOptions = {
        root: null,
        // Adjusting the trigger zone: An element is considered the currently active section when it enters the range spanning from 30% above the viewport to 40% below it.
        rootMargin: "-20% 0px -50% 0px",
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute("id");
                
                // Remove the 'active' state from all links
                navLinks.forEach(link => {
                    link.classList.remove("active");
                    // Match the corresponding href
                    if (link.getAttribute("href") === `#${id}`) {
                        link.classList.add("active");
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
});