import re
from jinja2 import Environment, meta

def load_template(filename):
    path = f"data/templates/{filename}"
    try:
        with open(path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return ""

def save_template(filename, content):
    path = f"data/templates/{filename}"
    with open(path, "w") as f:
        f.write(content)

def extract_variables(template_content):
    env = Environment()
    parsed_content = env.parse(template_content)
    all_vars = list(meta.find_undeclared_variables(parsed_content))

    # Find for-loops (loop_var, list_name)
    loops = re.findall(r"{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%}", template_content)

    list_vars = {}
    for loop_var, list_name in loops:
        # Find fields used from loop_var
        fields = re.findall(rf"{{\s*{loop_var}\.(\w+)", template_content)
        list_vars[list_name] = sorted(set(fields))

    # Scalars = all undeclared vars minus the loop list names
    ordered_vars, seen = [], set()
    tokens = re.findall(r"[a-zA-Z_][a-zA-Z0-9_]*", template_content)
    for t in tokens:
        if t in all_vars and t not in seen and t not in list_vars.keys():
            seen.add(t)
            ordered_vars.append(t)

    return {"scalars": ordered_vars, "lists": list_vars}
