import unittest
from types import SimpleNamespace

from module.umamusume.define import (
    SupportCardFavorLevel,
    SupportCardType,
)
from module.umamusume.script.cultivate_task.training_select import (
    choose_training_index,
    compute_full_training_scores,
)


class _NoScenarioBonus:
    def compute_scenario_bonuses(self, ctx, idx, support_cards, date, period_idx, current_energy):
        return (0.0, 1.0, [], [])


def _card(favor, card_type):
    return SimpleNamespace(favor=favor, card_type=card_type)


def _training(cards=None, stat_results=None, failure_rate=-1, has_hint=False, energy_change=0.0):
    return SimpleNamespace(
        support_card_info_list=list(cards or []),
        stat_results=dict(stat_results or {}),
        failure_rate=failure_rate,
        has_hint=has_hint,
        energy_change=energy_change,
        detected_characters=[],
    )


def _ctx(training_info_list, *, date=10, umastats=None, expect_attr=None, extra_detail=None):
    if umastats is None:
        umastats = [300, 300, 300, 300, 300]
    if expect_attr is None:
        expect_attr = [1000, 1000, 1000, 1000, 1000]
    detail = {
        "score_value": [[11, 0.6, 9]] * 5,
        "friendship_green_discount": 10,
        "stat_value_multiplier": [1, 1, 1, 1, 1, 0.5],
        "npc_weight": [5, 5, 5, 3, 0],
        "base_score": [0, 0, 0, 0, 0],
        "friendship_score_groups": [],
        "stat_cap_penalties": [[95, 0], [90, 70], [80, 80], [70, 90]],
        "hint_boost_characters": [],
        "hint_boost_multiplier": 100,
        "scenario": _NoScenarioBonus(),
        "pal_friendship_score": [8.0, 5.7, 1.8],
        "pal_card_multiplier": 10,
        "compensate_failure": True,
        "failure_rate_divisor": 50.0,
        "expect_attribute": list(expect_attr),
    }
    if extra_detail:
        detail.update(extra_detail)
    turn_info = SimpleNamespace(
        date=date,
        training_info_list=training_info_list,
        uma_attribute=SimpleNamespace(
            speed=umastats[0],
            stamina=umastats[1],
            power=umastats[2],
            will=umastats[3],
            intelligence=umastats[4],
        ),
    )
    cultivate_detail = SimpleNamespace(turn_info=turn_info, **detail)
    return SimpleNamespace(cultivate_detail=cultivate_detail)


class TrainingSelectionScoringTests(unittest.TestCase):
    def test_full_scoring_prefers_power_with_more_friendships(self):
        blue = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_1,
            SupportCardType.SUPPORT_CARD_TYPE_SPEED,
        )
        trainings = [
            _training([blue]),
            _training([blue]),
            _training([blue, blue, blue]),
            _training([blue]),
            _training([blue]),
        ]
        ctx = _ctx(trainings)
        scores = compute_full_training_scores(ctx, 10, [0, 0, 0, 0, 0], current_energy=70)
        chosen = choose_training_index(scores, [False] * 5, 10, 0.34)

        self.assertEqual(chosen, 2)
        self.assertEqual(scores, [11.0, 11.0, 33.0, 11.0, 11.0])

    def test_cap_penalty_zeroes_capped_stat_training(self):
        trainings = [
            _training(stat_results={"speed": 30}),
            _training(),
            _training(stat_results={"power": 20}),
            _training(),
            _training(),
        ]
        ctx = _ctx(
            trainings,
            umastats=[960, 100, 500, 100, 100],
            expect_attr=[1000, 1000, 1000, 1000, 1000],
        )
        scores = compute_full_training_scores(ctx, 10, [0, 0, 0, 0, 0], current_energy=70)
        chosen = choose_training_index(scores, [False] * 5, 10, 0.34)

        self.assertEqual(scores[0], 0.0)
        self.assertEqual(scores[2], 20.0)
        self.assertEqual(chosen, 2)

    def test_extra_weight_multiplier_changes_winner(self):
        blue = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_1,
            SupportCardType.SUPPORT_CARD_TYPE_SPEED,
        )
        trainings = [
            _training([blue]),
            _training([blue]),
            _training([blue]),
            _training(),
            _training(),
        ]
        ctx = _ctx(trainings)
        scores = compute_full_training_scores(ctx, 10, [0, 0, 0.5, 0, 0], current_energy=70)
        chosen = choose_training_index(scores, [False] * 5, 10, 0.34)

        self.assertAlmostEqual(scores[0], 11.0, places=6)
        self.assertAlmostEqual(scores[2], 16.5, places=6)
        self.assertEqual(chosen, 2)

    def test_tie_break_prefers_lowest_index(self):
        chosen = choose_training_index([10.0, 10.0, 9.0, 1.0, 0.0], [False] * 5, 10, 0.34)
        self.assertEqual(chosen, 0)


if __name__ == "__main__":
    unittest.main()
