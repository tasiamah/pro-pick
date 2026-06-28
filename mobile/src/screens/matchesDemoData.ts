import type { MatchDetail } from '../api/types';

export function buildDemoKickoff(referenceDate: Date = new Date(), daysAhead = 7): string {
  const kickoff = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate() + daysAhead,
      15,
      0,
      0,
      0,
    ),
  );

  return kickoff.toISOString();
}

const DEMO_KICKOFF = buildDemoKickoff();

export function findDemoMatchById(matchId: number): MatchDetail | null {
  return MATCHES_DEMO_DATA.find((match) => match.id === matchId) ?? null;
}

export const MATCHES_DEMO_DATA: MatchDetail[] = [
  {
    id: -1,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'Premier League',
    home_team: {
      id: 101,
      name: 'Bournemouth',
      logo_url: null,
      form: ['W', 'W', 'D', 'W', 'W'],
    },
    away_team: {
      id: 102,
      name: 'Luton',
      logo_url: null,
      form: ['L', 'D', 'L', 'W', 'L'],
    },
    odds: [{ bookmaker: 'Demo', home: 1.85, draw: 3.4, away: 4.5 }],
    prediction: {
      match_id: -1,
      model_version: 'demo',
      prob_home: 0.81,
      prob_draw: 0.11,
      prob_away: 0.08,
      insights: [
        'Bournemouth in form',
        'Luton poor away form',
        'Home team confident',
      ],
    },
  },
  {
    id: -2,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'Ligue 1',
    home_team: {
      id: 103,
      name: 'Rennes',
      logo_url: null,
      form: ['W', 'D', 'W', 'L', 'W'],
    },
    away_team: {
      id: 104,
      name: 'Nantes',
      logo_url: null,
      form: ['D', 'L', 'W', 'D', 'L'],
    },
    odds: [{ bookmaker: 'Demo', home: 2.1, draw: 3.2, away: 3.6 }],
    prediction: {
      match_id: -2,
      model_version: 'demo',
      prob_home: 0.72,
      prob_draw: 0.16,
      prob_away: 0.12,
      insights: ['Rennes strong at home'],
    },
  },
  {
    id: -3,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'Serie A',
    home_team: {
      id: 105,
      name: 'Torino',
      logo_url: null,
      form: ['D', 'W', 'L', 'D', 'W'],
    },
    away_team: {
      id: 106,
      name: 'Milan',
      logo_url: null,
      form: ['W', 'W', 'D', 'W', 'W'],
    },
    odds: [{ bookmaker: 'Demo', home: 3.1, draw: 3.0, away: 2.4 }],
    prediction: {
      match_id: -3,
      model_version: 'demo',
      prob_home: 0.22,
      prob_draw: 0.68,
      prob_away: 0.1,
      insights: ['Evenly matched teams'],
    },
  },
  {
    id: -4,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'La Liga',
    home_team: {
      id: 107,
      name: 'Osasuna',
      logo_url: null,
      form: ['L', 'D', 'W', 'L', 'D'],
    },
    away_team: {
      id: 108,
      name: 'Alaves',
      logo_url: null,
      form: ['D', 'L', 'L', 'W', 'D'],
    },
    odds: [],
    prediction: null,
  },
  {
    id: -5,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'Bundesliga',
    home_team: {
      id: 109,
      name: 'Freiburg',
      logo_url: null,
      form: ['W', 'W', 'D', 'W', 'L'],
    },
    away_team: {
      id: 110,
      name: 'Augsburg',
      logo_url: null,
      form: ['L', 'W', 'D', 'L', 'W'],
    },
    odds: [{ bookmaker: 'Demo', home: 1.95, draw: 3.5, away: 4.0 }],
    prediction: {
      match_id: -5,
      model_version: 'demo',
      prob_home: 0.76,
      prob_draw: 0.14,
      prob_away: 0.1,
      insights: ['Freiburg unbeaten in four'],
    },
  },
  {
    id: -6,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'Eredivisie',
    home_team: {
      id: 111,
      name: 'Utrecht',
      logo_url: null,
      form: ['W', 'D', 'W', 'W', 'D'],
    },
    away_team: {
      id: 112,
      name: 'Heerenveen',
      logo_url: null,
      form: ['D', 'W', 'L', 'D', 'W'],
    },
    odds: [{ bookmaker: 'Demo', home: 2.45, draw: 3.3, away: 2.9 }],
    prediction: {
      match_id: -6,
      model_version: 'demo',
      prob_home: 0.64,
      prob_draw: 0.2,
      prob_away: 0.16,
      insights: ['Utrecht slight edge at home'],
    },
  },
  {
    id: -7,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'Primeira Liga',
    home_team: {
      id: 113,
      name: 'Braga',
      logo_url: null,
      form: ['W', 'L', 'W', 'W', 'W'],
    },
    away_team: {
      id: 114,
      name: 'Famalicao',
      logo_url: null,
      form: ['L', 'D', 'L', 'W', 'D'],
    },
    odds: [{ bookmaker: 'Demo', home: 1.72, draw: 3.6, away: 5.0 }],
    prediction: {
      match_id: -7,
      model_version: 'demo',
      prob_home: 0.79,
      prob_draw: 0.12,
      prob_away: 0.09,
      insights: ['Braga on a winning run'],
    },
  },
  {
    id: -8,
    kickoff: DEMO_KICKOFF,
    status: 'scheduled',
    competition_name: 'Scottish Premiership',
    home_team: {
      id: 115,
      name: 'Hearts',
      logo_url: null,
      form: ['D', 'W', 'W', 'L', 'W'],
    },
    away_team: {
      id: 116,
      name: 'Livingston',
      logo_url: null,
      form: ['L', 'L', 'D', 'L', 'D'],
    },
    odds: [{ bookmaker: 'Demo', home: 4.2, draw: 3.5, away: 1.9 }],
    prediction: {
      match_id: -8,
      model_version: 'demo',
      prob_home: 0.18,
      prob_draw: 0.24,
      prob_away: 0.58,
      insights: ['Livingston favored on recent form'],
    },
  },
];
