from bot.base.user_data import *
import json
import os
import glob
import tempfile

presets_path = "/umamusume/presets"
starter_presets_path = "/umamusume/starter_presets"


def _read_json_file(path: str):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return None


def _safe_preset_filename(name: str) -> str:
    safe = ''.join(ch for ch in name if ch not in '/\\<>:"|?*').strip()
    if not safe:
        raise ValueError("Preset name is empty or invalid")
    return safe


def _write_json_atomic(path: str, data: dict):
    folder = os.path.dirname(path)
    os.makedirs(folder, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(prefix=".tmp_", suffix=".json", dir=folder)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, path)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def read_presets():
    folder = base_path + presets_path
    starter_folder = base_path + starter_presets_path
    preset_list = []
    seen_names = set()
    
    # Read from regular presets first (user-created/modified take priority)
    if os.path.exists(folder):
        files = sorted(glob.glob(os.path.join(folder, '*.json')))
        for file in files:
            data = _read_json_file(file)
            if not isinstance(data, dict):
                continue
            name = data.get('name')
            if not name:
                continue
            preset_list.append(data)
            seen_names.add(name)
    
    # Read from starter presets (only if no user preset with same name exists)
    if os.path.exists(starter_folder):
        files = sorted(glob.glob(os.path.join(starter_folder, '*.json')))
        for file in files:
            data = _read_json_file(file)
            if not isinstance(data, dict):
                continue
            name = data.get('name')
            if not name:
                continue
            # Only add starter preset if no user preset with same name exists
            if name not in seen_names:
                preset_list.append(data)
    
    return preset_list


def write_preset(preset_json: str):
    preset_info = json.loads(preset_json)
    if not isinstance(preset_info, dict):
        raise ValueError("Preset payload is invalid")
    name = str(preset_info.get('name', '')).strip()
    if not name:
        raise ValueError("Preset name is required")
    
    # Check if this is overwriting a starter preset by searching through starter preset files
    starter_folder = base_path + starter_presets_path
    starter_preset_file = None
    
    if os.path.exists(starter_folder):
        files = sorted(glob.glob(os.path.join(starter_folder, '*.json')))
        for file in files:
            data = _read_json_file(file)
            if isinstance(data, dict) and data.get('name') == name:
                starter_preset_file = file
                break
    
    if starter_preset_file:
        _write_json_atomic(starter_preset_file, preset_info)
    else:
        safe_name = _safe_preset_filename(name)
        payload = json.dumps(preset_info, indent=2, ensure_ascii=False)
        write_file(presets_path + "/" + safe_name + ".json", payload)


def is_starter_preset(name: str):
    """Check if a preset name corresponds to a starter preset by searching through files"""
    starter_folder = base_path + starter_presets_path
    if not os.path.exists(starter_folder):
        return False
    
    files = sorted(glob.glob(os.path.join(starter_folder, '*.json')))
    for file in files:
        data = _read_json_file(file)
        if isinstance(data, dict) and data.get('name') == name:
            return True
    return False


def delete_preset_by_name(name: str):
    if not name:
        return False
    # Don't allow deletion of starter presets
    if is_starter_preset(name):
        return False
    
    folder = base_path + presets_path
    try:
        safe_name = _safe_preset_filename(name)
    except ValueError:
        return False
    filepath = os.path.join(folder, f"{safe_name}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        return True
    return False

PAL_DEFAULTS: dict = {
    "5 event chain (Defaults optimized for riko)": [[4, 75, 0.27], [4, 80, 0.27], [5, 80, 0.27], [5, 80, 0.27], [5, 75, 0.27]],
    "4 event chain": [[2, 43, 0.9], [3, 17, 0.5], [1, 3, 0.8], [5, 88, 0.0]],
    "3 event chain": [[2, 43, 0.9], [3, 17, 0.5], [1, 3, 0.8]],
}

def read_pal_defaults() -> dict:
    return dict(PAL_DEFAULTS)








