export type GaitLandmarkName = 'leftShoulder' | 'rightShoulder' | 'leftHip' | 'rightHip';

export interface GaitLandmark {
  readonly x: number;
  readonly y: number;
  readonly confidence: number;
}

export interface GaitHeadLandmark {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly confidence: number;
}

export interface GaitKeypointSample {
  readonly timestampMs: number;
  readonly landmarks: Partial<Record<GaitLandmarkName, GaitLandmark>>;
  readonly head?: GaitHeadLandmark;
}

export type GaitSampleSubscription = () => void;

export interface GaitVisionProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(callback: (sample: GaitKeypointSample) => void): GaitSampleSubscription;
}
