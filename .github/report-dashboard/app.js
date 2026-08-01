const body = document.body;
const repository = body.dataset.repository;
const workflow = body.dataset.workflow;
const historyBody = document.querySelector("#run-history");
const historyError = document.querySelector("#history-error");

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(startedAt, completedAt) {
  if (!completedAt) return "Running";
  const seconds = Math.max(0, Math.round((new Date(completedAt) - new Date(startedAt)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function label(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function textCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function linkCell(text, href) {
  const cell = document.createElement("td");
  const link = document.createElement("a");
  link.textContent = text;
  link.href = href;
  cell.append(link);
  return cell;
}

function runRow(run) {
  const row = document.createElement("tr");
  const state = run.status === "completed" ? run.conclusion : run.status;
  const statusCell = document.createElement("td");
  const status = document.createElement("span");
  status.className = `run-status ${state}`;
  status.textContent = label(state);
  statusCell.append(status);

  row.append(
    statusCell,
    linkCell(`#${run.run_number}`, run.html_url),
    textCell(run.head_branch ?? "—"),
    textCell(label(run.event)),
    linkCell(run.head_sha.slice(0, 7), `${run.repository.html_url}/commit/${run.head_sha}`),
    textCell(formatDate(run.created_at)),
    textCell(formatDuration(run.created_at, run.updated_at)),
  );
  return row;
}

async function loadRunHistory() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs?per_page=10`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

    const data = await response.json();
    historyBody.replaceChildren(...data.workflow_runs.map(runRow));
  } catch {
    historyBody.replaceChildren();
    historyError.hidden = false;
  }
}

for (const element of document.querySelectorAll("[data-iso-time]")) {
  element.textContent = formatDate(element.dataset.isoTime);
}

void loadRunHistory();
