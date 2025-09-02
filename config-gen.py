from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from app import jinja_handler, config_renderer
import os

app = Flask(__name__)

TEMPLATE_DIR = "data/templates"
VARS_DIR = "data/variables"
SAVED_DIR = "saved"

os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(VARS_DIR, exist_ok=True)
os.makedirs(SAVED_DIR, exist_ok=True)

@app.route("/")
def index():
    return send_from_directory("static/html", "index.html")

@app.route("/list_templates")
def list_templates():
    return jsonify(os.listdir(TEMPLATE_DIR))

@app.route("/list_vars")
def list_vars():
    return jsonify(os.listdir(VARS_DIR))

# ---------------- TEMPLATE HANDLERS ----------------
@app.route("/load_template", methods=["POST"])
def load_template():
    data = request.get_json()
    filename = data["filename"]
    content = jinja_handler.load_template(filename)
    variables = jinja_handler.extract_variables(content)
    return jsonify({"content": content, "scalars": variables["scalars"], "lists": variables["lists"]})

@app.route("/save_template", methods=["POST"])
def save_template():
    data = request.get_json()
    jinja_handler.save_template(data["filename"], data["content"])
    return jsonify(success=True)

@app.route("/upload_template", methods=["POST"])
def upload_template():
    file = request.files["file"]
    filename = secure_filename(file.filename)
    file.save(os.path.join(TEMPLATE_DIR, filename))
    return jsonify(success=True, filename=filename)

@app.route("/download_template/<filename>")
def download_template(filename):
    return send_from_directory(TEMPLATE_DIR, filename, as_attachment=True)

# ---------------- VARIABLE HANDLERS ----------------
@app.route("/load_vars", methods=["POST"])
def load_vars():
    data = request.get_json()
    filename = data["filename"]
    vars = config_renderer.load_yaml(filename)
    return jsonify(vars)

@app.route("/save_vars", methods=["POST"])
def save_vars():
    data = request.get_json()
    config_renderer.save_yaml(data["filename"], data["data"])
    return jsonify(success=True)

@app.route("/upload_vars", methods=["POST"])
def upload_vars():
    file = request.files["file"]
    filename = secure_filename(file.filename)
    file.save(os.path.join(VARS_DIR, filename))
    return jsonify(success=True, filename=filename)

@app.route("/download_vars/<filename>")
def download_vars(filename):
    return send_from_directory(VARS_DIR, filename, as_attachment=True)

# ---------------- CONFIG HANDLERS ----------------
@app.route("/render_config", methods=["POST"])
def render_config():
    data = request.get_json()
    config = config_renderer.render_config(data["template"], data["variables"])
    return jsonify({"config": config})

@app.route("/save_config", methods=["POST"])
def save_config():
    data = request.get_json()
    filename = data["filename"]
    content = data["content"]
    path = os.path.join(SAVED_DIR, filename)
    with open(path, "w") as f:
        f.write(content)
    return jsonify(success=True, path=path)

@app.route("/append_config", methods=["POST"])
def append_config():
    data = request.get_json()
    filename = data["filename"]
    content = data["content"]
    path = os.path.join(SAVED_DIR, filename)
    with open(path, "a") as f:
        f.write("\n" + content)
    return jsonify(success=True, path=path)

@app.route("/download_config/<filename>")
def download_config(filename):
    return send_from_directory(SAVED_DIR, filename, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)
