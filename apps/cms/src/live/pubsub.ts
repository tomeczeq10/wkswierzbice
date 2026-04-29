export type PubSubMessage = {
  type: 'liveMatch'
  data: unknown
}

type Subscriber = (msg: PubSubMessage) => void

class PubSub {
  private subs = new Set<Subscriber>()

  subscribe(fn: Subscriber): () => void {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }

  publish(msg: PubSubMessage) {
    for (const fn of this.subs) fn(msg)
  }
}

// singleton (dev: survives module reloads)
const g = globalThis as any
g.__wksLivePubSub ||= new PubSub()

export const livePubSub: PubSub = g.__wksLivePubSub

