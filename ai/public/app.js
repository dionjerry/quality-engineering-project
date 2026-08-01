const form = document.querySelector("#generator-form");
const specification = document.querySelector("#specification");
const characterCount = document.querySelector("#character-count");
const message = document.querySelector("#message");
const generateButton = document.querySelector("#generate-button");
const apiKey = document.querySelector("#api-key");
const toggleKey = document.querySelector("#toggle-key");
const configStatus = document.querySelector("#config-status");

function showMessage(kind, text, details = []) {
  message.className = `message ${kind}`;
  message.replaceChildren();
  const summary = document.createElement("strong");
  summary.textContent = text;
  message.append(summary);
  if (details.length > 0) {
    const list = document.createElement("ul");
    details.forEach((detail) => {
      const item = document.createElement("li");
      item.textContent = detail;
      list.append(item);
    });
    message.append(list);
  }
  message.hidden = false;
}

function filenameFromHeader(header) {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] || "test-cases.xlsx";
}

async function loadConfigurationStatus() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const status = await response.json();
    const key = status.apiKeyConfigured ? "Server key configured" : "Server key missing";
    const model = status.modelConfigured ? "server model configured" : "server model missing";
    configStatus.textContent = `${key}; ${model}. Values remain hidden.`;
  } catch {
    configStatus.textContent = "Configuration status is unavailable. You can enter one-request overrides below.";
  }
}

specification.addEventListener("input", () => {
  characterCount.textContent = `${specification.value.length.toLocaleString()} / 50,000`;
});

toggleKey.addEventListener("click", () => {
  const showing = apiKey.type === "text";
  apiKey.type = showing ? "password" : "text";
  toggleKey.textContent = showing ? "Show" : "Hide";
  toggleKey.setAttribute("aria-label", showing ? "Show API key" : "Hide API key");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.hidden = true;
  generateButton.disabled = true;
  generateButton.firstElementChild.textContent = "Analysing and validating…";
  const data = new FormData(form);
  const payload = {
    featureName: data.get("featureName"),
    specification: data.get("specification"),
    maximumCases: Number(data.get("maximumCases")),
    testLevel: data.get("testLevel"),
    model: data.get("model"),
    apiKey: data.get("apiKey"),
  };

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({ error: "Generation failed.", details: [] }));
      showMessage("error", problem.error || "Generation failed.", problem.details || []);
      return;
    }

    const workbook = await response.blob();
    const url = URL.createObjectURL(workbook);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFromHeader(response.headers.get("Content-Disposition"));
    link.click();
    URL.revokeObjectURL(url);
    const count = response.headers.get("X-Test-Case-Count") || "Validated";
    showMessage("success", `${count} test cases passed validation. Your Excel download is ready.`);
  } catch {
    showMessage("error", "The local generator could not be reached. Confirm that npm start is still running.");
  } finally {
    apiKey.value = "";
    generateButton.disabled = false;
    generateButton.firstElementChild.textContent = "Generate Excel test cases";
  }
});

void loadConfigurationStatus();
