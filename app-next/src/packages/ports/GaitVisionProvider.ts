export type GaitLandmarkName =
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftHip'
  | 'rightHip'
  | 'nose'
  | 'leftEar'
  | 'rightEar'
  | 'neck'
  | 'leftKnee'
  | 'rightKnee'
  | 'leftAnkle'
  | 'rightAnkle';

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
  readonly captureTimestampMs?: number;
  readonly analysisTimestampMs?: number;
  readonly sequence?: number;
  readonly empty?: boolean;
  readonly bodyAssociated?: boolean;
  readonly associationAmbiguous?: boolean;
  readonly cameraMotion?: { readonly x: number; readonly y: number; readonly quality: number };
  readonly timing?: {
    readonly poseMs: number;
    readonly faceMs: number;
    readonly motionMs: number;
    readonly totalMs: number;
  };
}

export type GaitSampleSubscription = () => void;

export interface GaitVisionProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(callback: (sample: GaitKeypointSample) => void): GaitSampleSubscription;
}
