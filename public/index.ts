import './index.scss';

import { AlarmsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, OpenSearch Dashboards Platform `plugin()` initializer.
export function plugin() {
  return new AlarmsPlugin();
}
export { AlarmsPluginSetup, AlarmsPluginStart } from './types';
