let currentVars = {};

// ----------------- DROPDOWNS -----------------
async function populateDropdowns() {
    try {
        let tRes = await fetch("/list_templates");
        let templates = await tRes.json();
        let templateSelect = document.getElementById("templateSelect");
        templateSelect.innerHTML = "";
        templates.forEach(f => {
            let option = document.createElement("option");
            option.value = f;
            option.textContent = f;
            templateSelect.appendChild(option);
        });

        let vRes = await fetch("/list_vars");
        let vars = await vRes.json();
        let varsSelect = document.getElementById("varsSelect");
        varsSelect.innerHTML = "";
        vars.forEach(f => {
            let option = document.createElement("option");
            option.value = f;
            option.textContent = f;
            varsSelect.appendChild(option);
        });
    } catch (err) {
        console.error("Error populating dropdowns:", err);
    }
}

// ----------------- TEMPLATE HANDLING -----------------
async function loadTemplate() {
    const filename = document.getElementById("templateSelect").value;
    if (!filename) return;

    let res = await fetch("/load_template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
    });
    let data = await res.json();

    document.getElementById("templateEditor").value = data.content;

    currentVars = {};
    data.scalars.forEach(v => currentVars[v] = "");
    Object.keys(data.lists).forEach(v => currentVars[v] = []);

    renderVarInputs(data);
    updateConfig();
}

async function saveTemplate() {
    const filename = document.getElementById("templateSelect").value;
    const content = document.getElementById("templateEditor").value;
    if (!filename) return;
    await fetch("/save_template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content })
    });
    alert("Template saved: " + filename);
}

async function saveAsTemplate() {
    const oldName = document.getElementById("templateSelect").value || "new_template.j2";
    const content = document.getElementById("templateEditor").value;
    const newName = prompt("Enter new filename (with .j2 extension):", oldName.replace(".j2", "_copy.j2"));
    if (!newName) return;
    await fetch("/save_template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: newName, content })
    });
    await populateDropdowns();
    document.getElementById("templateSelect").value = newName;
    alert("Template saved as: " + newName);
}

// Upload/Download
async function uploadTemplate(input) {
    const file = input.files[0];
    if (!file) return;
    let formData = new FormData();
    formData.append("file", file);
    await fetch("/upload_template", { method: "POST", body: formData });
    await populateDropdowns();
    alert("Uploaded template: " + file.name);
}

function downloadTemplate() {
    const filename = document.getElementById("templateSelect").value;
    if (!filename) return;
    window.location.href = "/download_template/" + filename;
}

// ----------------- VARIABLE HANDLING -----------------
function renderVarInputs(data) {
    let container = document.getElementById("varsContainer");
    container.innerHTML = "";

    // Scalars
    data.scalars.forEach(v => {
        let label = document.createElement("label");
        label.textContent = v + ": ";
        let input = document.createElement("input");
        input.placeholder = v;
        input.value = currentVars[v] || "";
        input.oninput = () => {
            currentVars[v] = input.value;
            updateConfig();
        };
        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(document.createElement("br"));
    });

    // Lists
    Object.keys(data.lists).forEach(listName => {
        let fields = data.lists[listName];
        if (!Array.isArray(currentVars[listName]) || currentVars[listName].length === 0) {
            const count = parseInt(prompt(`How many ${listName}?`), 10) || 1;
            currentVars[listName] = Array.from({ length: count }, () => {
                let obj = {};
                fields.forEach(f => obj[f] = "");
                return obj;
            });
        }

        let section = document.createElement("div");
        section.innerHTML = `<h4>${listName}</h4>`;

        currentVars[listName].forEach((item, idx) => {
            let row = document.createElement("div");
            fields.forEach(field => {
                let input = document.createElement("input");
                input.placeholder = `${listName}[${idx}].${field}`;
                input.value = item[field] || "";
                input.oninput = () => {
                    currentVars[listName][idx][field] = input.value;
                    updateConfig();
                };
                row.appendChild(input);
            });

            let removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.textContent = "Remove";
            removeBtn.onclick = () => {
                currentVars[listName].splice(idx, 1);
                renderVarInputs(data);
                updateConfig();
            };
            row.appendChild(removeBtn);

            section.appendChild(row);
        });

        let addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.textContent = "Add " + listName;
        addBtn.onclick = () => {
            let obj = {};
            fields.forEach(f => obj[f] = "");
            currentVars[listName].push(obj);
            renderVarInputs(data);
            updateConfig();
        };
        section.appendChild(addBtn);

        container.appendChild(section);
    });
}

