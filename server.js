const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const publicFolder = fs.existsSync(path.join(__dirname, "public"))
  ? path.join(__dirname, "public")
  : __dirname;
const dataFolder = path.join(__dirname, "data");
const resourcesFile = path.join(dataFolder, "resources.json");
const settingsFile = path.join(dataFolder, "settings.json");

const starterResources = [
  { id: "i-0ab12", name: "demo-web-server", type: "EC2 virtual machine", region: "eu-west-2", monthlyCost: 18.72, status: "Needs review", reason: "Average CPU use is below 3%" },
  { id: "i-0cd34", name: "development-server", type: "EC2 virtual machine", region: "us-east-1", monthlyCost: 31.20, status: "Needs review", reason: "Running outside working hours" },
  { id: "backup-2024", name: "old-project-backup", type: "S3 storage", region: "eu-west-2", monthlyCost: 4.80, status: "Needs review", reason: "No file changes in 180 days" },
  { id: "db-prod", name: "main-database", type: "RDS database", region: "eu-west-2", monthlyCost: 42.15, status: "Healthy", reason: "Regular activity detected" }
];

function loadResources() {
  try {
    return JSON.parse(fs.readFileSync(resourcesFile, "utf8"));
  } catch {
    fs.mkdirSync(dataFolder, { recursive: true });
    fs.writeFileSync(resourcesFile, JSON.stringify(starterResources, null, 2));
    return starterResources;
  }
}

function saveResources() {
  fs.writeFileSync(resourcesFile, JSON.stringify(resources, null, 2));
}

