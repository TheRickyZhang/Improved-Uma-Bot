from config import CONFIG

def _t(key, default):
    try:
        timing = CONFIG.bot.timing
        if timing is None:
            return default
        val = getattr(timing, key, None)
        return float(val) if val is not None else default
    except Exception:
        return default

# Post-tap delay (the main action delay)
TAP_DELAY = _t('tap_delay', 0.5)

# Extra delay after taps outside career runs (dialogs need time to become interactive)
TAP_EXTRA_DELAY = _t('tap_extra_delay', 0.25)

# Waiting for dialogs/menus to appear and become interactive
DIALOG_WAIT = _t('dialog_wait', 1.0)

# Longer waits for heavy UI loads (race menus, scenario select, app restart)
LONG_WAIT = _t('long_wait', 2.0)

# Post-swipe/scroll delay
SCROLL_DELAY = _t('scroll_delay', 0.15)

# Retry delay when screencap fails
SCREENCAP_RETRY = _t('screencap_retry', 0.1)

# Recovery operations (app restart, force-stop, reconnect)
RECOVERY_DELAY = _t('recovery_delay', 1.0)

# Between detection/recognition attempts (fast polling)
DETECTION_DELAY = _t('detection_delay', 0.005)

# Retry delay for failed reads (energy, OCR, etc.)
RETRY_DELAY = _t('retry_delay', 0.12)

# Derived constants (kept for backward compat with existing imports)
TRAINING_CLICK_DELAY = DETECTION_DELAY
TRAINING_WAIT_DELAY = RETRY_DELAY
TRAINING_RETRY_DELAY = RETRY_DELAY
TRAINING_DETECTION_DELAY = DETECTION_DELAY

RECREATION_MENU_DELAY = SCROLL_DELAY * 2
MENU_RETURN_DELAY = RETRY_DELAY
MEDIC_CHECK_DELAY = RETRY_DELAY

ENERGY_READ_RETRY_DELAY = RETRY_DELAY

RACE_SEARCH_TIMEOUT = 30

MAX_TRAINING_RETRY = 3
MAX_DETECTION_ATTEMPTS = 3
