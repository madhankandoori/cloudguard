let currency = "USD";
let money = new Intl.NumberFormat("en-GB", { style: "currency", currency });
let allResources = [];
let statusFilter = "All";

function setCurrency(newCurrency) {
  currency = newCurrency;
  money = new Intl.NumberFormat("en-GB", { style: "currency", currency });
}

async function loadDashboard() {
  const [summaryResponse, resourcesResponse, settingsResponse] = await Promise.all([
    fetch("/api/summary"),
    fetch("/api/resources"),
    fetch("/api/settings")
  ]);
  const summary = await summaryResponse.json();
  allResources = await resourcesResponse.json();
  const settings = await settingsResponse.json();
  setCurrency(settings.currency);

  document.querySelector("#resource-count").textContent = summary.resourceCount;
  document.querySelector("#total-monthly-cost").textContent = money.format(summary.totalMonthlyCost);
  document.querySelector("#review-count").textContent = summary.reviewCount;
  document.querySelector("#possible-savings").textContent = money.format(summary.possibleSavings);
  document.querySelector("#review-limit").value = settings.reviewLimit;
  document.querySelector("#monthly-budget").value = settings.monthlyBudget;
  document.querySelector("#currency").value = settings.currency;
  renderBudgetStatus(summary.totalMonthlyCost, settings.monthlyBudget);
  renderRecommendations(summary.recommendations);
  renderCostChart();
  renderResources();
}

function renderRecommendations(recommendations) {
  const list = document.querySelector("#recommendations");
  list.innerHTML = "";
  if (recommendations.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Everything looks healthy. No recommendations right now.";
    list.append(item);
    return;
  }
  recommendations.forEach(({ name, recommendation }) => {
    const item = document.createElement("li");
    const resourceName = document.createElement("strong");
    resourceName.textContent = `${name}: `;
    item.append(resourceName, recommendation);
    list.append(item);
  });
}

function renderBudgetStatus(totalMonthlyCost, monthlyBudget) {
  const status = document.querySelector("#budget-status");
  const difference = monthlyBudget - totalMonthlyCost;
  if (difference >= 0) {
    status.textContent = `You are ${money.format(difference)} under your ${money.format(monthlyBudget)} monthly budget.`;
  } else {
    status.textContent = `You are ${money.format(Math.abs(difference))} over your ${money.format(monthlyBudget)} monthly budget.`;
  }
}

function renderCostChart() {
  const chart = document.querySelector("#cost-chart");
  if (allResources.length === 0) {
    chart.innerHTML = "<p>Add a resource to see its cost here.</p>";
    return;
  }
  const highestCost = Math.max(...allResources.map(resource => resource.monthlyCost), 1);
  chart.innerHTML = allResources.map(resource => {
    const width = (resource.monthlyCost / highestCost) * 100;
    return `<div class="cost-row">
      <div class="cost-label"><span>${resource.name}</span><strong>${money.format(resource.monthlyCost)}</strong></div>
      <div class="cost-track" role="progressbar" aria-label="${resource.name} monthly cost" aria-valuemin="0" aria-valuemax="${highestCost}" aria-valuenow="${resource.monthlyCost}">
        <div class="cost-bar ${resource.status === "Healthy" ? "healthy-bar" : "review-bar"}" style="width: ${width}%"></div>
      </div>
    </div>`;
  }).join("");
}

function renderResources() {
  const searchText = document.querySelector("#search-input").value.toLowerCase().trim();
  const resources = allResources.filter(resource => {
    const matchesSearch = Object.values(resource).join(" ").toLowerCase().includes(searchText);
    const matchesStatus = statusFilter === "All" || resource.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const table = document.querySelector("#resource-table");
  if (resources.length === 0) {
    table.innerHTML = `<tr><td colspan="7">No resources match your search.</td></tr>`;
    return;
  }
  table.innerHTML = resources.map(resource => `
    <tr>
      <td><strong>${resource.name}</strong><br><small>${resource.id}</small></td>
      <td>${resource.type}</td><td>${resource.region}</td><td>${money.format(resource.monthlyCost)}</td>
      <td><span class="status ${resource.status === "Healthy" ? "healthy" : "review"}">${resource.status}</span></td>
      <td>${resource.reason}</td>
      <td><div class="row-actions"><button class="edit-button" data-id="${resource.id}">Edit</button><button class="delete-button" data-id="${resource.id}" data-name="${resource.name}">Delete</button></div></td>
    </tr>`).join("");

  document.querySelectorAll(".delete-button").forEach(button => {
    button.addEventListener("click", () => deleteResource(button.dataset.id, button.dataset.name));
  });
  document.querySelectorAll(".edit-button").forEach(button => {
    button.addEventListener("click", () => editResource(button.dataset.id));
  });
}

async function editResource(id) {
  const resource = allResources.find(item => item.id === id);
  const name = prompt("Resource name", resource.name);
  if (name === null) return;
  const type = prompt("Service type", resource.type);
  if (type === null) return;
  const region = prompt("Region", resource.region);
  if (region === null) return;
  const monthlyCost = prompt("Monthly cost (USD)", resource.monthlyCost);
  if (monthlyCost === null) return;
  const response = await fetch(`/api/resources/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, type, region, monthlyCost })
  });
  const result = await response.json();
  if (!response.ok) return alert(result.error);
  await loadDashboard();
}

async function deleteResource(id, name) {
  if (!confirm(`Delete ${name}?`)) return;
  const response = await fetch(`/api/resources/${encodeURIComponent(id)}`, { method: "DELETE" });
  const result = await response.json();
  if (!response.ok) return alert(result.error);
  await loadDashboard();
}

document.querySelector("#refresh-button").addEventListener("click", loadDashboard);
document.querySelector("#search-input").addEventListener("input", renderResources);
document.querySelectorAll(".filter-button").forEach(button => {
  button.addEventListener("click", () => {
    statusFilter = button.dataset.status;
    document.querySelectorAll(".filter-button").forEach(item => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", selected);
    });
    renderResources();
  });
});
document.querySelector("#download-button").addEventListener("click", downloadReport);

function downloadReport() {
  const headings = ["Name", "Service type", "Region", `Monthly cost (${currency})`, "Status", "Reason"];
  const rows = allResources.map(resource => [resource.name, resource.type, resource.region, resource.monthlyCost, resource.status, resource.reason]);
  const csvValue = value => `"${String(value).replaceAll('"', '""')}"`;
  const report = [headings, ...rows].map(row => row.map(csvValue).join(",")).join("\n");
  const file = new Blob([report], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "cloudguard-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
document.querySelector("#settings-form").addEventListener("submit", async event => {
  event.preventDefault();
  const message = document.querySelector("#settings-message");
  const input = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    message.textContent = `Settings saved: ${result.currency}, review limit ${money.format(result.reviewLimit)}, budget ${money.format(result.monthlyBudget)}.`;
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  }
});
document.querySelector("#resource-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#form-message");
  const input = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    form.reset();
    message.textContent = `Added ${result.name}.`;
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  }
});
loadDashboard().catch(error => {
  document.querySelector("#resource-table").innerHTML = `<tr><td colspan="6">Could not load data: ${error.message}</td></tr>`;
});
