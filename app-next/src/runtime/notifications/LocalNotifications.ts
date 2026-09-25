import type { PermissionStatus } from '../../domain/types';
import type { LocalNotificationPlan } from '../../domain/notificationPlan';
export interface LocalNotificationsBackend {
  permission(request: boolean): Promise<PermissionStatus>;
  schedule(plan: LocalNotificationPlan): Promise<string>;
  cancel(id: string): Promise<void>;
}
export class LocalNotifications {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private backend: LocalNotificationsBackend, private isCurrent: () => boolean, private generation: () => number = () => 0) {}
  schedule(plan: LocalNotificationPlan): Promise<string> {
    const generation = this.generation();
    const current = () => this.isCurrent() && this.generation() === generation;
    const work = this.tail.then(async () => {
      if (!current()) throw new Error('Notification session changed');
      const permission = await this.backend.permission(false);
      if (!current()) throw new Error('Notification session changed');
      if (permission !== 'granted') {
        await this.backend.cancel(plan.id);
        throw new Error('Notifications are disabled in Settings');
      }
      await this.backend.cancel(plan.id);
      if (!current()) throw new Error('Notification session changed');
      const id = await this.backend.schedule(plan);
      if (!current()) {
        await this.backend.cancel(id);
        throw new Error('Notification session changed');
      }
      return id;
    });
    this.tail = work.catch(() => undefined);
    return work;
  }
  cancel(id: string): Promise<void> {
    const work = this.tail.then(() => this.backend.cancel(id));
    this.tail = work.catch(() => undefined);
    return work;
  }
}
