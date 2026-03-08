import { useSocket } from '../context/SocketContext';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionIndicator({ showLabel = false, size = 'small' }) {
  const { isConnected, connectionError } = useSocket();
  const { t } = useTranslation();
  
  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
  };
  
  const iconSizes = {
    small: 12,
    medium: 16,
    large: 20,
  };

  return (
    <div 
      className="flex items-center gap-2" 
      title={isConnected ? t('common.realTimeConnected') : connectionError || t('common.disconnected')}
    >
      {/* Pulsing dot indicator */}
      <div className="relative">
        <span 
          className={`block rounded-full ${sizeClasses[size]} ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        {isConnected && (
          <span 
            className={`absolute inset-0 rounded-full ${sizeClasses[size]} bg-green-500 animate-ping opacity-75`}
          />
        )}
      </div>
      
      {/* Optional icon */}
      {showLabel && (
        <>
          {isConnected ? (
            <Wifi 
              size={iconSizes[size]} 
              className="text-green-500" 
            />
          ) : (
            <WifiOff 
              size={iconSizes[size]} 
              className="text-red-500" 
            />
          )}
          <span 
            className={`text-xs font-medium ${
              isConnected ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {isConnected ? t('common.realTime') : t('common.offline')}
          </span>
        </>
      )}
    </div>
  );
}
