import * as WebBrowser from 'expo-web-browser';

import { env } from '@/lib/env';

export function openErp(path: string) {
  return WebBrowser.openBrowserAsync(`${env.erpBaseUrl}${path.startsWith('/') ? path : `/${path}`}`);
}
