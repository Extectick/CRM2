import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorMessage({ 
  title = 'Произошла ошибка',
  message, 
  onRetry,
  retryText = 'Попробовать снова'
}: ErrorMessageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryText}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}