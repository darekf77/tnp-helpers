//#region @browser
import { _ } from 'tnp-core';
import { BaseFormlyComponent } from './base-formly-component';
import { CLASS } from 'typescript-class-helpers';
import {
  Component, OnInit, Input, Output, AfterViewInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup
} from '@angular/forms'
import { Log, Level } from 'ng2-logger';
const log = Log.create(`DualComponentController`);

export abstract class DualComponentController<T = any> {

  constructor(protected cmp: BaseFormlyComponent, public isFormlyMode = false) {

  }

  protected getValTemplateOptions(propertyName: string) {
    if (this.isFormlyMode) {
      const res = this.cmp.field?.templateOptions[propertyName]
      if (res === void 0 && this.cmp[propertyName]) {
        return this.cmp[propertyName];
      }
      return res;
    }
    return this.cmp[propertyName]
  }

  protected getValContext(propertyName: string) {
    if (this.isFormlyMode) {
      const res = this.cmp?.field[propertyName]
      if (res === void 0 && this.cmp[propertyName]) {
        return this.cmp[propertyName];
      }
      return res;
    }
    return this.cmp[propertyName]
  }

  get disabled() {
    return this.getValTemplateOptions('disabled') as boolean;
  }

  get required() {
    return this.getValTemplateOptions('required') as boolean;
  }

  get type() {
    if (!this.isFormlyMode) {
      return CLASS.getNameFromObject(this.cmp)
    }
    return this.getValContext('type') as boolean;
  }

  get label() {
    return this.getValTemplateOptions('label') as string;
  }

  get placeholder() {
    return this.getValTemplateOptions('placeholder') as string;
  }

  get defaultValue(): T {
    return this.getValContext('defaultValue') as any;
  }

  get formControl(): any {// FormControl { // TODO QUICK_FIX
    return this.getValContext('formControl') as any;
  }

  get key() {
    return this.getValContext('key') as string;
  }

  get path() {
    return this.getValContext('path') as string;
  }

  __model: any;
  get model(): any {
    if (this.isFormlyMode) {
      return this.getValContext('model') as string;
    } else {
      return this.__model;
    }
  }

  set model(v) {
    if (this.isFormlyMode) {
      log.w(`[DualComponentController] You can't set model in formly component mode`);
    } else {
      this.__model = v;
    }
  }

  __mode: any;
  get mode(): any {
    if (this.isFormlyMode) {
      return this.getValContext('mode') as string;
    } else {
      return this.__mode;
    }
  }

  set mode(v) {
    if (this.isFormlyMode) {
      // this.cmp.field.mode =
      // log.w(`[DualComponentController] You can't set mode in formly component mode`);
    } else {
      this.__mode = v;
    }
  }


  get value(): T {
    if (this.isFormlyMode) {
      return this.cmp.field.formControl.value;
    }
    if (_.isString(this.path)) {
      return _.get(this.cmp.model, this.path);
    }
    return this.cmp.model;
  }

  set value(v) {
    if (this.isFormlyMode) {
      this.cmp.field.formControl.setValue(v);
      // @ts-ignore
      this.cmp.change.next(v);
      return;
    }
    if (_.isString(this.path)) {
      _.set(this.cmp.model, this.path, v);
    } else {
      this.cmp.model = v;
    }
  }


}
//#endregion
