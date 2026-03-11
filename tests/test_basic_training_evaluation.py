import unittest
from types import SimpleNamespace

from module.umamusume.define import SupportCardFavorLevel, SupportCardType
from module.umamusume.script.cultivate_task.ai import compute_basic_training_scores


def _card(favor, card_type):
    return SimpleNamespace(favor=favor, card_type=card_type)


def _training(cards=None, failure_rate=-1):
    return SimpleNamespace(
        support_card_info_list=list(cards or []),
        failure_rate=failure_rate,
    )


def _ctx(
    score_value=None,
    friendship_green_discount=10,
    npc_weight=None,
    compensate_failure=True,
    failure_rate_divisor=50.0,
):
    if score_value is None:
        score_value = [[11, 0.6, 9]] * 5
    if npc_weight is None:
        npc_weight = [5, 5, 5, 3, 0]
    detail = SimpleNamespace(
        score_value=score_value,
        friendship_green_discount=friendship_green_discount,
        npc_weight=npc_weight,
        compensate_failure=compensate_failure,
        failure_rate_divisor=failure_rate_divisor,
    )
    return SimpleNamespace(cultivate_detail=detail)


class BasicTrainingEvaluationTests(unittest.TestCase):
    def test_more_friendships_wins_power(self):
        ctx = _ctx()
        blue = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_1,
            SupportCardType.SUPPORT_CARD_TYPE_SPEED,
        )
        turn_info = SimpleNamespace(
            date=10,
            training_info_list=[
                _training([blue]),
                _training([blue]),
                _training([blue, blue, blue]),
                _training([blue]),
                _training([blue]),
            ],
        )

        scores = compute_basic_training_scores(ctx, turn_info)
        best_idx = max(range(5), key=lambda i: scores[i])

        self.assertEqual(best_idx, 2)
        self.assertEqual(scores, [11.0, 11.0, 33.0, 11.0, 11.0])

    def test_green_friendship_uses_discount(self):
        ctx = _ctx(score_value=[[10, 0.6, 9]] * 5, friendship_green_discount=20)
        green = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_2,
            SupportCardType.SUPPORT_CARD_TYPE_SPEED,
        )
        blue = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_1,
            SupportCardType.SUPPORT_CARD_TYPE_SPEED,
        )
        turn_info = SimpleNamespace(
            date=10,
            training_info_list=[
                _training([green]),
                _training([blue]),
                _training([]),
                _training([]),
                _training([]),
            ],
        )

        scores = compute_basic_training_scores(ctx, turn_info)

        self.assertEqual(scores[0], 8.0)
        self.assertEqual(scores[1], 10.0)
        self.assertGreater(scores[1], scores[0])

    def test_failure_rate_can_flip_winner(self):
        ctx = _ctx()
        blue = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_1,
            SupportCardType.SUPPORT_CARD_TYPE_SPEED,
        )
        turn_info = SimpleNamespace(
            date=10,
            training_info_list=[
                _training([blue]),
                _training([blue]),
                _training([blue, blue, blue], failure_rate=40),
                _training([blue]),
                _training([blue]),
            ],
        )

        scores = compute_basic_training_scores(ctx, turn_info)
        best_idx = max(range(5), key=lambda i: scores[i])

        self.assertEqual(best_idx, 0)
        self.assertAlmostEqual(scores[2], 6.6, places=6)
        self.assertLess(scores[2], scores[0])

    def test_npc_weight_is_applied(self):
        ctx = _ctx(npc_weight=[12, 12, 12, 12, 12])
        npc = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_1,
            SupportCardType.SUPPORT_CARD_TYPE_NPC,
        )
        blue = _card(
            SupportCardFavorLevel.SUPPORT_CARD_FAVOR_LEVEL_1,
            SupportCardType.SUPPORT_CARD_TYPE_SPEED,
        )
        turn_info = SimpleNamespace(
            date=10,
            training_info_list=[
                _training([npc]),
                _training([blue]),
                _training([]),
                _training([]),
                _training([]),
            ],
        )

        scores = compute_basic_training_scores(ctx, turn_info)
        best_idx = max(range(5), key=lambda i: scores[i])

        self.assertEqual(best_idx, 0)
        self.assertEqual(scores[0], 12.0)
        self.assertEqual(scores[1], 11.0)


if __name__ == "__main__":
    unittest.main()
