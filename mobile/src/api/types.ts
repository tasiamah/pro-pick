export type Team = {
  id: number;
  name: string;
  logo_url: string | null;
  form?: ('W' | 'D' | 'L')[];
};

export type Odds = {
  bookmaker: string;
  home: number;
  draw: number;
  away: number;
};

export type Prediction = {
  match_id: number;
  model_version: string;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  insights?: string[];
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

export type RiskDistribution = {
  low: number;
  medium: number;
  high: number;
};

export type PredictionOutcomes = {
  home_win: number;
  draw: number;
  away_win: number;
};

export type Analytics = {
  accuracy: number | null;
  log_loss: number | null;
  roi: number | null;
  total_value_bets: number;
  settled_value_bets: number;
  roi_trend: RoiTrendPoint[];
  confident_accuracy?: number | null;
  confident_coverage?: number | null;
  confidence_threshold?: number | null;
  total_predictions?: number;
  avg_confidence?: number | null;
  high_confidence_count?: number;
  confidence_trend?: number[];
  risk_distribution?: RiskDistribution;
  prediction_outcomes?: PredictionOutcomes;
  predictions_today?: number;
};

export type Dashboard = {
  matches_today: number;
  upcoming_matches: number;
  latest_kickoff: string | null;
  top_value_bets: ValueBet[];
  model_accuracy: number | null;
  roi: number | null;
  confident_accuracy: number | null;
  confident_coverage: number | null;
  confidence_threshold: number | null;
};

export type MatchListParams = {
  limit?: number;
  offset?: number;
  kickoff_from?: string;
  kickoff_to?: string;
  status?: 'upcoming' | 'live' | 'completed';
  odds_tier?: 'all' | 'low' | 'medium' | 'high';
  q?: string;
};

export type PredictionListParams = {
  limit?: number;
  match_id?: number;
};

export type ValueBetListParams = {
  limit?: number;
  match_id?: number;
};

export type PushTokenRegisterRequest = {
  device_id: string;
  expo_push_token: string;
  platform: string;
};

export type PushTokenRegisterResponse = {
  device_id: string;
  registered: boolean;
};

export type MatchNotificationSettings = {
  match_id: number;
  settings: Record<string, boolean>;
};
