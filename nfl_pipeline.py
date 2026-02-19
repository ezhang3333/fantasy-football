from data_extractors.nfl_rp_extractor import NFLReadExtractor
from data_cleaners.nfl_rp_cleaner import NFLReadCleaner
from data_extractors.nfl_stats_web_scraper import NFLWebScraper
from data_cleaners.pfr_def_cleaner import PFRCleaner
from data_cleaners.positions.qb_cleaner import QBCleaner
from data_finalizers.qb_finalizer import QBFinalizer
from data_cleaners.positions.rb_cleaner import RBCleaner
from data_finalizers.rb_finalizer import RBFinalizer
from data_cleaners.positions.wr_cleaner import WRCleaner
from data_finalizers.wr_finalizer import WRFinalizer
from data_cleaners.positions.te_cleaner import TECleaner
from data_finalizers.te_finalizer import TEFinalizer
import pandas as pd


class DatasetRefreshCancelled(Exception):
    pass


class NFLDataPipeline:
    def __init__(self, seasons, cancel_requested=None):
        self.seasons = seasons
        self.cancel_requested = cancel_requested
        self.POS_REGISTRY = {
            "QB": ("calculate_def_vs_qb", QBCleaner, QBFinalizer),
            "RB": ("calculate_def_vs_rb", RBCleaner, RBFinalizer),
            "WR": ("calculate_def_vs_wr", WRCleaner, WRFinalizer),
            "TE": ("calculate_def_vs_te", TECleaner, TEFinalizer),
        }

    def _check_cancel(self):
        if self.cancel_requested and self.cancel_requested():
            raise DatasetRefreshCancelled("Dataset refresh cancelled by user.")

    def run_pipeline(
        self, 
        positions=("QB", "RB", "WR", "TE"),
        save_extracted=False, 
        save_cleaned=False, 
        save_final=False,
        out_dir="pipeline_data"
    ):
        positions = [pos.upper() for pos in positions]
        self._check_cancel()

        nfl_read_extractor = NFLReadExtractor(self.seasons, cancel_requested=self.cancel_requested)
        raw_data = nfl_read_extractor.get_all_data()
        self._check_cancel()

        nfl_read_cleaner = NFLReadCleaner(raw_data)
        merged_data = nfl_read_cleaner.merge_data_to_player_weeks()
        self._check_cancel()

        nfl_web_scraper = NFLWebScraper(cancel_requested=self.cancel_requested)
        try:
            pfr_def_vs_dict = nfl_web_scraper.pfr_scrape_def_vs_many_stats(self.seasons, positions=positions)
        finally:
            nfl_web_scraper.close()
        self._check_cancel()

        pfr_cleaner = PFRCleaner()

        if save_extracted:
            merged_data.to_csv(f"{out_dir}/extracted/merged_player_data.csv", index=False)

        datasets_by_pos = {}

        for pos in positions:
            self._check_cancel()
            pfr_cleaner_def_vs_method_name, CleanerClass, FinalizerClass = self.POS_REGISTRY[pos]

            # pasing method by reference
            pfr_cleaner_def_vs_method = getattr(pfr_cleaner, pfr_cleaner_def_vs_method_name)
            def_vs_cleaned = pfr_cleaner_def_vs_method(pfr_def_vs_dict[pos])

            pos_cleaner = CleanerClass(merged_data, def_vs_cleaned)
            cleaned_data = pos_cleaner.add_calculated_stats()

            if save_cleaned:
                def_vs_cleaned.to_csv(f"{out_dir}/cleaned/pfr_def_vs_{pos.lower()}_cleaned.csv", index=False)
                cleaned_data.to_csv(f"{out_dir}/cleaned/{pos.lower()}_data.csv", index=False)

            finalizer = FinalizerClass(cleaned_data)
            final_data = finalizer.extract_finalized_dataset()

            if save_final:
                final_data.to_csv(f"{out_dir}/final/{pos.lower()}_final_data.csv", index=False)

            datasets_by_pos[pos] = final_data

        return datasets_by_pos
