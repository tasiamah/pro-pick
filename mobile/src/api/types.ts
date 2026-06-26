export type Team = {
  id: number;
  name: string;
  logo_url: string | null;
};

export type Odds = {
  bookmaker: string;
  home: number;
  draw: number;
  away: number;
};

export type Prediction = {
  model_version: string;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
};

export type Match = {
  id: number;
  kickoff: string | null;
  status: string;
  home_team: Team;
  away_team: Team;
  competition_name: string | null;
};

export type MatchDetail = Match & {
  odds: Odds[];
  prediction: Prediction | null;
};

export type ValueBet = {
  id: number;
  match_id: number;
  outcome: string;
  model_prob: number;
  odd: number;
  expected_value: number;
  edge: number;
  recommended_stake: number;
  confidence: number;
};

export type RoiTrendPoint = {
  date: string;
  roi: number;
};

export type Analytics = {
  accuracy: number | null;
  log_loss: number | null;
  roi: number | null;
  total_value_bets: number;
  settled_value_bets: number;
  roi_trend: RoiTrendPoint[];
};

export type Dashboard = {
  matches_today: number;
  upcoming_matches: number;
  latest_kickoff: string | null;
  top_value_bets: ValueBet[];
  model_accuracy: number | null;
  roi: number | null;
};

export type MatchListParams = {
  limit?: number;
  offset?: number;
  kickoff_from?: string;
  kickoff_to?: string;
};

export type PredictionListParams = {
  limit?: number;
};

export type ValueBetListParams = {
  limit?: number;
  match_id?: number;
};
