import pandas as pd
import numpy as np
import requests
from bs4 import BeautifulSoup
from bs4 import Comment
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from data_cleaners.pfr_def_cleaner import PFRCleaner
from services.espn_api import get_current_season
import time
from urllib3.exceptions import ReadTimeoutError

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

        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--window-size=1920,1080")
        options.page_load_strategy = "eager"

        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        # Selenium's HTTP client defaults to a ~120s read timeout; keep page-load below that
        # so we get a Selenium TimeoutException instead of an urllib3 ReadTimeoutError.
        self.driver.set_page_load_timeout(90)
        self.driver.set_script_timeout(90)

    def _check_cancel(self):
        if self.cancel_requested and self.cancel_requested():
            raise RuntimeError("Dataset refresh cancelled by user.")

    def close(self):
        if self.driver:
            self.driver.quit()
            self.driver = None

    def _restart_driver(self):
        self.close()
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--window-size=1920,1080")
        options.page_load_strategy = "eager"

        self.driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=options
        )
        self.driver.set_page_load_timeout(90)
        self.driver.set_script_timeout(90)
    
    def pfr_scrape_def_vs_stats(self, year, position):
        self._check_cancel()
        capitalized_position = position.upper()
        pfr_team_def_url = f'https://www.pro-football-reference.com/years/{year}/fantasy-points-against-{capitalized_position}.htm'

        for attempt in range(3):
            self._check_cancel()
            try:
                self.driver.get(pfr_team_def_url)
                break
            except TimeoutException:
                self.driver.execute_script("window.stop();")
                break
            except (ReadTimeoutError, WebDriverException):
                self._restart_driver()
                if attempt == 2:
                    raise

        try:
            WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.ID, "div_fantasy_def")))
        except TimeoutException:
            pass

        self._check_cancel()
        html = self.driver.page_source
        def_vs_stats_uncleaned = self.extract_pfr_table(html, "div_fantasy_def", "fantasy_def")

        if def_vs_stats_uncleaned is None:
            return pd.DataFrame()
        
        def_vs_stats = self.pfr_clean_def_vs_stats(def_vs_stats_uncleaned)
        return def_vs_stats
    
    def pfr_scrape_def_vs_many_stats(self, seasons, positions=["QB", "RB", 'WR', "TE"]):
        self._check_cancel()
        seasons = [int(s) for s in seasons]
        positions = [p.upper() for p in positions]
        def_vs_dict_unflattened = {pos : [] for pos in positions}

        for pos in positions:
            for year in seasons:
                self._check_cancel()
                def_vs_stats = self.pfr_scrape_def_vs_stats(year, pos)

                if def_vs_stats.empty or def_vs_stats is None:
                    continue

                def_vs_stats["season"] = year
                def_vs_dict_unflattened[pos].append(def_vs_stats)
        
        def_vs_dict = {}
        for pos in positions:
            self._check_cancel()
            def_vs_dict[pos] = pd.concat(def_vs_dict_unflattened[pos], ignore_index=True)

        return def_vs_dict
    
    def cbs_scrape_team_def_stats(self, position):
        cbs_def_vs_stats_url = f"https://www.cbssports.com/fantasy/football/stats/posvsdef/{position}/ALL/avg/standard"
        renamed_columns = ['Rank', 'Team', 'Rush Att', 'Rush Yds', 'Rush YPA', 'Rush TD', 'Targt', 'Recpt', 'Rec Yds', 'YPC', 'Rec TD', 'FL', 'FPTS']

        response = requests.get(cbs_def_vs_stats_url, timeout=25)
        soup = BeautifulSoup(response.text, 'lxml')

        table = soup.select("table.data.compact")
        html_table = str(table)
        def_df = pd.read_html(html_table)[0]

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

        dfs = pd.read_html(str(table))
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
