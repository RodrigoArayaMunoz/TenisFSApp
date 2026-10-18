import { Linking, Platform } from 'react-native';

const WHATSAPP_FALLBACK_DELAY = 1600;

export const buildWhatsAppLinks = (message) => {
  const encodedMessage = encodeURIComponent(message);

  return {
    appUrl: `whatsapp://send?text=${encodedMessage}`,
    androidIntentUrl:
      `intent://send?text=${encodedMessage}` +
      '#Intent;scheme=whatsapp;end',
    fallbackUrl: `https://wa.me/?text=${encodedMessage}`,
  };
};

const getWhatsAppWebLaunchUrl = ({ appUrl, androidIntentUrl }) => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /Android/i.test(userAgent) ? androidIntentUrl : appUrl;
};

const openWhatsAppFromWeb = (links) => {
  if (typeof window === 'undefined') return;

  const launchUrl = getWhatsAppWebLaunchUrl(links);
  let fallbackTimeoutId;
  let openedExternalApp = false;

  const cleanup = () => {
    if (fallbackTimeoutId) {
      window.clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
    }
    window.removeEventListener('blur', markExternalAppOpened);
    window.removeEventListener('pagehide', markExternalAppOpened);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
  const markExternalAppOpened = () => {
    openedExternalApp = true;
    cleanup();
  };
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.hidden) markExternalAppOpened();
  };

  window.addEventListener('blur', markExternalAppOpened, { once: true });
  window.addEventListener('pagehide', markExternalAppOpened, { once: true });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  fallbackTimeoutId = window.setTimeout(() => {
    cleanup();
    const pageIsHidden = typeof document !== 'undefined' && document.hidden;
    if (!openedExternalApp && !pageIsHidden) window.location.assign(links.fallbackUrl);
  }, WHATSAPP_FALLBACK_DELAY);

  try {
    window.location.assign(launchUrl);
  } catch {
    cleanup();
    window.location.assign(links.fallbackUrl);
  }
};

export const openWhatsAppShare = async (message) => {
  const links = buildWhatsAppLinks(message);
  if (Platform.OS === 'web') {
    openWhatsAppFromWeb(links);
    return;
  }

  try {
    await Linking.openURL(links.appUrl);
  } catch {
    await Linking.openURL(links.fallbackUrl);
  }
};
