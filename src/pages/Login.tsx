import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import logoImpulse from '@/assets/logo-impulse.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { login, isAuthenticated, isProfileLoaded } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && isProfileLoaded) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isProfileLoaded, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await login(email, password);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  const formatPower = (kwp: number) => {
    if (kwp >= 1000) {
      return `${(kwp / 1000).toFixed(1)} MW`;
    }
    return `${kwp.toFixed(1)} kWp`;
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Loading overlay with smooth fade out */}
      <div 
        className={`fixed inset-0 z-50 gradient-impulse flex items-center justify-center transition-all duration-700 ease-out ${
          isPageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center gap-6">
          <Sun className="w-16 h-16 text-impulse-gold animate-spin" style={{ animationDuration: '3s' }} />
          <div className="w-48 h-1 bg-impulse-dark/30 rounded-full overflow-hidden">
            <div className="h-full bg-impulse-gold rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-impulse relative overflow-hidden">
        {/* Decorative elements with smooth animations */}
        <div 
          className={`absolute top-20 left-20 w-72 h-72 bg-impulse-gold/10 rounded-full blur-3xl transition-all duration-1000 ease-out ${
            !isPageLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`} 
          style={{ transitionDelay: '200ms' }}
        />
        <div 
          className={`absolute bottom-20 right-20 w-96 h-96 bg-impulse-gold/5 rounded-full blur-3xl transition-all duration-1000 ease-out ${
            !isPageLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}
          style={{ transitionDelay: '400ms' }}
        />
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          {/* Sun icon with smooth entrance */}
          <div 
            className={`mb-8 transition-all duration-700 ease-out ${
              !isPageLoading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <Sun className="w-24 h-24 text-impulse-gold animate-float" />
          </div>
          
          {/* Logo with progressive reveal effect */}
          <div 
            className={`relative mb-8 transition-all duration-1000 ease-out ${
              !isPageLoading ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
            style={{ transitionDelay: '500ms' }}
          >
            <img
              src={logoImpulse}
              alt="Impulse Soluções em Energia"
              className={`w-80 transition-all duration-700 ${
                imageLoaded ? 'blur-0 opacity-100' : 'blur-sm opacity-70'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
            {/* Shimmer effect overlay during load */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-impulse-gold/20 to-transparent animate-pulse" />
            )}
          </div>
          
          {/* Description with smooth fade in */}
          <p 
            className={`text-primary-foreground/80 text-center text-lg max-w-md transition-all duration-700 ease-out ${
              !isPageLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '700ms' }}
          >
            Gerencie seus projetos de energia solar com eficiência e
            profissionalismo
          </p>
          
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div 
          className={`w-full max-w-md transition-all duration-700 ease-out ${
            !isPageLoading ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="gradient-impulse p-6 rounded-2xl shadow-lg">
              <img 
                src={logoImpulse} 
                alt="Impulse" 
                className={`h-12 transition-all duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-70'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">Bem-vindo</h1>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div 
              className={`space-y-2 transition-all duration-500 ease-out ${
                !isPageLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '500ms' }}
            >
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                E-mail
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors duration-300 group-focus-within:text-impulse-gold" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-impulse-gold focus:border-transparent transition-all duration-300 hover:border-impulse-gold/50"
                />
              </div>
            </div>

            <div 
              className={`space-y-2 transition-all duration-500 ease-out ${
                !isPageLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '600ms' }}
            >
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Senha
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors duration-300 group-focus-within:text-impulse-gold" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-muted rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-impulse-gold focus:border-transparent transition-all duration-300 hover:border-impulse-gold/50"
                />
              </div>
            </div>

            <div 
              className={`flex items-center transition-all duration-500 ease-out ${
                !isPageLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '700ms' }}
            >
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-impulse-gold focus:ring-impulse-gold transition-transform duration-200 group-hover:scale-110"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                  Lembrar de mim
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 gradient-gold text-impulse-dark font-semibold rounded-xl hover:shadow-gold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ${
                !isPageLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '800ms' }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p 
            className={`text-center text-sm text-muted-foreground mt-8 transition-all duration-500 ease-out ${
              !isPageLoading ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '900ms' }}
          >
            © 2024 Impulse Soluções em Energia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
