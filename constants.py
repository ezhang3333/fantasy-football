from pathlib import Path

DB_PATH = str((Path(__file__).resolve().parent / "model" / "outputs" / "predictions.sqlite3"))

ALL_POSITIONS = ["QB", "RB", "WR", "TE"]

SEASONS_TO_EXTRACT = ["2025", "2024", "2023", "2022", "2021"]

TEAM_NAME_TO_ABBR = {
    "Arizona Cardinals": "ARI",
    "Atlanta Falcons": "ATL",
    "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR",
    "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LA",
    "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN",
    "New England Patriots": "NE",
    "New Orleans Saints": "NO",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS",
}

ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

qb_calculated_stats = [
    "air_yards_per_att",
    "yards_per_att",
    "td_rate",
    "int_rate",
    "fantasy_per_att",
    "delta_attempts",
    "delta_air_yards",
    "delta_cpoe",

    "attempts_3wk_avg",
    "attempts_7wk_avg",
    "attempts_trend_3v7",

    "air_yards_3wk_avg",
    "air_yards_7wk_avg",
    "air_yards_trend_3v7",

    "rush_td_rate",
    "rush_yards_per_game",
    "rush_yards_3wk_avg",
    "rush_yards_7wk_avg",
    "rush_trend_3v7",

    "team_implied_points",
    "def_pass_ypa_allowed",
    "def_total_tds_allowed",
    "def_pass_int_rate_forced",
    "def_sack_rate",
    "def_fantpt_allowed",
    "def_rush_ypa_allowed",

    "fantasy_3wk_avg",
    "fantasy_trend_3v7",
    "fantasy_prev_5wk_avg",
    "fantasy_next_4wk_avg",

    "is_rookie",
    "is_second_year",
    "years_exp",
    "draft_number",
    "is_undrafted",
]

rb_calculated_stats = [
    # volume
    "touches",
    "snap_share",
    "rush_share",
    "target_share",
    "weighted_opp_share",
    "total_touchdowns",
    "delta_touches",

    # trends
    "touches_3wk_avg",
    "touches_trend_3v7",
    "snap_share_3wk_avg",
    "snap_share_trend_3v7",
    "fantasy_3wk_avg",
    "fantasy_trend_3v7",
    "fantasy_prev_5wk_avg",
    "fantasy_next_4wk_avg",
    "tds_3wk_avg",
    "tds_trend_3v7",

    # rushing efficiency
    "rush_ypc",
    "rush_yoe_per_att",
    "rush_yoe_per_game",
    "stacked_box_rate",

    # receiving
    "catch_rate",
    "rec_yards_per_target",
    "avg_yac_above_expectation",

    # environment
    "team_implied_points",
    "is_favored",
    "abs_spread",

    # opposing defense
    "def_rush_ypa_allowed",
    "def_rb_carries_allowed",
    "def_rb_receptions_allowed",
    "def_rb_touchdowns_allowed",
    "def_rb_fantasy_points_allowed",

    # profile
    "years_exp_filled",
    "is_rookie",
    "is_undrafted",
    "draft_number_filled",
]

wr_calculated_stats = [
    # receiving volume
    "targets",
    "air_yards",
    "snap_share",
    "target_share",
    "air_yards_share",
    "total_touchdowns",
    "delta_targets",

    # rushing volume
    "rush_attempts",
    "rush_ypa",
    "rush_share",

    # trends
    "targets_3wk_avg",
    "targets_trend_3v7",
    "air_yards_3wk_avg",
    "air_yards_trend_3v7",
    "snap_share_3wk_avg",
    "snap_share_trend_3v7",
    "fantasy_ppr_3wk_avg",
    "fantasy_ppr_trend_3v7",
    "fantasy_prev_5wk_avg",
    "fantasy_next_4wk_avg",
    "tds_3wk_avg",
    "tds_trend_3v7",
    "gadget_usage_3wk_avg",

    # efficiency
    "yards_per_target",
    "rec_td_rate",
    "catch_rate",
    "fp_per_target",
    "avg_separation",
    "avg_cushion",
    "avg_yac_above_expectation",
    "racr",

    # environment
    "team_implied_points",
    "is_favored",
    "abs_spread",

    # defense
    "def_wr_ftps",
    "def_wr_targets",
    "def_wr_yards_per_target",
    
    # profile
    "years_exp_filled",
    "is_rookie",
    "is_second_year",
    "is_undrafted",
    "draft_number_filled"
]

te_calculated_stats = [
    # receiving volume
    "targets",
    "air_yards",
    "snap_share",
    "target_share",
    "air_yards_share",
    "total_touchdowns",
    "delta_targets",

    # rushing volume
    "rush_attempts",
    "rush_ypa",
    "rush_share",

    # trends
    "targets_3wk_avg",
    "targets_trend_3v7",
    "air_yards_3wk_avg",
    "air_yards_trend_3v7",
    "snap_share_3wk_avg",
    "snap_share_trend_3v7",
    "fantasy_ppr_3wk_avg",
    "fantasy_ppr_trend_3v7",
    "fantasy_prev_5wk_avg",
    "fantasy_next_4wk_avg",
    "tds_3wk_avg",
    "tds_trend_3v7",
    "gadget_usage_3wk_avg",

    # efficiency
    "yards_per_target",
    "rec_td_rate",
    "catch_rate",
    "fp_per_target",
    "avg_separation",
    "avg_cushion",
    "avg_yac_above_expectation",
    "racr",

    # environment
    "team_implied_points",
    "is_favored",
    "abs_spread",

    # defense
    "def_te_ftps",
    "def_te_targets",
    "def_te_yards_per_target",
    
    # profile
    "years_exp_filled",
    "is_rookie",
    "is_second_year",
    "is_undrafted",
    "draft_number_filled"
]

cbs_def_vs_rb_stats = [
    "def_rush_ypa_allowed", 
    "def_rb_carries_allowed", 
    "def_rb_receptions_allowed", 
    "def_rb_touchdowns_allowed", 
    "def_rb_fantasy_points_allowed"   
]

cbs_def_vs_wr_stats = [
    "def_wr_ftps",
    "def_wr_targets",
    "def_wr_yards_per_target"
]

cbs_def_vs_te_stats = [
    "def_te_ftps",
    "def_te_targets",
    "def_te_yards_per_target"
]
