import pandas as pd
import nflreadpy as nfl_rp
from data_extractors.nfl_stats_web_scraper import NFLWebScraper
from services.espn_api import get_current_season


class NFLReadExtractor:
    def __init__(self, seasons, cancel_requested=None):
        self.seasons = [int(s) for s in seasons]
        self.cancel_requested = cancel_requested
        self.default_positions = ['QB', 'RB', 'WR', 'TE']

        self.keep = {
            "player_stats": [
                "player_id","player_name","player_display_name","position","position_group","headshot_url",
                "season","week","season_type","team","opponent_team",
                "completions","attempts","passing_yards","passing_tds","passing_interceptions",
                "sacks_suffered","sack_yards_lost","sack_fumbles","sack_fumbles_lost",
                "passing_air_yards","passing_yards_after_catch","passing_first_downs",
                "passing_epa","passing_cpoe","passing_2pt_conversions","pacr",
                "carries","rushing_yards","rushing_tds",
                "rushing_fumbles","rushing_fumbles_lost","rushing_first_downs","rushing_epa","rushing_2pt_conversions",
                "receptions","targets","receiving_yards","receiving_tds",
                "receiving_fumbles","receiving_fumbles_lost",
                "receiving_air_yards","receiving_yards_after_catch","receiving_first_downs","receiving_epa",
                "receiving_2pt_conversions","racr","target_share","air_yards_share","wopr",
                "fantasy_points","fantasy_points_ppr"
            ],
            "team_stats": [
                "season","team","season_type","games",
                "completions","attempts","passing_yards","passing_tds","passing_interceptions",
                "passing_air_yards","passing_yards_after_catch","passing_first_downs","passing_epa","passing_cpoe","passing_2pt_conversions",
                "carries","rushing_yards","rushing_tds","rushing_fumbles","rushing_fumbles_lost","rushing_first_downs","rushing_epa","rushing_2pt_conversions",
                "receptions","targets","receiving_yards","receiving_tds","receiving_fumbles","receiving_fumbles_lost",
                "receiving_air_yards","receiving_yards_after_catch","receiving_first_downs","receiving_epa",
                "penalties","penalty_yards"
            ],
            "schedules": [
                "game_id","season","game_type","week","gameday","weekday","gametime",
                "away_team","away_score","home_team","home_score","location","result","total","spread_line",
                "roof","surface","temp","wind","stadium_id","stadium"
            ],
            "players": [
                "gsis_id","display_name","first_name","last_name","short_name","football_name",
                "position_group","position","height","weight","college_conference","rookie_season",
                "last_season","latest_team","status","ngs_status","ngs_status_short_description",
                "years_of_experience","pff_status","draft_year","draft_round","draft_pick","draft_team"
            ],
            "rosters": [
                "season","team","position","depth_chart_position","jersey_number","status","full_name",
                "first_name","last_name","height","weight","college","gsis_id","sleeper_id","years_exp",
                "headshot_url","week","game_type","status_description_abbr","football_name",
                "entry_year","rookie_year","draft_club","draft_number"
            ],
            "rosters_weekly": [
                "season","team","position","depth_chart_position","jersey_number","status","full_name",
                "first_name","last_name","height","weight","college","gsis_id","sleeper_id","years_exp",
                "headshot_url","week","game_type","status_description_abbr","football_name",
                "entry_year","rookie_year","draft_club","draft_number"
            ],
            "snap_counts": [
                "game_id","season","game_type","week","player", "pfr_player_id", "position","team","opponent",
                "offense_snaps","offense_pct"
            ],
            "nextgen_passing": [
                "season","season_type","week","player_display_name","player_position","team_abbr",
                "avg_time_to_throw","avg_completed_air_yards","avg_intended_air_yards","avg_air_yards_differential",
                "aggressiveness","avg_air_yards_to_sticks","attempts","pass_yards","pass_touchdowns",
                "interceptions","passer_rating","completions","completion_percentage",
                "expected_completion_percentage","completion_percentage_above_expectation",
                "avg_air_distance","max_air_distance","player_gsis_id","player_first_name","player_last_name"
            ],
            "nextgen_rushing": [
                "season","season_type","week","player_display_name","player_position","team_abbr",
                "efficiency","percent_attempts_gte_eight_defenders","avg_time_to_los",
                "rush_attempts","rush_yards","avg_rush_yards","rush_touchdowns",
                "player_gsis_id","player_first_name","player_last_name","player_jersey_number","player_short_name",
                "expected_rush_yards","rush_yards_over_expected","rush_yards_over_expected_per_att","rush_pct_over_expected"
            ],
            "nextgen_receiving": [
                "season","season_type","week","player_display_name","player_position","team_abbr",
                "avg_cushion","avg_separation","avg_intended_air_yards","percent_share_of_intended_air_yards",
                "receptions","targets","catch_percentage","yards","rec_touchdowns","avg_yac","avg_expected_yac",
                "avg_yac_above_expectation","player_gsis_id","player_first_name","player_last_name",
                "player_jersey_number","player_short_name"
            ],
            "ff_opportunity": [
                "season","posteam","week","game_id","player_id","full_name","position",
                "pass_attempt","rec_attempt","rush_attempt",
                "pass_air_yards","rec_air_yards",
                "pass_completions","receptions","pass_completions_exp","receptions_exp",
                "pass_yards_gained","rec_yards_gained","rush_yards_gained",
                "pass_yards_gained_exp","rec_yards_gained_exp","rush_yards_gained_exp",
                "pass_touchdown","rec_touchdown","rush_touchdown",
                "pass_touchdown_exp","rec_touchdown_exp","rush_touchdown_exp",
                "pass_two_point_conv","rec_two_point_conv","rush_two_point_conv",
                "pass_two_point_conv_exp","rec_two_point_conv_exp","rush_two_point_conv_exp",
                "pass_first_down","rec_first_down","rush_first_down",
                "pass_first_down_exp","rec_first_down_exp","rush_first_down_exp",
                "pass_interception","rec_interception","pass_interception_exp","rec_interception_exp",
                "rec_fumble_lost","rush_fumble_lost",
                "pass_fantasy_points_exp","rec_fantasy_points_exp","rush_fantasy_points_exp",
                "pass_fantasy_points","rec_fantasy_points","rush_fantasy_points",
                "total_yards_gained","total_yards_gained_exp",
                "total_touchdown","total_touchdown_exp",
                "total_first_down","total_first_down_exp",
                "total_fantasy_points","total_fantasy_points_exp",
                "pass_completions_diff","receptions_diff",
                "pass_yards_gained_diff","rec_yards_gained_diff","rush_yards_gained_diff",
                "pass_touchdown_diff","rec_touchdown_diff","rush_touchdown_diff",
                "pass_two_point_conv_diff","rec_two_point_conv_diff","rush_two_point_conv_diff",
                "pass_first_down_diff","rec_first_down_diff","rush_first_down_diff",
                "pass_interception_diff","rec_interception_diff",
                "pass_fantasy_points_diff","rec_fantasy_points_diff","rush_fantasy_points_diff",
                "total_yards_gained_diff","total_touchdown_diff","total_first_down_diff","total_fantasy_points_diff",
                "pass_attempt_team","rec_attempt_team","rush_attempt_team",
                "pass_air_yards_team","rec_air_yards_team",
                "pass_completions_team","receptions_team","pass_completions_exp_team","receptions_exp_team",
                "pass_yards_gained_team","rec_yards_gained_team","rush_yards_gained_team",
                "pass_yards_gained_exp_team","rec_yards_gained_exp_team","rush_yards_gained_exp_team",
                "pass_touchdown_team","rec_touchdown_team","rush_touchdown_team",
                "pass_touchdown_exp_team","rec_touchdown_exp_team","rush_touchdown_exp_team",
                "pass_two_point_conv_team","rec_two_point_conv_team","rush_two_point_conv_team",
                "pass_two_point_conv_exp_team","rec_two_point_conv_exp_team","rush_two_point_conv_exp_team",
                "pass_first_down_team","rec_first_down_team","rush_first_down_team",
                "pass_first_down_exp_team","rec_first_down_exp_team","rush_first_down_exp_team",
                "pass_interception_team","rec_interception_team","pass_interception_exp_team","rec_interception_exp_team",
                "rec_fumble_lost_team","rush_fumble_lost_team",
                "pass_fantasy_points_exp_team","rec_fantasy_points_exp_team","rush_fantasy_points_exp_team",
                "pass_fantasy_points_team","rec_fantasy_points_team","rush_fantasy_points_team",
                "pass_completions_diff_team","receptions_diff_team",
                "pass_yards_gained_diff_team","rec_yards_gained_diff_team","rush_yards_gained_diff_team",
                "pass_touchdown_diff_team","rec_touchdown_diff_team","rush_touchdown_diff_team",
                "pass_two_point_conv_diff_team","rec_two_point_conv_diff_team","rush_two_point_conv_diff_team",
                "pass_first_down_diff_team","rec_first_down_diff_team","rush_first_down_diff_team",
                "pass_interception_diff_team","rec_interception_diff_team",
                "pass_fantasy_points_diff_team","rec_fantasy_points_diff_team","rush_fantasy_points_diff_team",
                "total_yards_gained_team","total_yards_gained_exp_team","total_yards_gained_diff_team",
                "total_touchdown_team","total_touchdown_exp_team","total_touchdown_diff_team",
                "total_first_down_team","total_first_down_exp_team","total_first_down_diff_team",
                "total_fantasy_points_team","total_fantasy_points_exp_team","total_fantasy_points_diff_team"
            ],
        }

    def _check_cancel(self):
        if self.cancel_requested and self.cancel_requested():
            raise RuntimeError("Dataset refresh cancelled by user.")
    
    def get_all_data(self):
        self._check_cancel()
        return {
            'player_stats': self.load_player_stats(),
            'team_stats': self.load_team_stats(),
            'schedules': self.load_schedules(),
            'players': self.load_players(),
            'rosters': self.load_rosters(),
            'rosters_weekly': self.load_rosters_weekly(),
            'snap_counts': self.load_snap_counts(),
            'nextgen_stats': self.load_nextgen_stats(),
            'ff_opportunity': self.load_ff_opportunity()
        }
        

    def load_player_stats(self):
        self._check_cancel()
        player_stats = nfl_rp.load_player_stats(self.seasons, 'reg').to_pandas()
        player_stats = player_stats.reindex(columns=self.keep["player_stats"])
        player_stats = player_stats[player_stats["position"].isin(self.default_positions)]
        return player_stats

    def load_team_stats(self):
        self._check_cancel()
        team_stats = nfl_rp.load_team_stats(self.seasons, 'reg').to_pandas()
        return team_stats.reindex(columns=self.keep["team_stats"])

    def load_schedules(self):
        self._check_cancel()
        schedules = nfl_rp.load_schedules(self.seasons).to_pandas()
        return schedules.reindex(columns=self.keep["schedules"])

    def load_players(self):
        self._check_cancel()
        players = nfl_rp.load_players().to_pandas()
        players = players[
            (players['position'].isin(self.default_positions)) &
            (players['last_season'].isin(self.seasons)) & 
            (players['status'] == 'ACT')]
        return players.reindex(columns=self.keep["players"])

    def load_rosters(self):
        self._check_cancel()
        rosters = nfl_rp.load_rosters(self.seasons).to_pandas()
        return rosters.reindex(columns=self.keep["rosters"])

    def load_rosters_weekly(self):
        self._check_cancel()
        rosters_weekly = nfl_rp.load_rosters_weekly(self.seasons).to_pandas()
        rosters_weekly = rosters_weekly[
            (rosters_weekly['position'].isin(self.default_positions)) &
            (rosters_weekly['status'] == 'ACT')]
        return rosters_weekly.reindex(columns=self.keep["rosters_weekly"])

    def load_snap_counts(self):
        self._check_cancel()
        snap_counts = nfl_rp.load_snap_counts(self.seasons).to_pandas()
        snap_counts = snap_counts[snap_counts['position'].isin(self.default_positions)]
        return snap_counts.reindex(columns=self.keep["snap_counts"])

    def load_nextgen_stats(self):
        self._check_cancel()
        frames = []
        for cat, key in [("passing","nextgen_passing"),
                         ("rushing","nextgen_rushing"),
                         ("receiving","nextgen_receiving")]:
            self._check_cancel()
            d = nfl_rp.load_nextgen_stats(self.seasons, cat).to_pandas()
            d = d.reindex(columns=self.keep[key])
            d["stat_category"] = cat
            frames.append(d)
        return pd.concat(frames, ignore_index=True)

    def load_ff_opportunity(self):
        self._check_cancel()
        ff_opportunity = nfl_rp.load_ff_opportunity(self.seasons, "weekly", "latest").to_pandas()
        return ff_opportunity.reindex(columns=self.keep["ff_opportunity"])
