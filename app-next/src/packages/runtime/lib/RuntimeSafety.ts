export type RuntimeSafetySnapshot = {
  permissionPromptPending: boolean;
  cameraActive: boolean;
};
export class RuntimeSafety {
  private prompts = 0;
  private camera = false;
  read = (): RuntimeSafetySnapshot => ({ permissionPromptPending: this.prompts > 0, cameraActive: this.camera });
  async prompt<T>(operation: () => Promise<T>): Promise<T> {
    this.prompts++;
    try {
      return await operation();
    } finally {
      this.prompts--;
    }
  }
  async startCamera(operation: () => Promise<void>): Promise<void> {
    this.camera = true;
    await operation();
  }
  async stopCamera(operation: () => Promise<void>): Promise<void> {
    await operation();
    this.camera = false;
  }
}
