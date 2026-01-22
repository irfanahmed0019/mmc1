import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
    const { role, loading, error } = useUserRole();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && !authLoading) {
            if (!user) {
                // Not authenticated, redirect to auth (unless already there, which shouldn't happen if guarded)
                navigate('/auth');
                return;
            }

            if (role === null) {
                // Authenticated but no role found (rare case: no profile)
                return; // Render will show error
            }

            // Role-based routing logic
            if (allowedRoles && !allowedRoles.includes(role)) {
                // User has a role, but not authorized for this route
                if (role === 'salon_owner') {
                    // Prevent salon owner from accessing customer pages if restricted, 
                    // but traditionally dashboard is their home.
                    // If they try to access root '/', redirect to dashboard.
                    // However, RoleGuard wraps specific pages.

                    // If this component is used as a wrapper for valid pages, we check permissions.
                    navigate('/salon-dashboard');
                } else {
                    navigate('/');
                }
            }
        }
    }, [user, role, loading, authLoading, navigate, allowedRoles, location.pathname]);

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9E2A2B] mx-auto"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
                <h1 className="text-xl font-bold mb-2">Error Loading Profile</h1>
                <p className="text-gray-400">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#9E2A2B] rounded">Retry</button>
            </div>
        );
    }

    if (role === null) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
                <h1 className="text-xl font-bold mb-2">Access Denied</h1>
                <p className="text-gray-400">Your account does not have a valid role associated with it.</p>
                <p className="text-sm text-gray-500 mt-2">Please contact support.</p>
            </div>
        );
    }

    return <>{children}</>;
};
