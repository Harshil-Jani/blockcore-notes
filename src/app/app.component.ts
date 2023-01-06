import { Component, ViewChild, ElementRef } from '@angular/core';
import { ApplicationState } from './services/applicationstate.service';
import { MatSidenav } from '@angular/material/sidenav';
import { Router, TitleStrategy } from '@angular/router';
import { AuthenticationService } from './services/authentication.service';
import { AppUpdateService } from './services/app-update.service';
import { CheckForUpdateService } from './services/check-for-update.service';
import { StorageService } from './services/storage.service';
import { MatDialog } from '@angular/material/dialog';
import { NoteDialog } from './shared/create-note-dialog/create-note-dialog';
import { Observable, map, shareReplay, startWith } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Location } from '@angular/common';
import { FeedService } from './services/feed.service';
import { RelayService } from './services/relay.service';
import { RelayStorageService } from './services/relay.storage.service';
import { DataService } from './services/data.service';
import { ProfileService } from './services/profile.service';
import { ScrollEvent } from './shared/scroll.directive';
import { NavigationService } from './services/navigation.service';
import { NostrProfileDocument } from './services/interfaces';
import { ThemeService } from './services/theme.service';
import { NostrProtocolRequest } from './common/NostrProtocolRequest';
import { SearchService } from './services/search.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('drawer') drawer!: MatSidenav;
  @ViewChild('draweraccount') draweraccount!: MatSidenav;
  @ViewChild('searchInput') searchInput!: ElementRef;
  authenticated = false;
  bgimagePath = '/assets/profile-bg.png';
  profile: NostrProfileDocument | undefined;
  visibilityHandler: any;
  searchControl: FormControl = new FormControl();

  constructor(
    public appState: ApplicationState,
    private storage: StorageService,
    public authService: AuthenticationService,
    private router: Router,
    public appUpdateService: AppUpdateService,
    public appUpdateCheckService: CheckForUpdateService,
    public dialog: MatDialog,
    private location: Location,
    private breakpointObserver: BreakpointObserver,
    private relayStorage: RelayStorageService,
    private feedService: FeedService,
    private relayService: RelayService,
    private dataService: DataService,
    public profileService: ProfileService,
    public navigationService: NavigationService,
    public searchService: SearchService,
    public theme: ThemeService
  ) {
    if (!this.visibilityHandler) {
      addEventListener('visibilitychange', (event) => {
        this.appState.visibility(document.visibilityState === 'visible');
      });
    }

    // This must happen in the constructor on app component, or when loading in PWA, it won't
    // be possible to read the query parameters.
    const queryParam = globalThis.location.search;

    if (queryParam) {
      const param = Object.fromEntries(new URLSearchParams(queryParam)) as any;
      this.appState.params = param;

      if (this.appState.params.nostr) {
        const protocolRequest = new NostrProtocolRequest();
        const protocolData = protocolRequest.decode(this.appState.params.nostr);

        if (protocolData && protocolData.scheme && protocolData.address) {
          const prefix = protocolData.scheme === 'nevent' ? '/e' : '/p';
          this.router.navigate([prefix, protocolData.address!]);
        }
      }
    }

    // appState.title = 'Blockcore Notes';
    this.authService.authInfo$.subscribe(async (auth) => {
      this.authenticated = auth.authenticated();

      if (this.authenticated) {
        await this.initialize();
      }
    });

    this.profileService.profile$.subscribe((profile) => {
      this.profile = profile;
    });
  }

  searchInputChanged() {
    if (this.appState.searchText) {
      this.searchService.search(this.appState.searchText);
    }
  }

  searchVisibility(visible: boolean) {
    this.appState.showSearch = visible;
    this.appState.searchText = '';

    if (visible) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      });
    }
  }

  async onScroll(event: ScrollEvent) {
    if (event.isReachingBottom) {
      // console.log(`the user is reaching the bottom`);
      this.navigationService.showMore();

      // this.loading = true;
      // setTimeout(async () => {

      //   // await this.updateTransactions(this.link);
      //   // this.loading = false;
      // });
    }
    if (event.isReachingTop) {
      // console.log(`the user is reaching the top`);
    }
    if (event.isWindowEvent) {
      console.log(`This event is fired on Window not on an element.`);
    }
  }

  isHandset$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 599px)').pipe(
    map((result) => result.matches),
    shareReplay()
  );

  goBack() {
    this.appState.navigateBack();
  }

  toggleMenu() {
    if (this.breakpointObserver.isMatched('(max-width: 599px)')) {
      this.drawer.toggle();
    }
  }

  openProfile() {
    this.router.navigateByUrl('/profile');
    this.toggleProfileMenu();
  }

  toggleProfileMenu() {
    this.draweraccount.toggle();
  }

  /** Run initialize whenever user has been authenticated. */
  async initialize() {
    await this.storage.open();
    await this.storage.initialize();

    await this.profileService.populate();
    await this.relayStorage.initialize();
    await this.relayService.initialize();
    await this.relayService.connect();
    await this.feedService.initialize();

    // This service will perform data cleanup, etc.
    await this.dataService.initialize();
  }

  async ngOnInit() {
    this.theme.init();

    this.searchControl.valueChanges.subscribe(async (value) => {
      this.appState.searchText = value;

      if (!value) {
        return;
      }

      if (value.length <= 1) {
        return;
      }

      await this.searchService.search(value);
    });

    // const testdata = await this.storage.get('123');
    // console.log(testdata);
    // await this.storage.putProfile('123', { about: 'Hi', name: 'Name', picture: '' });
    // const testdata = await this.storage.get('123', 'profile');
    // console.log(testdata);
  }
}
