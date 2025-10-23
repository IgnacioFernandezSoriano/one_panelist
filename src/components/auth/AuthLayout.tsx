import { ReactNode } from "react";
import { Package } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-glow items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-8">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            ONE Postal Quality
          </h1>
          <p className="text-lg text-white/90">
            Sistema integral de gestión de calidad postal
          </p>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">ONE Postal Quality</h1>
          </div>
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
