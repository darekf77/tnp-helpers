export const applicationConfigTemplate = (projectName: string): string => `

    export const ${projectName}AppConfig: ApplicationConfig = {
      providers: [
        {
          provide: APP_INITIALIZER,
          multi: true,
          useFactory: () => ${projectName}StartFunction,
        },
        provideBrowserGlobalErrorListeners(),
        provideRouter(${projectName}ClientRoutes),
        provideClientHydration(withEventReplay()),
        provideServiceWorker('ngsw-worker.js', {
          enabled: !isDevMode(),
          registrationStrategy: 'registerWhenStable:30000',
        }),
      ]
    }
    `;

export const serverNgPartTemplates = (projectName: string): string => `

  export const ${projectName}ServerRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

  export const ${projectName}ServerConfig: ApplicationConfig = {
    providers: [
      provideServerRendering(
        withRoutes(${projectName}ServerRoutes),
      ),
    ],
  };
  `;

export const ngMergeConfigTemplate = (projectName: string): string => `

export const ${projectName}Config = mergeApplicationConfig(
  ${projectName}AppConfig,
  ${projectName}ServerConfig,
);

    `;
