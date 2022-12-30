export namespace FiredevModels {

  export interface VSCodeSettings {
    'files.exclude': { [files: string]: boolean; };
    'workbench.colorTheme': 'Default Light+' | 'Kimbie Dark',
    'workbench.colorCustomizations': {
      'activityBar.background'?: string;
      'activityBar.foreground'?: string;
      'statusBar.background'?: string;
    }
  }


}
