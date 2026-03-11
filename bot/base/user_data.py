import os
import tempfile

base_path = "userdata"
if not os.path.exists(base_path):
    os.makedirs(base_path)

def write_file(filename, content):
    filepath = os.path.dirname(base_path + filename)
    if not os.path.exists(filepath):
        os.makedirs(filepath)
    full_path = base_path + filename
    fd, tmp_path = tempfile.mkstemp(prefix=".tmp_", suffix=".json", dir=filepath)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, full_path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
