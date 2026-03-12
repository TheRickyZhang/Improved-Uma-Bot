from enum import Enum
from module.umamusume.define import ScenarioType
from bot.base.task import Task, TaskExecuteMode
from module.umamusume.scenario.configs import ScenarioConfig, UraConfig, AoharuConfig, MantConfig
from module.umamusume.constants.scoring_constants import (
    DEFAULT_SCORE_VALUE,
    DEFAULT_SPIRIT_EXPLOSION,
    DEFAULT_SPECIAL_WEIGHTS,
    DEFAULT_PAL_FRIENDSHIP_SCORES,
    DEFAULT_PAL_CARD_MULTIPLIER,
    DEFAULT_NPC_WEIGHT,
    DEFAULT_FRIENDSHIP_GREEN_DISCOUNT,
    DEFAULT_BASE_SCORES,
    DEFAULT_SUMMER_SCORE_THRESHOLD,
    DEFAULT_WIT_RACE_SEARCH_THRESHOLD,
    DEFAULT_STAT_VALUE_MULTIPLIER,
    DEFAULT_WIT_SPECIAL_MULTIPLIER,
    DEFAULT_STAT_CAP_PENALTIES,
)


class TaskDetail:
    cure_asap_conditions: str
    scenario: ScenarioType
    expect_attribute: list[int]
    follow_support_card_name: str
    follow_support_card_level: int
    extra_race_list: list[int]
    learn_skill_list: list[list[str]]
    learn_skill_blacklist: list[str]
    tactic_list: list[int]
    tactic_actions: list
    clock_use_limit: int
    learn_skill_threshold: int
    learn_skill_only_user_provided: bool
    allow_recover_tp: bool
    cultivate_progress_info: dict
    extra_weight: list
    spirit_explosion: list
    manual_purchase_at_end: bool
    override_insufficient_fans_forced_races: bool
    use_last_parents: bool
    motivation_threshold_year1: int
    motivation_threshold_year2: int
    motivation_threshold_year3: int
    prioritize_recreation: bool
    pal_name: str
    pal_thresholds: list
    pal_friendship_score: list[float]
    pal_card_multiplier: float
    score_value: list
    special_training: list
    compensate_failure: bool
    failure_rate_divisor: float
    base_score: list
    event_weights: dict
    scenario_config: ScenarioConfig
    do_tt_next: bool
    stat_value_multiplier: list
    wit_special_multiplier: list
    skip_double_circle_unless_high_hint: bool
    hint_boost_characters: list[str]
    hint_boost_multiplier: int
    friendship_score_groups: list
    friendship_green_discount: float
    npc_weight: list
    stat_cap_penalties: list


class EndTaskReason(Enum):
    TP_NOT_ENOUGH = "训练值不足"
    SESSION_ERROR = "Session Error"



class UmamusumeTask(Task):
    detail: TaskDetail

    def end_task(self, status, reason) -> None:
        super().end_task(status, reason)

    def start_task(self) -> None:
        if self.task_execute_mode == TaskExecuteMode.TASK_EXECUTE_MODE_FULL_AUTO:
            self.detail.do_tt_next = False
        super().start_task()


class UmamusumeTaskType(Enum):
    UMAMUSUME_TASK_TYPE_UNKNOWN = 0
    UMAMUSUME_TASK_TYPE_CULTIVATE = 1


