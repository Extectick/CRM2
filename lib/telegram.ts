import crypto from 'crypto';

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
export function validateTelegramData(initData: string, botToken?: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.error('No hash provided in initData');
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

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Generate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey.toString('hex'))
      .update(params)
      .digest('hex');

    if (calculatedHash !== hash) {
      console.error('Hash validation failed');
      return null;
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      console.error('No user data provided');
      return null;
    }

    const user = JSON.parse(userParam);
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
