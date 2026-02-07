import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { AlarmsPluginSetup, AlarmsPluginStart } from './types';
import { defineRoutes } from './routes';
import { InMemoryAlarmService, AlarmsLogger } from '../core';

export class AlarmsPlugin implements Plugin<AlarmsPluginSetup, AlarmsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('alarms: Setup');
    const router = core.http.createRouter();

    // Adapt OSD logger to our platform-agnostic interface
    const logger: AlarmsLogger = {
      info: (msg) => this.logger.info(msg),
      warn: (msg) => this.logger.warn(msg),
      error: (msg) => this.logger.error(msg),
      debug: (msg) => this.logger.debug(msg),
    };

    const service = new InMemoryAlarmService(logger);
    defineRoutes(router, service);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('alarms: Started');
    return {};
  }

  public stop() {}
}
