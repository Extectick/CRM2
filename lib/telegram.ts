// Using Web Crypto API for Edge compatibility
const encoder = new TextEncoder();

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitData {
  user: TelegramUser;
  chat_instance?: string;
  chat_type?: string;
  auth_date: number;
  hash: string;
}

/**
 * Validates Telegram WebApp initData
 */
export async function validateTelegramData(initData: string, botToken?: string): Promise<TelegramInitData | null> {
  try {
    if (!initData || initData.trim() === '') {
      console.error('Empty initData provided');
      return null;
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.error('No hash provided in initData:', initData.slice(0, 100));
      return null;
    }

    // For development, we'll skip validation if no bot token is provided
    if (!botToken && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Skipping Telegram validation in development mode');
      
      const userParam = urlParams.get('user');
      if (!userParam) {
        // Return mock data for development
        return {
          user: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
          },
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'development-hash'
        };
      }
      
      try {
        const user = JSON.parse(userParam);
        return {
          user,
          auth_date: parseInt(urlParams.get('auth_date') || '0'),
          hash
        };
      } catch (e) {
        console.error('Failed to parse user data:', e);
        return null;
      }
    }

    if (!botToken) {
      console.error('Bot token is required for production validation');
      return null;
    }

    // Create data-check-string
    const params = Array.from(urlParams.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // console.log('Validating with params:', params);
    // console.log('Using bot token:', botToken?.slice(0, 4) + '...');

    // Create secret key using Telegram's algorithm:
    // 1. Create HMAC-SHA256 of 'WebAppData' with botToken
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const tokenKey = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      encoder.encode(botToken)
    );

    // 2. Create HMAC-SHA256 of data-check-string with derived key
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(tokenKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      encoder.encode(params)
    );

    // console.log('Generated signature length:', signature.byteLength);

    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(signature));
    const calculatedHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // console.log('Calculated hash:', calculatedHex);
    // console.log('Expected hash:', hash);

    if (calculatedHex !== hash) {
      console.error('Hash validation failed - mismatch');
      console.error('Expected:', hash);
      console.error('Actual:', calculatedHex);
      return null;
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      console.error('No user data in initData');
      return null;
    }

    let user;
    try {
      user = JSON.parse(userParam);
    } catch (e) {
      console.error('Failed to parse user data:', e);
      return null;
    }
    const authDate = parseInt(urlParams.get('auth_date') || '0');

    // Check if data is not older than 24 hours
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authDate > 86400) {
      console.error('Data is too old');
      return null;
    }

    return {
      user,
      auth_date: authDate,
      hash
    };
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return null;
  }
}

/**
 * Gets full name from Telegram user
 */
export function getTelegramUserFullName(user: TelegramUser): string {
  return `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
}
