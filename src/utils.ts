export enum Chain {
  Arbitrum = 'ARBITRUM',
  Avalanche = 'AVALANCHE',
  Bsc = 'BSC',
  Eth = 'ETH',
  Fantom = 'FANTOM',
  Sepolia = 'SEPOLIA',
  Optimism = 'OPTIMISM',
  Polygon = 'POLYGON',
  Harmony = 'HARMONY',
  Elysium = 'ELYSIUM',
  Arthera = 'ARTHERA',
}

export const chainToIdMapping: Record<number, Chain> = {
  1: Chain.Eth,
  56: Chain.Bsc,
  137: Chain.Polygon,
  42161: Chain.Arbitrum,
  43114: Chain.Avalanche,
  10: Chain.Optimism,
  250: Chain.Fantom,
  1666600000: Chain.Harmony,
  1339: Chain.Elysium,
  10242: Chain.Arthera,
  11155111: Chain.Sepolia,
};

export const getRiskScoreEmoji = (riskScore: number) => {
  if (riskScore <= 25) {
    return '✅';
  } else if (riskScore <= 75) {
    return '⚠️';
  } else {
    return '❌';
  }
};
