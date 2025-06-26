'use client';
import Script from 'next/script';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function TelegramScript() {
  const router = useRouter();

  useEffect(() => {
    function handleTelegramAuth() {
      const tg = window.Telegram?.WebApp;
      if (!tg || typeof tg.initData !== 'string') {
        console.log('Telegram WebApp not initialized or missing initData');
        return;
      }

      console.log('Telegram WebApp initData:', tg.initData);
      
      // First store in sessionStorage (works immediately)
      sessionStorage.setItem('telegram_init_data', tg.initData);
      console.log('Stored initData in sessionStorage');

      // Then try setting cookie with different options
      const cookieOptions = [
        `telegram_init_data=${encodeURIComponent(tg.initData)}; path=/`,
        `telegram_init_data=${encodeURIComponent(tg.initData)}; path=/; SameSite=None; Secure`,
        `telegram_init_data=${encodeURIComponent(tg.initData)}; path=/; domain=${window.location.hostname}`
      ];

      cookieOptions.forEach(opt => {
        document.cookie = opt;
        console.log('Attempted setting cookie:', opt);
      });

      // Verify what cookies were actually set
      console.log('Actual cookies after setting:', document.cookie);

      // Pass initData via query param as immediate fallback
      const url = new URL(window.location.href);
      url.searchParams.set('telegram_init_data', tg.initData);
      window.history.replaceState(null, '', url.toString());
      console.log('Added initData to URL query params');
    }

    console.log('Initializing Telegram WebApp handler');

    // Immediate check if WebApp is already initialized
    if (window.Telegram?.WebApp?.initData) {
      console.log('Telegram WebApp already initialized');
      handleTelegramAuth();
    }

    // Set up event listener for when WebApp is ready
    const tg = window.Telegram?.WebApp;
    if (tg) {
      console.log('Setting up Telegram WebApp ready handler');
      tg.ready();
      tg.onEvent('ready', () => {
        console.log('Telegram WebApp ready event received');
        handleTelegramAuth();
      });
    }

    return () => {
      window.Telegram?.WebApp?.offEvent('ready', handleTelegramAuth);
    };
  }, [router]);

  return (
    <>
      <Script 
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log('Telegram WebApp script loaded');
          if (window.Telegram?.WebApp?.initData) {
            console.log('InitData available immediately after load');
            const tg = window.Telegram.WebApp;
            document.cookie = `telegram_init_data=${encodeURIComponent(tg.initData)}; path=/; max-age=86400`;
          }
        }}
      />
      <Script
        id="telegram-init-check"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            if (window.Telegram?.WebApp?.initData) {
              console.log('Telegram WebApp initialized on page load');
              document.cookie = 'telegram_init_data=' + 
                encodeURIComponent(window.Telegram.WebApp.initData) + 
                '; path=/; max-age=86400';
            }
          `
        }}
      />
    </>
  );
}
