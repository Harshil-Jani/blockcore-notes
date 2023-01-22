import { Component } from '@angular/core';
import { ApplicationState } from '../services/applicationstate';
import { RelayService } from '../services/relay';
import { RelayType } from '../types/relay';
import { Storage } from '../types/storage';

@Component({
  selector: 'app-development',
  templateUrl: './development.html',
  styleUrls: ['./development.css'],
})
export class DevelopmentComponent {
  worker?: Worker;
  storage?: Storage;

  constructor(private appState: ApplicationState, private relayService: RelayService) {}

  ngOnInit() {
    this.appState.updateTitle('Development & Debug');
  }

  async database() {
    this.storage = new Storage('blockcore-notes-' + this.appState.getPublicKey(), 1);
    await this.storage.open();

    // await this.storage.putCircle({ id: 1, name: 'Circle 1' });

    const circle = await this.storage.getCircle(1);
    console.log(circle);

    // await this.storage.putCircle({ id: 1, name: 'Circle 2' });

    const circle2 = await this.storage.getCircle(1);
    console.log(circle2);

    await this.storage.putEvents({ contentCut: false, tagsCut: false, content: '', created_at: 50, pubkey: '123', kind: 1, id: '1', tags: [] });
    await this.storage.putEvents({ contentCut: false, tagsCut: false, content: '', created_at: 100, pubkey: '123', kind: 1, id: '2', tags: [] });
    await this.storage.putEvents({ contentCut: false, tagsCut: false, content: '', created_at: 101, pubkey: '123', kind: 1, id: '3', tags: [] });
    await this.storage.putEvents({ contentCut: false, tagsCut: false, content: '', created_at: 199, pubkey: '123', kind: 1, id: '4', tags: [] });
    await this.storage.putEvents({ contentCut: false, tagsCut: false, content: '', created_at: 200, pubkey: '123', kind: 1, id: '5', tags: [] });
    await this.storage.putEvents({ contentCut: false, tagsCut: false, content: '', created_at: 201, pubkey: '123', kind: 1, id: '6', tags: [] });

    const start = performance.now();

    for (let index = 1; index < 10000; index++) {
      await this.storage.putEvents({ contentCut: false, tagsCut: false, content: '', created_at: index, pubkey: index.toString(), kind: 1, id: index.toString(), tags: [] });
    }

    const end = performance.now();
    console.log(`Execution time: ${end - start} ms`);

    const start2 = performance.now();

    const events = await this.storage.getEventsByCreated('123', IDBKeyRange.bound(100, 200));
    console.log('FOUND EVENTS:', events);

    const end2 = performance.now();
    console.log(`Execution time 2: ${end2 - start2} ms`);

    const events2 = await this.storage.getEventsByCreated('123', IDBKeyRange.bound(0, 100));
    console.log('FOUND EVENTS2:', events2);

    // await this.storage.initialize();
    // await this.storage.db.get().profiles.put('123', { id: '123', name: 'Sondre' });
    // const val = await this.storage.profiles.get('123');
    // console.log(val);

    // // const database = new Database('blockcore-notes-' + this.appState.getPublicKey(), 1);
    // await database.open();

    // await database.put();
    // const val = await database.get();
    // console.log(val);
  }

  databaseWorker() {
    console.log('Creating Worker...');

    // const worker = new RelayType('url', () => {
    //   console.log('CALLBACK!');
    // });

    // console.log(worker);
    // worker.download('');
  }

  schedule() {
    let relays = this.relayService.defaultRelays;
    let preparedRelays = relays;

    if (Array.isArray(preparedRelays)) {
      preparedRelays = {};

      for (let i = 0; i < relays.length; i++) {
        preparedRelays[relays[i]] = { read: true, write: true };
      }
    }

    const entries = Object.keys(preparedRelays);

    for (var i = 0; i < entries.length; i++) {
      const key = entries[i];
      const val = preparedRelays[key];

      this.relayService.createRelayWorker(key);

      // await this.table.put({ url: key, write: val.write, read: val.read, public: true });
    }

    // if (!this.worker) {
    //   this.worker = this.relayService.createRelayWorker('wss://nostr-pub.wellorder.net');
    // }

    this.worker?.postMessage({ type: 'connect' });

    // const worker = new Worker(new URL('../workers/relay.worker', import.meta.url));

    // scheduler.postTask(validateForm, { priority: 'user-blocking' });
  }

  sub?: string;

  subscription() {
    this.sub = this.relayService.workers[0].subscribe([{ authors: [this.appState.getPublicKey()], kinds: [1] }]);
  }

  unsubscribe() {
    this.relayService.workers[0].unsubscribe(this.sub!);
  }

  terminate() {
    this.relayService.workers[0].terminate();
  }

  ngOnDestroy() {
    this.worker?.terminate();
  }
}
