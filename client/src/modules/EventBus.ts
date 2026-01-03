type EventHandler = (data: any) => void;

class EventBusClass {
  private handlers: { [key: string]: EventHandler[] } = {};

  subscribe(event: string, handler: EventHandler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
    return () => this.unsubscribe(event, handler);
  }

  unsubscribe(event: string, handler: EventHandler) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter(h => h !== handler);
  }

  publish(event: string, data: any) {
    if (!this.handlers[event]) return;
    this.handlers[event].forEach(handler => handler(data));
  }
}

export const EventBus = new EventBusClass();