async function loadVars() {
    const filename = document.getElementById("varsSelect").value;
    if (!filename) return;

    let res = await fetch("/load_vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
    });

    let loadedVars = await res.json();
    const choice = await showYamlPrompt();
    if (choice === "cancel") return;

    if (choice === "overwrite") {
        Object.keys(currentVars).forEach(k => {
            currentVars[k] = loadedVars[k] || (Array.isArray(currentVars[k]) ? [] : "");
        });
    } else if (choice === "merge") {
        Object.keys(currentVars).forEach(k => {
            if (Array.isArray(currentVars[k])) {
                if (loadedVars[k]) currentVars[k] = loadedVars[k];
            } else {
                if ((!currentVars[k] || currentVars[k].trim() === "") && loadedVars[k]) {
                    currentVars[k] = loadedVars[k];
                }
            }
        });
    }

    renderVarInputs({
        scalars: Object.keys(currentVars).filter(k => !Array.isArray(currentVars[k])),
        lists: Object.fromEntries(Object.keys(currentVars).filter(k => Array.isArray(currentVars[k])).map(k => [k, []]))
    });
    updateConfig();
}

async function saveVars() {
    const filename = document.getElementById("varsSelect").value;
    if (!filename) return;
    await fetch("/save_vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, data: currentVars })
    });
    alert("Variables saved: " + filename);
}

async function saveAsVars() {
    const oldName = document.getElementById("varsSelect").value || "variables.yaml";
    const newName = prompt("Enter new filename (with .yaml extension):", oldName.replace(".yaml", "_copy.yaml"));
    if (!newName) return;
    await fetch("/save_vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: newName, data: currentVars })
    });
    await populateDropdowns();
    document.getElementById("varsSelect").value = newName;
    alert("Variables saved as: " + newName);
}

// Upload/Download
async function uploadVars(input) {
    const file = input.files[0];
    if (!file) return;
    let formData = new FormData();
    formData.append("file", file);
    await fetch("/upload_vars", { method: "POST", body: formData });
    await populateDropdowns();
    alert("Uploaded variables: " + file.name);
}

function downloadVars() {
    const filename = document.getElementById("varsSelect").value;
    if (!filename) return;
    window.location.href = "/download_vars/" + filename;
}

// ----------------- CONFIG HANDLING -----------------
async function updateConfig() {
    const template = document.getElementById("templateEditor").value;
    let res = await fetch("/render_config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template, variables: currentVars })
    });
    let data = await res.json();
    document.getElementById("configOutput").innerText = data.config;
}

async function saveAsConfig() {
    const defaultName = document.getElementById("configName").value || "config.txt";
    const newName = prompt("Enter new filename (with extension):", defaultName.replace(".txt", "_copy.txt"));
    if (!newName) return;
    const content = document.getElementById("configOutput").innerText;

    await fetch("/save_config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: newName, content })
    });

    document.getElementById("configName").value = newName;
    alert("Saved config to /saved/" + newName);
}

async function appendConfig() {
    const filename = document.getElementById("configName").value || "config.txt";
    const content = document.getElementById("configOutput").innerText;

    await fetch("/append_config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content })
    });

    alert("Appended config to /saved/" + filename);
}

function downloadConfig() {
    const filename = document.getElementById("configName").value || "config.txt";
    window.location.href = "/download_config/" + filename;
}

// ----------------- THEME -----------------
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("dark")) {
        body.classList.remove("dark");
        body.classList.add("light");
        localStorage.setItem("theme", "light");
    } else {
        body.classList.remove("light");
        body.classList.add("dark");
        localStorage.setItem("theme", "dark");
    }
}

// ----------------- YAML PROMPT -----------------
function showYamlPrompt() {
    return new Promise((resolve) => {
        const modal = document.getElementById("yamlPrompt");
        modal.style.display = "block";

        const cleanup = (choice) => {
            modal.style.display = "none";
            resolve(choice);
        };

        document.getElementById("yamlOverwrite").onclick = () => cleanup("overwrite");
        document.getElementById("yamlMerge").onclick = () => cleanup("merge");
        document.getElementById("yamlCancel").onclick = () => cleanup("cancel");
    });
}

// ----------------- INIT -----------------
window.addEventListener("load", () => {
    const saved = localStorage.getItem("theme") || "light";
    document.body.classList.add(saved);
    populateDropdowns();
});

