import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const signUpSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  phone: z.string()
    .trim()
    .regex(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, 'Invalid phone number format'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

const signInSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(1, 'Password is required'),
});

type AuthView = 'login' | 'signup' | 'forgot-password' | 'otp-request' | 'otp-verify';

export default function Auth() {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (user && !loading) {
        const { data: barber } = await supabase
          .from('barbers')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (barber) {
          navigate('/salon-dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    };
    checkUserAndRedirect();
  }, [user, loading, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'Email Sent',
          description: 'Check your inbox for the password reset link.',
        });
        setAuthView('login');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'OTP Sent',
          description: 'Check your email for the verification code.',
        });
        setAuthView('otp-verify');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: 'email',
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'Success',
          description: 'You have been signed in successfully.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (authView === 'login') {
        const validatedData = signInSchema.parse({ email, password });
        await signIn(validatedData.email, validatedData.password);
      } else if (authView === 'signup') {
        const validatedData = signUpSchema.parse({ fullName, phone, email, password });
        await signUp(
          validatedData.email,
          validatedData.password,
          validatedData.fullName,
          validatedData.phone
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);

        const firstError = error.errors[0];
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: firstError.message,
        });
      }
    }
  };

  // ... keep existing state and logic ...

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9E2A2B] mx-auto"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0B0B0B] to-[#121212] px-6">
      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in duration-500">

        {/* 1. Brand Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Make My<br />Cut
          </h1>
          <p className="text-white text-base font-bold tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
            Your Style. Your Time.
          </p>
        </div>

        {/* Login View */}
        {authView === 'login' && (
          <div className="w-full space-y-6">

            {/* 2. Primary Auth Action - Google */}
            <Button
              type="button"
              className="w-full h-14 rounded-2xl bg-[#E5E5E5] hover:bg-white text-black font-semibold text-base flex items-center justify-center gap-3 transition-colors"
              onClick={signInWithGoogle}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            {/* 3. Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#1F1F1F]"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-[#505050] font-medium tracking-widest">OR</span>
              <div className="flex-grow border-t border-[#1F1F1F]"></div>
            </div>

            {/* 4. Email + Password Fields */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[#A0A0A0] font-normal">Email</Label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  required
                  placeholder="name@example.com"
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#9E2A2B] transition-colors"
                />
                {errors.email && <p className="text-xs text-[#9E2A2B] mt-1">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-[#A0A0A0] font-normal">Password</Label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  required
                  placeholder="••••••••"
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#9E2A2B] transition-colors"
                />
                {errors.password && <p className="text-xs text-[#9E2A2B] mt-1">{errors.password}</p>}
              </div>

              {/* 5. Primary CTA Button */}
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-[#9E2A2B] hover:bg-[#B02A2A] text-white font-semibold text-lg shadow-[0_4px_14px_0_rgba(158,42,43,0.39)] transition-all mt-4"
              >
                Step Inside
              </Button>
            </form>

            <div className="flex flex-col items-center gap-4 mt-6">
              <button
                type="button"
                onClick={() => setAuthView('forgot-password')}
                className="text-sm text-[#A0A0A0] hover:text-white transition-colors"
              >
                Forgot password?
              </button>

              {/* 6. Secondary Action */}
              <button
                type="button"
                onClick={() => setAuthView('signup')}
                className="text-sm text-[#A0A0A0] hover:text-white transition-colors"
              >
                Don't have an account? <span className="text-white underline decoration-[#9E2A2B]/50 hover:decoration-[#9E2A2B]">Sign up</span>
              </button>
            </div>
          </div>
        )}

        {/* Signup View - Adapted slightly to match theme but kept functional */}
        {authView === 'signup' && (
          <div className="w-full space-y-6">
            <h2 className="text-xl text-white font-medium text-center mb-6">Create Account</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-[#A0A0A0]">Full Name</Label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white outline-none focus:border-[#9E2A2B]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-[#A0A0A0]">Phone</Label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white outline-none focus:border-[#9E2A2B]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signupEmail" className="text-[#A0A0A0]">Email</Label>
                <input
                  id="signupEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white outline-none focus:border-[#9E2A2B]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signupPassword" className="text-[#A0A0A0]">Password</Label>
                <input
                  id="signupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white outline-none focus:border-[#9E2A2B]"
                />
                {!errors.password && <p className="text-xs text-gray-500">Min 8 chars, uppercase, lowercase, number</p>}
              </div>

              <Button type="submit" className="w-full h-14 rounded-2xl bg-[#9E2A2B] hover:bg-[#B02A2A] text-white font-bold mt-4">
                Sign Up
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setAuthView('login')}
              className="text-sm text-[#A0A0A0] hover:text-white transition-colors mt-6 w-full"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}

        {/* Other views (Forgot Password / OTP) adapted similarly */}
        {(authView === 'forgot-password' || authView === 'otp-request' || authView === 'otp-verify') && (
          <div className="w-full space-y-6">
            <h2 className="text-xl text-white font-medium text-center mb-6">
              {authView === 'forgot-password' ? 'Reset Password' : 'One-Time Password'}
            </h2>
            {/* Reuse form logic from original but styled */}
            {/* ... keeping it simple for now as requested focuses on Login ... */}
            {/* Re-implementing the specific form view currently active */}
            {authView === 'forgot-password' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email address"
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white outline-none focus:border-[#9E2A2B]"
                />
                <Button type="submit" className="w-full h-12 rounded-xl bg-[#9E2A2B] text-white">Send Reset Link</Button>
                <button type="button" onClick={() => setAuthView('login')} className="w-full text-sm text-[#A0A0A0] mt-4">Back to Sign In</button>
              </form>
            )}
            {authView === 'otp-request' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email address"
                  className="w-full bg-transparent border-b border-[#333333] py-2 text-white outline-none focus:border-[#9E2A2B]"
                />
                <Button type="submit" className="w-full h-12 rounded-xl bg-[#9E2A2B] text-white">Send OTP</Button>
                <button type="button" onClick={() => setAuthView('login')} className="w-full text-sm text-[#A0A0A0] mt-4">Back to Sign In</button>
              </form>
            )}
            {authView === 'otp-verify' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} className="border-gray-600 text-white" />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl bg-[#9E2A2B] text-white">Verify & Sign In</Button>
                <button type="button" onClick={() => setAuthView('login')} className="w-full text-sm text-[#A0A0A0] mt-4">Back to Sign In</button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}