def build_task(task_execute_mode: TaskExecuteMode, task_type: int,
               task_desc: str, cron_job_config: dict, attachment_data: dict) -> UmamusumeTask:
    td = TaskDetail()
    ut = UmamusumeTask(task_execute_mode=task_execute_mode,
                       task_type=UmamusumeTaskType(task_type), task_desc=task_desc, app_name="umamusume")
    ut.cron_job_config = cron_job_config
    td.scenario = ScenarioType(attachment_data['scenario'])
    td.expect_attribute = attachment_data['expect_attribute']
    td.follow_support_card_level = int(attachment_data['follow_support_card_level'])
    td.follow_support_card_name = attachment_data['follow_support_card_name']
    td.extra_race_list = attachment_data['extra_race_list']
    td.learn_skill_list = attachment_data['learn_skill_list']
    td.learn_skill_blacklist = attachment_data['learn_skill_blacklist']
    td.tactic_list = attachment_data['tactic_list']
    td.tactic_actions = attachment_data.get('tactic_actions', [])
    td.clock_use_limit = attachment_data['clock_use_limit']
    td.learn_skill_threshold = attachment_data['learn_skill_threshold']
    td.learn_skill_only_user_provided = attachment_data['learn_skill_only_user_provided']
    td.allow_recover_tp = attachment_data['allow_recover_tp']
    td.extra_weight = attachment_data['extra_weight']
    td.spirit_explosion = attachment_data.get('spirit_explosion', list(DEFAULT_SPIRIT_EXPLOSION))
    td.compensate_failure = attachment_data.get('compensate_failure', True)
    td.failure_rate_divisor = float(attachment_data.get('failure_rate_divisor', 50.0))
    td.manual_purchase_at_end = attachment_data['manual_purchase_at_end']
    td.override_insufficient_fans_forced_races = attachment_data.get('override_insufficient_fans_forced_races', False)
    td.use_last_parents = attachment_data.get('use_last_parents', False)
    td.cure_asap_conditions = attachment_data.get("cure_asap_conditions", "")
    td.rest_threshold = attachment_data.get('rest_threshold', 48)

    td.summer_score_threshold = attachment_data.get('summer_score_threshold', DEFAULT_SUMMER_SCORE_THRESHOLD)
    td.wit_race_search_threshold = attachment_data.get('wit_race_search_threshold', DEFAULT_WIT_RACE_SEARCH_THRESHOLD)

    td.motivation_threshold_year1 = attachment_data.get('motivation_threshold_year1', 3)
    td.motivation_threshold_year2 = attachment_data.get('motivation_threshold_year2', 4)
    td.motivation_threshold_year3 = attachment_data.get('motivation_threshold_year3', 4)
    td.pal_name = attachment_data.get('pal_name', "")
    td.pal_thresholds = attachment_data.get('pal_thresholds', [])
    if not isinstance(td.pal_thresholds, list) or len(td.pal_thresholds) == 0:
        td.pal_thresholds = []
    td.prioritize_recreation = attachment_data.get('prioritize_recreation', False) and len(td.pal_thresholds) > 0

    td.pal_friendship_score = attachment_data.get('pal_friendship_score', list(DEFAULT_PAL_FRIENDSHIP_SCORES))
    td.pal_card_multiplier = attachment_data.get('pal_card_multiplier', DEFAULT_PAL_CARD_MULTIPLIER)
    td.npc_weight = attachment_data.get('npc_weight', list(DEFAULT_NPC_WEIGHT))

    raw_score_value = attachment_data.get('score_value', [list(x) for x in DEFAULT_SCORE_VALUE])
    if not isinstance(raw_score_value, list) or len(raw_score_value) < 5:
        raw_score_value = [list(x) for x in DEFAULT_SCORE_VALUE]
    normalized_score_value = []
    for period_idx in range(5):
        default_row = DEFAULT_SCORE_VALUE[period_idx]
        row = raw_score_value[period_idx] if period_idx < len(raw_score_value) else default_row
        if not isinstance(row, (list, tuple)):
            row = default_row
        out_row = []
        for i in range(3):
            try:
                out_row.append(float(row[i]))
            except Exception:
                out_row.append(float(default_row[i]))
        normalized_score_value.append(out_row)
    td.score_value = normalized_score_value

    raw_special_training = attachment_data.get('special_training', list(DEFAULT_SPECIAL_WEIGHTS))
    if not isinstance(raw_special_training, (list, tuple)) or len(raw_special_training) < 5:
        raw_special_training = list(DEFAULT_SPECIAL_WEIGHTS)
    td.special_training = []
    for i in range(5):
        try:
            td.special_training.append(float(raw_special_training[i]))
        except Exception:
            td.special_training.append(float(DEFAULT_SPECIAL_WEIGHTS[i]))
    td.friendship_green_discount = float(attachment_data.get('friendship_green_discount', DEFAULT_FRIENDSHIP_GREEN_DISCOUNT))

    td.base_score = attachment_data.get('base_score', list(DEFAULT_BASE_SCORES))

    td.cultivate_result = {}
    td.scenario_config = ScenarioConfig(
        ura_config = None if (attachment_data.get('ura_config') is None) else UraConfig(attachment_data['ura_config']),
        aoharu_config = None if (attachment_data.get('aoharu_config') is None) else AoharuConfig(attachment_data['aoharu_config']),
        mant_config = None if (attachment_data.get('mant_config') is None) else MantConfig(attachment_data['mant_config']))
    try:
        eo = attachment_data.get('event_overrides', attachment_data.get('event_choices', {}))
        td.event_overrides = eo if isinstance(eo, dict) else {}
    except Exception:
        td.event_overrides = {}

    try:
        ew = attachment_data.get('event_weights', None)
        td.event_weights = ew if isinstance(ew, dict) else None
    except Exception:
        td.event_weights = None

    td.do_tt_next = attachment_data.get('do_tt_next', False)
    td.wit_special_multiplier = attachment_data.get('wit_special_multiplier', list(DEFAULT_WIT_SPECIAL_MULTIPLIER))
    td.skip_double_circle_unless_high_hint = attachment_data.get('skip_double_circle_unless_high_hint', False)
    td.hint_boost_characters = attachment_data.get('hint_boost_characters', [])
    td.hint_boost_multiplier = int(attachment_data.get('hint_boost_multiplier', 100))
    td.friendship_score_groups = attachment_data.get('friendship_score_groups', [])
    td.stat_value_multiplier = attachment_data.get('stat_value_multiplier', list(DEFAULT_STAT_VALUE_MULTIPLIER))
    td.stat_cap_penalties = attachment_data.get('stat_cap_penalties', [list(x) for x in DEFAULT_STAT_CAP_PENALTIES])
    ut.detail = td
    return ut
