//#region imports
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChangelogData } from 'tnp-helpers/src';
//#endregion

@Component({
  selector: 'app-helpers-check',
  templateUrl: './helpers-check.container.html',
  styleUrls: ['./helpers-check.container.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterOutlet],
})
export class HelpersCheckContainer {
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    const dummyData: ChangelogData = {
      changes: [],
      version: '0.0.0',
      date: new Date().toString(),
    };
    console.log({ dummyData });
  }
}
