import { Subscription } from 'rxjs';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';

import {
  Component, OnInit, Input, Output, AfterViewInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup
} from '@angular/forms';
import { Log, Level } from 'ng2-logger';
import { DualComponentController } from './dual-component-ctrl';
import { EventEmitter } from '@angular/core';

const log = Log.create('base formly component', Level.__NOTHING)


@Component({
  selector: 'app-base-formly-component-meta',
  template: `<div></div>`
})
export abstract class BaseFormlyComponent<T extends DualComponentController = DualComponentController>
  extends FieldType
  implements OnInit, Partial<DualComponentController<T>>, AfterViewInit {

  protected DualComponentController = DualComponentController;
  public ctrl: T = {} as any;
  @Input() pizda: any;

  // @ts-ignore
  get mode() {
    return this.ctrl.mode;
  }

  // @ts-ignore
  @Input() set mode(v) {
    this.ctrl.mode = v;
  }
  @Input() disabled: boolean;
  @Input() required: boolean;
  @Input() label: string;
  @Input() placeholder: string;
  @Input() defaultValue: T;

  // @ts-ignore
  @Input() set model(v) {
    this.ctrl.model = v;
  }
  get model() {
    return this.ctrl.model;
  }
  @Input() path: string;
  @Output() change = new EventEmitter();


  // @ts-ignore
  @Input() set key(value: string) {
    if (this.ctrl && this.ctrl.isFormlyMode) {
      return;
    }
    this.path = value;
  }
  get key(): string {
    if (this.ctrl && this.ctrl.isFormlyMode) {
      return this.field.key as any;
    }
    return this.path;
  }

  // @ts-ignore
  // @Input() formControl: FormControl; // TODO QUICK_FIX
  protected handlers: Subscription[] = [];

  ngOnDestroy(): void {
    this.handlers.forEach(h => h.unsubscribe());
    this.handlers.length = 0;

  }

  ngAfterViewInit() {

  }

  private __field = {
    templateOptions: {

    }
  } as FormlyFieldConfig;
  // _model: any;
  ngOnInit() {
    // console.log('model', this.model)
    // console.log('ket', this.key)
    const isFormlyMode = !!this.field;
    log.i(`isFormlyMode: ${isFormlyMode}`);
    if (!isFormlyMode) {
      const that = this;
      Object.defineProperty(this, 'field', {
        get: function () {
          return that.__field;
        },
        set: function (v) {
          that.__field = v;
        }
      })
    }

    const existed = this.ctrl;
    this.ctrl = new (this.DualComponentController as any)(this, isFormlyMode);
    // @ts-ignore
    Object.keys(existed).forEach(key => {
      this.ctrl[key] = existed[key];
    });

    // if (!this.formControl) {
    //   this.formControl = new FormControl({})
    //   Object.defineProperty(this, 'field', {
    //     get: () => {
    //       return {
    //         formControl: this.formControl
    //       } as FormlyFieldConfig
    //     }
    //   })
    //   //   this.formControl = new FormControl({})
    // }
    // @ts-ignore
    this.change.next(this.ctrl.value);
  }

}