function loadSettings() {
  try {
    return { reviewLimit: 20, monthlyBudget: 100, currency: "USD", ...JSON.parse(fs.readFileSync(settingsFile, "utf8")) };
  } catch {
    fs.mkdirSync(dataFolder, { recursive: true });
    const defaultSettings = { reviewLimit: 20, monthlyBudget: 100, currency: "USD" };
    fs.writeFileSync(settingsFile, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
}

function saveSettings() {
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
}

function applyReviewRule(resource) {
  const needsReview = resource.monthlyCost > settings.reviewLimit;
  return {
    ...resource,
    status: needsReview ? "Needs review" : "Healthy",
    reason: needsReview
      ? `Monthly cost is above the $${settings.reviewLimit} review limit`
      : `Monthly cost is within the $${settings.reviewLimit} review limit`
  };
}

function getRecommendation(resource) {
  const service = resource.type.toLowerCase();
  if (service.includes("ec2") || service.includes("server") || service.includes("virtual machine")) {
    return "Check whether this server can be stopped outside working hours or changed to a smaller size.";
  }
  if (service.includes("s3") || service.includes("storage")) {
    return "Check old files and move backups to a lower-cost storage option.";
  }
  if (service.includes("rds") || service.includes("database")) {
    return "Check whether the database can use a smaller plan or run only when needed.";
  }
  return "Check this resource's usage and decide whether it can be reduced or removed.";
}

// Later, these records will come from AWS. For now they are safely stored on this computer.
const resources = loadResources();
const settings = loadSettings();

function sendJson(response, data) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

function serveFile(response, filename, contentType) {
  fs.readFile(path.join(publicFolder, filename), (error, content) => {
    if (error) {
      response.writeHead(404);
      return response.end("Not found");
    }
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  });
}

http.createServer((request, response) => 
  {   if (request.url === "/api/config") {
    return sendJson(response, {
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null
    });
  }
  if (request.url === "/api/settings" && request.method === "GET") return sendJson(response, settings);
  if (request.url === "/api/settings" && request.method === "PUT") {
    let body = "";
    request.on("data", chunk => body += chunk);
    request.on("end", () => {
      try {
        const input = JSON.parse(body);
        const reviewLimit = Number(input.reviewLimit);
        const monthlyBudget = Number(input.monthlyBudget);
        const currency = input.currency;
        if (!Number.isFinite(reviewLimit) || reviewLimit < 0 || !Number.isFinite(monthlyBudget) || monthlyBudget < 0 || !["USD", "GBP", "EUR"].includes(currency)) throw new Error();
        settings.reviewLimit = reviewLimit;
        settings.monthlyBudget = monthlyBudget;
        settings.currency = currency;
        saveSettings();
        resources.splice(0, resources.length, ...resources.map(applyReviewRule));
        saveResources();
        sendJson(response, settings);
      } catch {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Enter a valid review limit." }));
      }
    });
    return;
  }
  if (request.url.startsWith("/api/resources/") && request.method === "PUT") {
    const id = decodeURIComponent(request.url.split("/").pop());
    const index = resources.findIndex(resource => resource.id === id);
    if (index === -1) {
      response.writeHead(404, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ error: "Resource not found." }));
    }
    let body = "";
    request.on("data", chunk => body += chunk);
    request.on("end", () => {
      try {
        const input = JSON.parse(body);
        if (!input.name || !input.type || !input.region || Number(input.monthlyCost) < 0) throw new Error();
        const updated = applyReviewRule({
          id,
          name: input.name.trim(),
          type: input.type.trim(),
          region: input.region.trim(),
          monthlyCost: Number(input.monthlyCost)
        });
        resources[index] = updated;
        saveResources();
        sendJson(response, updated);
      } catch {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Please complete every field with a valid cost." }));
      }
    });
    return;
  }
  if (request.url.startsWith("/api/resources/") && request.method === "DELETE") {
    const id = decodeURIComponent(request.url.split("/").pop());
    const index = resources.findIndex(resource => resource.id === id);
    if (index === -1) {
      response.writeHead(404, { "Content-Type": "application/json" });
      return response.end(JSON.stringify({ error: "Resource not found." }));
    }
    const removed = resources.splice(index, 1)[0];
    saveResources();
    return sendJson(response, { message: `Removed ${removed.name}.` });
  }
  if (request.url === "/api/resources" && request.method === "POST") {
    let body = "";
    request.on("data", chunk => body += chunk);
    request.on("end", () => {
      try {
        const input = JSON.parse(body);
        if (!input.name || !input.type || !input.region || Number(input.monthlyCost) < 0) {
          response.writeHead(400, { "Content-Type": "application/json" });
          return response.end(JSON.stringify({ error: "Please complete every field." }));
        }
        const monthlyCost = Number(input.monthlyCost);
        const resource = applyReviewRule({
          id: `manual-${Date.now()}`,
          name: input.name.trim(),
          type: input.type.trim(),
          region: input.region.trim(),
          monthlyCost
        });
        resources.push(resource);
        saveResources();
        response.writeHead(201, { "Content-Type": "application/json" });
        response.end(JSON.stringify(resource));
      } catch {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "The data was not valid." }));
      }
    });
    return;
  }
  if (request.url === "/api/resources") return sendJson(response, resources);
  if (request.url === "/api/summary") {
    const reviewItems = resources.filter(resource => resource.status === "Needs review");
    const possibleSavings = reviewItems.reduce((total, resource) => total + resource.monthlyCost, 0);
    const totalMonthlyCost = resources.reduce((total, resource) => total + resource.monthlyCost, 0);
    const recommendations = reviewItems.map(resource => ({ name: resource.name, recommendation: getRecommendation(resource) }));
    return sendJson(response, { resourceCount: resources.length, reviewCount: reviewItems.length, possibleSavings, totalMonthlyCost, recommendations });
  }
  if (request.url === "/") return serveFile(response, "index.html", "text/html; charset=utf-8");
  if (request.url === "/styles.css") return serveFile(response, "styles.css", "text/css; charset=utf-8");
  if (request.url === "/app.js") return serveFile(response, "app.js", "application/javascript; charset=utf-8");
  response.writeHead(404);
  response.end("Not found");
}).listen(PORT, () => {
  console.log(`CloudGuard is running at http://localhost:${PORT}`);
});
