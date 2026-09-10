export type PlaybackMetrics = {
  layerCount: number;
  synthCount: number;
  drumVoiceCount: number;
  effectNodeCount: number;
  scheduledEventCount: number;
  scheduleCallbackCount: number;
};

const metrics: PlaybackMetrics = {
  layerCount: 0,
  synthCount: 0,
  drumVoiceCount: 0,
  effectNodeCount: 0,
  scheduledEventCount: 0,
  scheduleCallbackCount: 0,
};

export const resetPlaybackMetrics = (): void => {
  for (const key of Object.keys(metrics) as Array<keyof PlaybackMetrics>) metrics[key] = 0;
};

export const getPlaybackMetrics = (): PlaybackMetrics => ({ ...metrics });

export const recordPlaybackMetric = <K extends keyof PlaybackMetrics>(key: K, amount = 1): void => {
  metrics[key] += amount;
};
