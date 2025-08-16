import kLogoPath from "@assets/Hubspot Scheduler Logo Image (1)_1751563530272.png";

interface KoncurrentLogoProps {
  className?: string;
  size?: number;
}

export function KoncurrentLogo({ className = "", size = 48 }: KoncurrentLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={kLogoPath} 
        alt="Koncurent Logo" 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '8px',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}

interface FormHeaderProps {
  title: string;
  subtitle: string;
  showLogo?: boolean;
}

export function FormHeader({ title, subtitle, showLogo = true }: FormHeaderProps) {
  return (
    <div className="text-center mb-4">
      {showLogo && (
        <div className="mb-2">
          <KoncurrentLogo size={80} className="mx-auto" />
        </div>
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">{subtitle}</p>
    </div>
  );
}