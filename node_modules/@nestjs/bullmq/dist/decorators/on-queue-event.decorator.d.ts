import { QueueEventsListener } from 'bullmq';
export interface OnQueueEventMetadata {
    eventName: keyof QueueEventsListener;
}
/**
 * Registers a queue event listener.
 * Class that contains queue event listeners must be annotated
 * with the "QueueEventsListener" decorator.
 */
export declare const OnQueueEvent: (eventName: keyof QueueEventsListener) => MethodDecorator;
//# sourceMappingURL=on-queue-event.decorator.d.ts.map