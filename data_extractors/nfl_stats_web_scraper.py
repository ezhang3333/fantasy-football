import pandas as pd
import requests
from bs4 import BeautifulSoup
from scrapling.fetchers import StealthyFetcher, StealthySession
from services.espn_api import get_current_season
import time
from io import StringIO

"""
team_def_stats : [
        'Rk', 'Tm', 'G', 'PA', 'Yds', 'Ply', 'Y/P', 'TO', 'FL', '1stD', 'Cmp',
       'Att', 'Yds', 'TD', 'Int', 'NY/A', '1stD', 'Att', 'Yds', 'TD', 'Y/A',
       '1stD', 'Pen', 'Yds', '1stPy', 'Sc%', 'TO%', 'EXP'
    ]

adv_def_stats : [
        'Tm', 'G', 'Att', 'Cmp', 'Yds', 'TD', 'DADOT', 'Air', 'YAC', 'Bltz',
       'Bltz%', 'Hrry', 'Hrry%', 'QBKD', 'QBKD%', 'Sk', 'Prss', 'Prss%',
       'MTkl'
    ]
"""
class NFLWebScraper:
    def __init__(self, cancel_requested=None):
        self.year = get_current_season()
        self.cancel_requested = cancel_requested
    
    def pfr_scrape_def_vs_many_stats(self, seasons, positions=["QB", "RB", 'WR', "TE"]):
        seasons = [int(s) for s in seasons]
        positions = [p.upper() for p in positions]
        def_vs_dict_unflattened = {pos : [] for pos in positions}

        with StealthySession(headless=True, solve_cloudflare=True) as session:
            for pos in positions:
                for year in seasons:
                    pfr_team_def_url = f'https://www.pro-football-reference.com/years/{year}/fantasy-points-against-{pos}.htm'

                    page = session.fetch(pfr_team_def_url)
                    html = page.body.decode("utf-8", errors="replace")
                    def_vs_stats_uncleaned = self.extract_pfr_table(html, "div_fantasy_def", "fantasy_def")

                    if def_vs_stats_uncleaned is None:
                        raise RuntimeError(f"Missing table from {year}:{pos}")
                    
                    def_vs_stats = self.pfr_clean_def_vs_stats(def_vs_stats_uncleaned)
                    def_vs_stats["season"] = year
                    def_vs_dict_unflattened[pos].append(def_vs_stats)
        
        def_vs_dict = {}
        for pos in positions:
            def_vs_dict[pos] = pd.concat(def_vs_dict_unflattened[pos], ignore_index=True)

        return def_vs_dict
    
    def cbs_scrape_team_def_stats(self, position):
        cbs_def_vs_stats_url = f"https://www.cbssports.com/fantasy/football/stats/posvsdef/{position}/ALL/avg/standard"
        renamed_columns = ['Rank', 'Team', 'Rush Att', 'Rush Yds', 'Rush YPA', 'Rush TD', 'Targt', 'Recpt', 'Rec Yds', 'YPC', 'Rec TD', 'FL', 'FPTS']

        response = requests.get(cbs_def_vs_stats_url, timeout=25)
        soup = BeautifulSoup(response.text, 'lxml')

        table = soup.select("table.data.compact")
        html_table = str(table)
        def_df = pd.read_html(StringIO(html_table))[0]

        def_df = def_df.iloc[3:, :]
        def_df.columns = renamed_columns
        return def_df


    def extract_pfr_table(self, html, wrapper_id, table_id=None):
        soup = BeautifulSoup(html, "html.parser")
        
        wrapper = soup.find("div", id=wrapper_id)
        if wrapper is None:
            return None
        
        if table_id:
            table = wrapper.find("table", id=table_id)
        else:
            table = wrapper.find("table")

        if table is None:
            return None

        dfs = pd.read_html(StringIO(str(table)))
        return dfs[0]
    
    def pfr_clean_def_vs_stats(self, def_vs):
        def_vs = def_vs.copy()
        column_groups = {
            "Passing": ["completions", "pass_att", "pass_yds", "pass_tds", "pass_int", "2pp", "sacks"],
            "Rushing": ["rush_att", "rush_yds", "rush_tds"],
            "Receiving": ["rec_tgts", "rec_recept", "rec_yds", "rec_tds"],
            "Fantasy": ["fantpt", "dkpt", "fdpt"],
            "Fantasy per Game": ["fantpt_per_game", "dkpt_per_game", "fdpt_per_game"],
        }
        base_cols = ["team", "games"]

        stat_categories = def_vs.columns.get_level_values(0) 
        present_keys = set(stat_categories)

        group_order = ["Passing", "Rushing", "Receiving", "Fantasy", "Fantasy per Game"]

        grouped_cols = [column_groups[group] for group in group_order if group in present_keys]
        def_vs_cols = [col for group in grouped_cols for col in group]
        def_vs_cols = base_cols + def_vs_cols
        
        def_vs.columns = def_vs_cols
        return def_vs
