/** Must match backend / Freighter network */
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ||
  'Test SDF Network ; September 2015'

export const BELT_LEVELS = [
  {
    id: 'white',
    label: 'WHITE BELT',
    emoji: '⚪',
    color: '#c4c4c4',
    threshold: 0,
    description: 'New wallet — connect and claim your first credential.',
  },
  {
    id: 'yellow',
    label: 'YELLOW BELT',
    emoji: '🟡',
    color: '#f5c842',
    threshold: 1,
    description: 'First certificate anchored — you are verifiable.',
  },
  {
    id: 'green',
    label: 'GREEN BELT',
    emoji: '🟢',
    color: '#22c55e',
    threshold: 3,
    description: 'Multiple credentials — strong academic footprint.',
  },
  {
    id: 'blue',
    label: 'BLUE BELT',
    emoji: '🔵',
    color: '#3b82f6',
    threshold: 6,
    description: 'Advanced learner — rewards and employer-ready.',
  },
  {
    id: 'black',
    label: 'BLACK BELT',
    emoji: '⚫',
    color: '#a855f7',
    threshold: 10,
    description: 'Elite on-chain scholar — full Stellar access unlocked.',
  },
]
