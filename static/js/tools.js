async function loadVisitorNetworkDetails() {
  const fields = {
    ip: document.getElementById("visitor-ip"),
    country: document.getElementById("visitor-country"),
    city: document.getElementById("visitor-city"),
    org: document.getElementById("visitor-org"),
    asn: document.getElementById("visitor-asn"),
    browser: document.getElementById("visitor-browser"),
    agent: document.getElementById("visitor-agent"),
    tableIp: document.getElementById("table-ip"),
    tableCountry: document.getElementById("table-country"),
    tableRegion: document.getElementById("table-region"),
    tableCity: document.getElementById("table-city"),
    tableTimezone: document.getElementById("table-timezone"),
    tableOrg: document.getElementById("table-org"),
    tableAsn: document.getElementById("table-asn"),
    tableLanguage: document.getElementById("table-language")
  };

  if (!fields.ip) return;

  fields.browser.textContent = navigator.platform || "Detected";
  fields.agent.textContent = navigator.userAgent;
  fields.tableLanguage.textContent = navigator.language || "Unknown";

  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) throw new Error("IP lookup failed");

    const data = await response.json();

    const ip = data.ip || "Unknown";
    const country = data.country_name || "Unknown";
    const city = data.city || "Unknown";
    const region = data.region || "Unknown";
    const timezone = data.timezone || "Unknown";
    const org = data.org || data.network || "Unknown";
    const asn = data.asn || "Unknown";

    fields.ip.textContent = ip;
    fields.country.textContent = country;
    fields.city.textContent = city + ", " + region;
    fields.org.textContent = org;
    fields.asn.textContent = "ASN: " + asn;

    fields.tableIp.textContent = ip;
    fields.tableCountry.textContent = country;
    fields.tableRegion.textContent = region;
    fields.tableCity.textContent = city;
    fields.tableTimezone.textContent = timezone;
    fields.tableOrg.textContent = org;
    fields.tableAsn.textContent = asn;
  } catch (error) {
    fields.ip.textContent = "Unavailable";
    fields.country.textContent = "Unavailable";
    fields.city.textContent = "Browser/API lookup blocked";
    fields.org.textContent = "Unavailable";
    fields.asn.textContent = "Unavailable";
    fields.tableIp.textContent = "Unavailable";
    fields.tableCountry.textContent = "Unavailable";
    fields.tableRegion.textContent = "Unavailable";
    fields.tableCity.textContent = "Unavailable";
    fields.tableTimezone.textContent = "Unavailable";
    fields.tableOrg.textContent = "Unavailable";
    fields.tableAsn.textContent = "Unavailable";
  }
}

loadVisitorNetworkDetails();
