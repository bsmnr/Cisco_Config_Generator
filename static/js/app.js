let currentVars = {};
let liveUpdateTimer;
let isDirty = false; // track unsaved changes

/* ---------------- THEME HANDLER ---------------- */
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("dark")) {
        body.classList.remove("dark");
        body.classList.add("light");
    } else {
        body.classList.remove("light");
        body.classList.add("dark");
    }
}

/* ---------------- TEMPLATE DROPDOWN ---------------- */
async function populateTemplates() {
    const res = await fetch("/list_templates");
    const files = await res.json();
    const select = document.getElementById("templateSelect");
    select.innerHTML = "";

    // Add default placeholder
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select Template --";
    select.appendChild(defaultOption);

    files.forEach(f => {
        const option = document.createElement("option");
        option.value = f;
        option.textContent = f;
        select.appendChild(option);
    });

    // Load only when user manually selects
    select.onchange = handleTemplateChange;
}

async function handleTemplateChange() {
    const filename = document.getElementById("templateSelect").value;
    if (!filename) return;

    const editorContent = document.getElementById("templateEditor").value.trim();

    // If nothing in editor and no config yet, just load
    if (!isDirty && editorContent === "") {
        await loadTemplate(filename);
        return;
    }

    // Ask if user wants to save before switching
    const confirmSave = confirm(
        "You have unsaved changes. Do you want to save before loading a new template?"
    );
    if (confirmSave) {
        if (filename) {
            await saveTemplate();
        } else {
            await saveAsTemplate();
        }
    }

    await loadTemplate(filename);
}

async function loadTemplate(filename) {
    const res = await fetch("/load_template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
    });
    const data = await res.json();
    document.getElementById("templateEditor").value = data.content;
    isDirty = false; // reset dirty flag
    updateVariablesAndConfig();
}

/* ---------------- VARS DROPDOWN ---------------- */
async function populateVars() {
    const res = await fetch("/list_vars");
    const files = await res.json();
    const select = document.getElementById("varsSelect");
    select.innerHTML = "";

    // Add default placeholder
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select Variables --";
    select.appendChild(defaultOption);

    files.forEach(f => {
        const option = document.createElement("option");
        option.value = f;
        option.textContent = f;
        select.appendChild(option);
    });
}

async function loadVars() {
    const filename = document.getElementById("varsSelect").value;
    if (!filename) return;
    const res = await fetch("/load_vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
    });
    const data = await res.json();
    // fill values into variable inputs if they exist
    Object.keys(data).forEach(k => {
        const input = document.querySelector(`#varsContainer input[name="${k}"]`);
        if (input) input.value = data[k];
        currentVars[k] = data[k];
    });
    updateConfig();
    isDirty = false;
}

/* ---------------- TEMPLATE LIVE UPDATE ---------------- */
function liveUpdateFromTemplate() {
    clearTimeout(liveUpdateTimer);
    liveUpdateTimer = setTimeout(() => {
        updateVariablesAndConfig();
    }, 400); // debounce typing
    isDirty = true;
}

async function updateVariablesAndConfig() {
    const templateText = document.getElementById("templateEditor").value;

    const response = await fetch("/parse_vars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateText })
    });

    const data = await response.json();
    const varsContainer = document.getElementById("varsContainer");

    const newVars = data.variables;
    const currentVarsOnPage = Array.from(
        document.querySelectorAll("#varsContainer input")
    ).map(i => i.name);

    if (JSON.stringify(newVars) !== JSON.stringify(currentVarsOnPage)) {
        varsContainer.innerHTML = "";
        newVars.forEach(v => {
            const div = document.createElement("div");
            div.className = "var-input";
            div.innerHTML = `
                <label for="${v}">${v}</label>
                <input type="text" id="${v}" name="${v}"
                       value="${currentVars[v] || ''}"
                       oninput="collectVarsAndUpdateConfig()">
            `;
            varsContainer.appendChild(div);
        });
    }

    collectVarsAndUpdateConfig();
}

/* ---------------- VARIABLE COLLECTION ---------------- */
function collectVarsAndUpdateConfig() {
    currentVars = {};
    document.querySelectorAll("#varsContainer input").forEach(input => {
        currentVars[input.name] = input.value;
    });
    updateConfig();
    isDirty = true;
}

/* ---------------- CONFIG RENDER ---------------- */
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

/* ---------------- MANUAL FALLBACK ---------------- */
async function updateVariables() {
    await updateVariablesAndConfig();
}

/* ---------------- UNSAVED CHANGES WARNING ---------------- */
window.addEventListener("beforeunload", function (e) {
    if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
    }
});

/* ---------------- INIT ---------------- */
window.onload = function () {
    populateTemplates();
    populateVars();

    // Ensure everything starts empty
    document.getElementById("templateEditor").value = "";
    document.getElementById("varsContainer").innerHTML = "";
    document.getElementById("configOutput").innerText = "";
};
