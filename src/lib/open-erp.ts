import * as WebBrowser from 'expo-web-browser';

import { env } from './env';

export async function openLiveErp(pathname: string): Promise<void> {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  await WebBrowser.openBrowserAsync(`${env.erpBaseUrl}${path}`);
}
