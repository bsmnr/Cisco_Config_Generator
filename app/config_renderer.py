import os
import yaml
from jinja2 import Template

VARS_DIR = "data/variables"

def render_config(template_content, variables):
    try:
        template = Template(template_content)
        return template.render(variables)
    except Exception as e:
        return f"Error rendering template: {e}"

def load_yaml(filename):
    path = os.path.join(VARS_DIR, filename)
    if os.path.exists(path):
        with open(path, "r") as f:
            return yaml.safe_load(f) or {}
    return {}

def save_yaml(filename, data):
    path = os.path.join(VARS_DIR, filename)
    with open(path, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False)
