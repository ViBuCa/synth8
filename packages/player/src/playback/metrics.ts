export type TonePlaybackMetrics = {
  layerCount: number;
  synthCount: number;
  drumVoiceCount: number;
  effectNodeCount: number;
  scheduledEventCount: number;
  scheduleCallbackCount: number;
};

const metrics: TonePlaybackMetrics = {
  layerCount: 0,
  synthCount: 0,
  drumVoiceCount: 0,
  effectNodeCount: 0,
  scheduledEventCount: 0,
  scheduleCallbackCount: 0,
};

export const resetTonePlaybackMetrics = (): void => {
  for (const key of Object.keys(metrics) as Array<keyof TonePlaybackMetrics>) metrics[key] = 0;
};

export const getTonePlaybackMetrics = (): TonePlaybackMetrics => ({ ...metrics });

export const recordTonePlaybackMetric = <K extends keyof TonePlaybackMetrics>(
  key: K,
  amount = 1,
): void => {
  metrics[key] += amount;
};
