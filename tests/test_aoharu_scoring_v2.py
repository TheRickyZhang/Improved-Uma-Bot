import unittest
from types import SimpleNamespace

from module.umamusume.scenario.aoharuhai.scoring import compute_aoharu_bonuses


class AoharuScoringV2Tests(unittest.TestCase):
    def test_uses_explicit_special_training_weights(self):
        ctx = SimpleNamespace(
            cultivate_detail=SimpleNamespace(
                special_training=[20, 12, 9, 7, 0],
                spirit_explosion=[0, 0, 0, 0, 0],
                wit_special_multiplier=[1.0, 1.0],
            )
        )
        support_cards = [
            SimpleNamespace(special_training_count=2, can_incr_special_training=False, spirit_explosion=False)
        ]

        additive, multiplier, formula_parts, mult_parts = compute_aoharu_bonuses(
            ctx, idx=0, support_card_info_list=support_cards, date=10, period_idx=0, current_energy=70
        )

        self.assertEqual(additive, 40.0)
        self.assertEqual(multiplier, 1.0)
        self.assertTrue(any("special(2):+40.0" in p for p in formula_parts))
        self.assertEqual(mult_parts, [])

    def test_falls_back_to_default_special_weights(self):
        ctx = SimpleNamespace(
            cultivate_detail=SimpleNamespace(
                spirit_explosion=[0, 0, 0, 0, 0],
                wit_special_multiplier=[1.0, 1.0],
            )
        )
        support_cards = [
            SimpleNamespace(special_training_count=1, can_incr_special_training=False, spirit_explosion=False)
        ]

        additive, _, _, _ = compute_aoharu_bonuses(
            ctx, idx=0, support_card_info_list=support_cards, date=30, period_idx=1, current_energy=70
        )

        self.assertEqual(additive, 12.0)

    def test_wit_special_multiplier_applies_for_wit_training(self):
        ctx = SimpleNamespace(
            cultivate_detail=SimpleNamespace(
                special_training=[15, 12, 9, 7, 0],
                spirit_explosion=[0, 0, 0, 0, 0],
                wit_special_multiplier=[2.0, 1.5],
            )
        )
        support_cards = [
            SimpleNamespace(special_training_count=1, can_incr_special_training=False, spirit_explosion=False)
        ]

        additive, _, _, mult_parts = compute_aoharu_bonuses(
            ctx, idx=4, support_card_info_list=support_cards, date=20, period_idx=0, current_energy=70
        )

        self.assertEqual(additive, 30.0)
        self.assertTrue(any("witspc:x2.00" in p for p in mult_parts))


if __name__ == "__main__":
    unittest.main()
